import { randomUUID } from 'node:crypto';
import { getSqlite } from '@/platform/database/client';
import { enqueue } from '@/platform/queue/sqlite-queue';

type OutboxEmail = { id: string; recipient: string; subject: string; body: string };

export function queueApprovedMarketStudyEmail(processId: string): void {
  const db = getSqlite();
  const recipient = db.prepare(`SELECT user.email FROM processes process
    JOIN users user ON user.id = process.created_by_user_id WHERE process.id = ?`).get(processId) as { email: string } | undefined;
  const institution = db.prepare(`SELECT institution.name FROM processes process
    JOIN institutions institution ON institution.id = process.institution_id WHERE process.id = ?`).get(processId) as { name: string } | undefined;
  if (!recipient || !institution) return;
  const existing = db.prepare(`SELECT id FROM email_outbox WHERE process_id = ? AND recipient = ? AND subject = ? LIMIT 1`)
    .get(processId, recipient.email, 'Estudio de mercado aprobado') as { id: string } | undefined;
  if (existing) return;
  const id = randomUUID(); const now = new Date().toISOString();
  const appUrl = process.env.LEXCON_APP_URL ?? 'http://localhost:3015';
  const subject = 'Estudio de mercado aprobado';
  const body = `La Institución Educativa ${institution.name} tiene disponible el estudio de mercado aprobado. Ingrese a ${appUrl}/dashboard para consultar el expediente y continuar con el cargue del CDP.`;
  db.prepare('INSERT INTO email_outbox (id, process_id, recipient, subject, body, status, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)')
    .run(id, processId, recipient.email, subject, body, 'PENDING_DELIVERY', now);
  enqueue('MARKET_STUDY_APPROVAL_EMAIL', { outboxId: id }, `market-study-approval-email:${processId}:${recipient.email}`);
}

export async function deliverQueuedEmail(outboxId: string): Promise<{ delivery: 'DELIVERED' | 'PENDING_CONFIGURATION' }> {
  const db = getSqlite();
  const email = db.prepare('SELECT id, recipient, subject, body FROM email_outbox WHERE id = ?').get(outboxId) as OutboxEmail | undefined;
  if (!email) throw new Error('No se encontró el correo pendiente.');
  const endpoint = process.env.LEXCON_EMAIL_DELIVERY_URL;
  if (!endpoint) {
    db.prepare("UPDATE email_outbox SET status = 'PENDING_CONFIGURATION' WHERE id = ?").run(outboxId);
    return { delivery: 'PENDING_CONFIGURATION' };
  }
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: email.recipient, subject: email.subject, text: email.body }) });
    if (!response.ok) throw new Error(`El servicio de correo respondió ${response.status}.`);
    db.prepare("UPDATE email_outbox SET status = 'DELIVERED', delivered_at = ? WHERE id = ?").run(new Date().toISOString(), outboxId);
    return { delivery: 'DELIVERED' };
  } catch (error) {
    db.prepare("UPDATE email_outbox SET status = 'FAILED' WHERE id = ?").run(outboxId);
    throw error;
  }
}
