import { NextResponse } from 'next/server';
import { createClosureDeclarationDocx } from '@/modules/automation/closure-declaration-docx';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { currentUser } from '@/platform/auth/current-user';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (!['IE_RECTOR', 'IE_SUPPORT'].includes(user.role)) return NextResponse.json({ error: 'Solo un usuario institucional del expediente puede descargar el acta de cierre.' }, { status: 403 });
  const { processId } = await context.params;
  const process = getProcessDetailFor(user, processId);
  if (!process || process.phase !== 'CLOSED' || !process.actions.some((action) => action.action === 'EVALUATION_NO_SELECTION_RECORDED')) return NextResponse.json({ error: 'El acta de cierre no está disponible para este expediente.' }, { status: 404 });
  const document = await createClosureDeclarationDocx(process);
  const body = document.buffer.slice(document.byteOffset, document.byteOffset + document.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('Acta_de_cierre_y_declaratoria_de_desierto.docx')}`, 'Cache-Control': 'private, no-store' } });
}
