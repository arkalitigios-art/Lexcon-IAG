import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { contractFilename, createAcceptanceCommunicationDocx, createContractDocx, createLiquidationActDocx, createSelectionActDocx, createStartActDocx } from '@/modules/automation/selection-and-contractual-docx';
import { getSqlite } from '@/platform/database/client';
import { LocalPrivateStorage } from '@/platform/storage/local-storage';

const documents = {
  SELECTION_ACT: { filename: 'Acta_de_seleccion_de_oferente.docx', create: createSelectionActDocx, available: (phase: string, signed: boolean) => phase === 'DECISION' && !signed },
  ACCEPTANCE_COMMUNICATION: { filename: 'Comunicacion_de_aceptacion_de_oferta.docx', create: createAcceptanceCommunicationDocx, available: (phase: string, signed: boolean) => ['FORMALIZATION', 'CONTRACTUAL_PUBLICATION', 'EXECUTION', 'POSTCONTRACTUAL', 'CLOSED'].includes(phase) && signed },
  CONTRACT: { filename: contractFilename, create: createContractDocx, available: (phase: string, signed: boolean) => ['CONTRACTUAL_REVIEW', 'CONTRACTUAL_PUBLICATION', 'EXECUTION', 'POSTCONTRACTUAL', 'CLOSED'].includes(phase) && signed },
  START_ACT: { filename: 'Acta_de_inicio.docx', create: createStartActDocx, available: (phase: string, signed: boolean) => ['CONTRACTUAL_REVIEW', 'CONTRACTUAL_PUBLICATION', 'EXECUTION', 'POSTCONTRACTUAL', 'CLOSED'].includes(phase) && signed },
  LIQUIDATION_ACT: { filename: 'Acta_de_liquidacion_del_contrato.docx', create: createLiquidationActDocx, available: (phase: string, signed: boolean) => ['LIQUIDATION_REVIEW', 'POSTCONTRACTUAL', 'CLOSED'].includes(phase) && signed },
} as const;

function correctedLegalVersion(processId: string, kind: string) {
  const documentKind = kind === 'CONTRACT' ? 'CONTRACT_LEGAL_REVISED' : kind === 'START_ACT' ? 'START_ACT_LEGAL_REVISED' : kind === 'LIQUIDATION_ACT' ? 'LIQUIDATION_LEGAL_REVISED' : null;
  if (!documentKind) return null;
  return getSqlite().prepare(`SELECT f.storage_key AS storageKey, f.original_name AS originalName
    FROM documents d
    JOIN document_versions dv ON dv.document_id = d.id
    JOIN files f ON f.document_version_id = dv.id
    WHERE d.process_id = ? AND d.kind = ?
    ORDER BY dv.created_at DESC
    LIMIT 1`).get(processId, documentKind) as { storageKey: string; originalName: string } | undefined;
}

export async function GET(_request: Request, context: { params: Promise<{ processId: string; kind: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { processId, kind } = await context.params;
  const document = documents[kind as keyof typeof documents];
  if (!document) return NextResponse.json({ error: 'Documento no reconocido.' }, { status: 404 });
  const process = getProcessDetailFor(user, processId);
  if (!process || !process.selectionDecision || !document.available(process.phase, process.selectionDecision.status === 'SIGNED_UPLOADED')) return NextResponse.json({ error: 'El documento no está disponible para este expediente.' }, { status: 404 });
  const contractualReview = user.role === 'ARKA_ATTORNEY' && process.phase === 'CONTRACTUAL_REVIEW' && (kind === 'CONTRACT' || kind === 'START_ACT');
  const liquidationReview = user.role === 'ARKA_ATTORNEY' && process.phase === 'LIQUIDATION_REVIEW' && kind === 'LIQUIDATION_ACT';
  const institutionalDownload = ['IE_RECTOR', 'IE_SUPPORT'].includes(user.role) && ['CONTRACTUAL_PUBLICATION', 'EXECUTION', 'POSTCONTRACTUAL', 'CLOSED'].includes(process.phase);
  if (!contractualReview && !liquidationReview && !institutionalDownload) return NextResponse.json({ error: 'El documento no está disponible para este rol o fase.' }, { status: 404 });
  const revision = correctedLegalVersion(processId, kind);
  const bytes = revision ? await new LocalPrivateStorage().read(revision.storageKey) : await document.create(process);
  const filename = revision?.originalName ?? (typeof document.filename === 'function' ? document.filename(process) : document.filename);
  return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
}
