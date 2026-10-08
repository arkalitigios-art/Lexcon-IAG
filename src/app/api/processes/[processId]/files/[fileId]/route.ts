import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { getSqlite } from '@/platform/database/client';
import { getProcessDetailFor } from '@/modules/processes/process-queries';
import { LocalPrivateStorage } from '@/platform/storage/local-storage';

export async function GET(_request: Request, context: { params: Promise<{ processId: string; fileId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const { processId, fileId } = await context.params;
  if (!getProcessDetailFor(user, processId)) return NextResponse.json({ error: 'No tienes acceso a este expediente.' }, { status: 403 });
  const file = getSqlite().prepare(`SELECT f.storage_key AS storageKey, f.original_name AS originalName, f.mime_type AS mimeType
    FROM files f JOIN document_versions dv ON dv.id = f.document_version_id JOIN documents d ON d.id = dv.document_id
    WHERE f.id = ? AND d.process_id = ?`).get(fileId, processId) as { storageKey: string; originalName: string; mimeType: string } | undefined;
  if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
  try {
    const bytes = await new LocalPrivateStorage().read(file.storageKey);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new NextResponse(body, { headers: { 'Content-Type': file.mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`, 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No fue posible abrir el archivo privado.' }, { status: 404 }); }
}
