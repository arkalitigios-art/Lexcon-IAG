import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { LocalPrivateStorage, type StoredFile } from '@/platform/storage/local-storage';
import { openProcess } from '@/modules/processes/open-process';
import { hasCapability } from '@/modules/access/authorization';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { enqueue } from '@/platform/queue/sqlite-queue';
import { processMarketAnalysis } from '@/modules/automation/iag-drafts';

const maximumFilesPerUpload = 20;
const maximumBatchBytes = 100 * 1024 * 1024;

function canOpen(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): boolean {
  return Boolean(user.institutionId && hasCapability({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, 'PROCESS_OPEN'));
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  return NextResponse.json({ user, processes: listProcessesFor(user) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (!canOpen(user)) return NextResponse.json({ error: 'No tienes autorización para abrir expedientes institucionales.' }, { status: 403 });

  const stored: StoredFile[] = [];
  const storage = new LocalPrivateStorage();
  try {
    const form = await request.formData();
    const uploads = form.getAll('quotations').filter((value): value is File => value instanceof File);
    if (uploads.length > maximumFilesPerUpload || uploads.reduce((total, file) => total + file.size, 0) > maximumBatchBytes) throw new Error('La carga supera el límite permitido.');
    for (const file of uploads) {
      stored.push(await storage.save({ name: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }));
    }
    const id = openProcess(user, stored);
    enqueue('MARKET_ANALYSIS', { processId: id }, `market-analysis:${id}`);
    let automation: object = { status: 'QUEUED' };
    try { automation = await processMarketAnalysis(id); } catch { /* the persistent worker keeps the queued analysis for retry */ }
    return NextResponse.json({ id, automation }, { status: 201 });
  } catch (error) {
    await Promise.allSettled(stored.map((file) => storage.remove(file.key)));
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible abrir el expediente.' }, { status: 400 });
  }
}
