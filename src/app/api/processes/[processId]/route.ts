import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { getProcessDetailFor } from '@/modules/processes/process-queries';

export async function GET(_: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { processId } = await context.params;
  const process = getProcessDetailFor(user, processId);
  if (!process) return NextResponse.json({ error: 'No tienes acceso a este expediente.' }, { status: 404 });
  return NextResponse.json({ process });
}
