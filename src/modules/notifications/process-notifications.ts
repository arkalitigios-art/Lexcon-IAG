import { randomUUID } from 'node:crypto';
import * as webpush from 'web-push';
import { getSqlite } from '@/platform/database/client';
import { enqueue } from '@/platform/queue/sqlite-queue';

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

type Recipient = { id: string; email: string };

export function pushConfiguration() {
  const publicKey = process.env.LEXCON_WEB_PUSH_PUBLIC_KEY;
  return { enabled: Boolean(publicKey && process.env.LEXCON_WEB_PUSH_PRIVATE_KEY && process.env.LEXCON_WEB_PUSH_SUBJECT), publicKey: publicKey ?? null };
}

export function hasActivePushSubscription(userId: string): boolean {
  return Boolean(getSqlite().prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND active = 1 LIMIT 1').get(userId));
}

export function savePushSubscription(userId: string, subscription: PushSubscriptionInput, userAgent: string | null): void {
  if (!subscription.endpoint.startsWith('https://') || !subscription.keys?.p256dh || !subscription.keys?.auth) throw new Error('La suscripción push no es válida.');
  const now = new Date().toISOString();
  const existing = getSqlite().prepare('SELECT user_id AS userId, active FROM push_subscriptions WHERE endpoint = ?').get(subscription.endpoint) as { userId: string; active: number } | undefined;
  if (existing?.active && existing.userId !== userId) throw new Error('Este navegador ya está registrado para otro usuario de LEXCON. Use un perfil distinto del navegador o desactive primero las alertas desde la cuenta propietaria.');
  getSqlite().prepare(`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, active = 1, updated_at = excluded.updated_at`)
    .run(randomUUID(), userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent, now, now);
}

export function removePushSubscription(userId: string, endpoint: string): void {
  getSqlite().prepare('UPDATE push_subscriptions SET active = 0, updated_at = ? WHERE user_id = ? AND endpoint = ?').run(new Date().toISOString(), userId, endpoint);
}

function recipientsFor(processId: string, actorUserId: string, nextPhase: string): Recipient[] {
  const db = getSqlite();
  const legalPhase = ['MARKET', 'PRECONTRACTUAL', 'CONTRACTUAL_REVIEW', 'LIQUIDATION_REVIEW'].includes(nextPhase);
  const rows = legalPhase
    ? db.prepare(`SELECT user.id, user.email FROM attorney_assignments assignment JOIN users user ON user.id = assignment.user_id WHERE assignment.process_id = ? AND assignment.active = 1 AND user.active = 1`).all(processId)
    : db.prepare(`SELECT DISTINCT user.id, user.email FROM processes process JOIN memberships membership ON membership.institution_id = process.institution_id AND membership.active = 1 JOIN users user ON user.id = membership.user_id AND user.active = 1 WHERE process.id = ? AND membership.role IN ('IE_RECTOR', 'IE_SUPPORT')`).all(processId);
  return (rows as Recipient[]).filter((recipient) => recipient.id !== actorUserId);
}

export function notifyProcessParticipants(input: { processId: string; actorUserId: string; nextPhase: string; eventKey: string; subject: string; body: string; recipientScope?: 'LEGAL' | 'INSTITUTION' }): void {
  const db = getSqlite(); const now = new Date().toISOString(); const recipients = recipientsFor(input.processId, input.actorUserId, input.recipientScope === 'LEGAL' ? 'LIQUIDATION_REVIEW' : input.recipientScope === 'INSTITUTION' ? 'BUDGET' : input.nextPhase);
  for (const recipient of recipients) {
    const exists = db.prepare('SELECT id FROM notification_deliveries WHERE user_id = ? AND channel = ? AND event_key = ?').get(recipient.id, 'IN_APP', input.eventKey) as { id: string } | undefined;
    if (exists) continue;
    db.transaction(() => {
      db.prepare('INSERT INTO alerts (id, user_id, institution_id, process_id, channel, status, body, created_at) SELECT ?, ?, institution_id, id, ?, ?, ?, ? FROM processes WHERE id = ?').run(randomUUID(), recipient.id, 'IN_APP', 'OPEN', input.body, now, input.processId);
      db.prepare('INSERT INTO notification_deliveries (id, process_id, user_id, channel, event_key, status, detail, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)').run(randomUUID(), input.processId, recipient.id, 'IN_APP', input.eventKey, 'DELIVERED', 'Alerta visible en LEXCON.', now);
      const outboxId = randomUUID();
      db.prepare('INSERT INTO email_outbox (id, process_id, recipient, subject, body, status, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)').run(outboxId, input.processId, recipient.email, input.subject, `${input.body}\n\nIngrese a ${process.env.LEXCON_APP_URL ?? 'http://localhost:3030'}/dashboard para consultar el expediente.`, 'PENDING_DELIVERY', now);
      enqueue('EMAIL_DELIVERY', { outboxId }, `email:${input.eventKey}:${recipient.id}`);
      const subscriptions = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND active = 1').all(recipient.id) as Array<{ id: string }>;
      for (const subscription of subscriptions) {
        const deliveryId = randomUUID();
        db.prepare('INSERT INTO notification_deliveries (id, process_id, user_id, channel, event_key, status, detail, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)').run(deliveryId, input.processId, recipient.id, 'WEB_PUSH', `${input.eventKey}:${subscription.id}`, 'PENDING', now);
        enqueue('WEB_PUSH_DELIVERY', { deliveryId, subscriptionId: subscription.id, title: input.subject, body: input.body, url: `/dashboard/processes/${input.processId}` }, `push:${input.eventKey}:${subscription.id}`);
      }
    })();
  }
}

export async function deliverPushNotification(input: { deliveryId: string; subscriptionId: string; title: string; body: string; url: string }): Promise<{ delivery: string }> {
  const db = getSqlite(); const config = pushConfiguration();
  if (!config.enabled) { db.prepare("UPDATE notification_deliveries SET status = 'PENDING_CONFIGURATION', detail = ? WHERE id = ?").run('Faltan las credenciales VAPID de LEXCON.', input.deliveryId); return { delivery: 'PENDING_CONFIGURATION' }; }
  const subscription = db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE id = ? AND active = 1').get(input.subscriptionId) as { endpoint: string; p256dh: string; auth: string } | undefined;
  if (!subscription) { db.prepare("UPDATE notification_deliveries SET status = 'CANCELLED', detail = ? WHERE id = ?").run('Suscripción desactivada.', input.deliveryId); return { delivery: 'CANCELLED' }; }
  try {
    webpush.setVapidDetails(process.env.LEXCON_WEB_PUSH_SUBJECT!, config.publicKey!, process.env.LEXCON_WEB_PUSH_PRIVATE_KEY!);
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: input.title, body: input.body, url: input.url, tag: input.deliveryId }));
    db.prepare("UPDATE notification_deliveries SET status = 'DELIVERED', delivered_at = ? WHERE id = ?").run(new Date().toISOString(), input.deliveryId); return { delivery: 'DELIVERED' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo entregar la notificación push.';
    db.prepare("UPDATE notification_deliveries SET status = 'FAILED', detail = ? WHERE id = ?").run(message, input.deliveryId);
    if (/404|410/.test(message)) db.prepare('UPDATE push_subscriptions SET active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), input.subscriptionId);
    throw error;
  }
}
