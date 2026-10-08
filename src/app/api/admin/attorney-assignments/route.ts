import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { assignAttorney, listAvailableAttorneys } from '@/modules/assignments/attorney-assignment';
import { listUnassignedProcesses } from '@/modules/processes/process-queries';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'ARKA_ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  return NextResponse.json({ processes: listUnassignedProcesses(), attorneys: listAvailableAttorneys() });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ARKA_ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  try {
    const payload = await request.json() as { processId?: string; attorneyId?: string };
    if (!payload.processId || !payload.attorneyId) throw new Error('Selecciona un expediente y un abogado.');
    assignAttorney(user, payload.processId, payload.attorneyId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible registrar la asignación.' }, { status: 400 });
  }
}
