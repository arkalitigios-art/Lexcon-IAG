import { claimNextJob, finishJob } from '../platform/queue/sqlite-queue';
import { migrate } from '../platform/database/migrate';
import { processMarketAnalysis } from '../modules/automation/iag-drafts';
import { deliverQueuedEmail } from '../modules/notifications/market-study-email';
import { deliverPushNotification } from '../modules/notifications/process-notifications';

async function processOne(): Promise<boolean> {
  const job = claimNextJob();
  if (!job) return false;
  try {
    if (job.type === 'MARKET_ANALYSIS') {
      const payload = JSON.parse(job.payload) as { processId?: string };
      if (!payload.processId) throw new Error('El trabajo de estudio de mercado no contiene expediente.');
      finishJob(job.id, { handledAt: new Date().toISOString(), type: job.type, ...(await processMarketAnalysis(payload.processId)) });
    } else if (job.type === 'MARKET_STUDY_APPROVAL_EMAIL' || job.type === 'EMAIL_DELIVERY') {
      const payload = JSON.parse(job.payload) as { outboxId?: string };
      if (!payload.outboxId) throw new Error('El trabajo de correo no contiene una salida pendiente.');
      finishJob(job.id, { handledAt: new Date().toISOString(), type: job.type, ...(await deliverQueuedEmail(payload.outboxId)) });
    } else if (job.type === 'WEB_PUSH_DELIVERY') {
      const payload = JSON.parse(job.payload) as { deliveryId?: string; subscriptionId?: string; title?: string; body?: string; url?: string };
      if (!payload.deliveryId || !payload.subscriptionId || !payload.title || !payload.body || !payload.url) throw new Error('El trabajo push no contiene los datos requeridos.');
      finishJob(job.id, { handledAt: new Date().toISOString(), type: job.type, ...(await deliverPushNotification({ deliveryId: payload.deliveryId, subscriptionId: payload.subscriptionId, title: payload.title, body: payload.body, url: payload.url })) });
    } else {
      finishJob(job.id, { handledAt: new Date().toISOString(), type: job.type });
    }
  } catch (error) {
    finishJob(job.id, { handledAt: new Date().toISOString(), type: job.type, error: error instanceof Error ? error.message : 'Error no identificado.' }, 'FAILED');
  }
  return true;
}

migrate();
void processOne();
if (process.argv.includes('--watch')) setInterval(() => { void processOne(); }, 1000);
