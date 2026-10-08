import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { createPrecontractualDraftDocx } from '@/modules/automation/precontractual-draft-docx';
import { loadPrecontractualDocumentContext } from '@/modules/automation/precontractual-context';

const downloadableDrafts = {
  PRELIMINARY_STUDY: 'Estudio_previo_o_de_conveniencia.docx',
  PUBLIC_INVITATION: 'Invitacion_publica.docx',
} as const;

export const runtime = 'nodejs';

export async function GET(_request: Request, routeContext: { params: Promise<{ processId: string; draftKind: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (user.role !== 'ARKA_ATTORNEY' && user.role !== 'IE_RECTOR') return NextResponse.json({ error: 'Solo el abogado asignado o Rectoría pueden descargar los documentos precontractuales.' }, { status: 403 });
  const { processId, draftKind } = await routeContext.params;
  if (!(draftKind in downloadableDrafts)) return NextResponse.json({ error: 'El tipo de documento solicitado no es descargable.' }, { status: 404 });
  const process = getProcessDetailFor(user, processId);
  if (!process) return NextResponse.json({ error: 'No tienes acceso a este expediente.' }, { status: 403 });
  const draft = process.drafts.find((candidate) => candidate.kind === draftKind);
  if (!draft) return NextResponse.json({ error: 'El documento solicitado no está disponible.' }, { status: 404 });
  if (user.role === 'IE_RECTOR' && draft.status !== 'APPROVED') return NextResponse.json({ error: 'Rectoría podrá descargar este documento cuando la revisión precontractual haya sido aprobada.' }, { status: 403 });
  const context = await loadPrecontractualDocumentContext(process.id, draft.createdAt);
  const document = await createPrecontractualDraftDocx(process, draftKind as keyof typeof downloadableDrafts, context);
  const body = document.buffer.slice(document.byteOffset, document.byteOffset + document.byteLength) as ArrayBuffer;
  const filename = downloadableDrafts[draftKind as keyof typeof downloadableDrafts];
  return new NextResponse(body, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, 'Cache-Control': 'private, no-store' } });
}
