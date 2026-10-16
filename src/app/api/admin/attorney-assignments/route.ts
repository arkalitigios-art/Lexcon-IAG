import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { esUuid } from '@/platform/uuid';
import { assignAttorneyRemote, listAvailableAttorneys } from '@/modules/assignments/attorney-assignment';
import { listUnassignedProcesses } from '@/modules/processes/process-queries';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'ARKA_ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403, headers: SIN_CACHE });
  return NextResponse.json({ processes: await listUnassignedProcesses(), attorneys: await listAvailableAttorneys() }, { headers: SIN_CACHE });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ARKA_ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'La solicitud no tiene un formato válido.' }, { status: 400 });
  }
  const { processId, attorneyId } = (payload && typeof payload === 'object' ? payload : {}) as { processId?: unknown; attorneyId?: unknown };
  if (!esUuid(processId) || !esUuid(attorneyId)) return NextResponse.json({ error: 'Selecciona un expediente y un abogado válidos.' }, { status: 400 });
  try {
    await assignAttorneyRemote(user, processId, attorneyId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible registrar la asignación.' }, { status: 400 });
  }
}
