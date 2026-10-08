import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { createMarketStudyDocx } from '@/modules/automation/market-study-docx';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (user.role !== 'ARKA_ATTORNEY') return NextResponse.json({ error: 'Solo el abogado asignado puede descargar el estudio de mercado.' }, { status: 403 });
  const { processId } = await context.params;
  const process = getProcessDetailFor(user, processId);
  if (!process) return NextResponse.json({ error: 'No tienes acceso a este expediente.' }, { status: 403 });
  if (!process.drafts.some((draft) => draft.kind === 'MARKET_STUDY')) return NextResponse.json({ error: 'El expediente aún no tiene un estudio de mercado disponible.' }, { status: 404 });
  const document = await createMarketStudyDocx(process);
  const body = document.buffer.slice(document.byteOffset, document.byteOffset + document.byteLength) as ArrayBuffer;
  return new NextResponse(body, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('Estudio_de_mercado.docx')}`, 'Cache-Control': 'private, no-store' } });
}
