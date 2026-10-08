import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { LocalPrivateStorage, type StoredFile } from '@/platform/storage/local-storage';
import { enqueue } from '@/platform/queue/sqlite-queue';
import { processMarketAnalysis } from '@/modules/automation/iag-drafts';
import { addMarketQuotes, assertCanManageQuotes, removeMarketQuote } from '@/modules/processes/market-quote-management';

const maximumFiles = 20;
const maximumBatchBytes = 100 * 1024 * 1024;

async function analyze(processId: string): Promise<void> {
  enqueue('MARKET_ANALYSIS', { processId }, `market-analysis:${processId}`);
  try { await processMarketAnalysis(processId); } catch { /* the persistent worker keeps this analysis available for retry */ }
}

export async function POST(request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const storage = new LocalPrivateStorage(); const stored: StoredFile[] = [];
  try {
    const form = await request.formData(); const uploads = form.getAll('quotations').filter((value): value is File => value instanceof File);
    if (!uploads.length || uploads.length > maximumFiles || uploads.reduce((total, file) => total + file.size, 0) > maximumBatchBytes) throw new Error('Selecciona entre una y veinte cotizaciones dentro del límite permitido.');
    for (const file of uploads) stored.push(await storage.save({ name: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }));
    const { processId } = await context.params; addMarketQuotes(user, processId, stored); await analyze(processId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await Promise.allSettled(stored.map((file) => storage.remove(file.key)));
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible agregar las cotizaciones.' }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  try {
    const quoteId = new URL(request.url).searchParams.get('quoteId'); if (!quoteId) throw new Error('Indica la cotización que deseas eliminar.');
    const { processId } = await context.params; const storage = new LocalPrivateStorage(); const removed = removeMarketQuote(user, processId, quoteId);
    await storage.remove(removed.storageKey); await analyze(processId);
    return NextResponse.json({ ok: true, removed: removed.originalName });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible eliminar la cotización.' }, { status: 400 });
  }
}

export async function PATCH(_: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  try {
    const { processId } = await context.params; assertCanManageQuotes(user, processId); await analyze(processId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible recalcular el estudio de mercado.' }, { status: 400 });
  }
}
