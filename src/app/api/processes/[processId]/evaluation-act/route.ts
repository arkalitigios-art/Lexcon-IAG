import { NextResponse } from 'next/server';
import { createEvaluationActDocx } from '@/modules/automation/evaluation-act-docx';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { currentUser } from '@/platform/auth/current-user';

export const runtime = 'nodejs';

export async function GET(_request: Request, routeContext: { params: Promise<{ processId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (!['IE_RECTOR', 'IE_SUPPORT', 'IE_COMMITTEE'].includes(user.role)) return NextResponse.json({ error: 'Solo un usuario institucional del expediente puede descargar el acta de evaluación.' }, { status: 403 });
  const { processId } = await routeContext.params;
  const process = getProcessDetailFor(user, processId);
  if (!process) return NextResponse.json({ error: 'No tienes acceso a este expediente.' }, { status: 403 });
  if (!['EVALUATION', 'DECISION', 'CLOSURE', 'CLOSED'].includes(process.phase)) return NextResponse.json({ error: 'El acta de evaluación todavía no está disponible para este expediente.' }, { status: 404 });
  const document = await createEvaluationActDocx(process);
  const definitive = process.actions.some((action) => action.action === 'EVALUATION_APPROVED');
  const body = document.buffer.slice(document.byteOffset, document.byteOffset + document.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(definitive ? 'Acta_definitiva_de_evaluacion_de_ofertas.docx' : 'Acta_de_evaluacion_de_ofertas.docx')}`,
    'Cache-Control': 'private, no-store',
  } });
}
