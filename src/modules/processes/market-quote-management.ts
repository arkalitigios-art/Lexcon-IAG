import { randomUUID } from 'node:crypto';
import { getSqlite } from '../../platform/database/client';
import type { CurrentUser } from '../../platform/auth/current-user';
import type { StoredFile } from '../../platform/storage/local-storage';
import { canAccessProcess, hasCapability } from '../access/authorization';

export function assertCanManageQuotes(user: CurrentUser, processId: string): void {
  const process = getSqlite().prepare('SELECT institution_id AS institutionId, phase FROM processes WHERE id = ?').get(processId) as { institutionId: string; phase: string } | undefined;
  if (!process || !hasCapability({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, 'PROCESS_OPEN') || !canAccessProcess({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, processId, process.institutionId)) throw new Error('No tienes autorización para modificar las cotizaciones de este expediente.');
  if (process.phase !== 'MARKET') throw new Error('Las cotizaciones solo se pueden modificar antes de aprobar el estudio de mercado.');
}

export function addMarketQuotes(user: CurrentUser, processId: string, files: StoredFile[]): void {
  assertCanManageQuotes(user, processId);
  if (!files.length) throw new Error('Debes seleccionar al menos una cotización.');
  const db = getSqlite(); const now = new Date().toISOString();
  db.transaction(() => {
    for (const file of files) {
      const documentId = randomUUID(); const versionId = randomUUID(); const quoteId = randomUUID();
      db.prepare('INSERT INTO documents (id, process_id, kind, created_at) VALUES (?, ?, ?, ?)').run(documentId, processId, 'MARKET_QUOTATION', now);
      db.prepare('INSERT INTO document_versions (id, document_id, version_number, author_user_id, origin, created_at) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, documentId, user.id, 'INSTITUTION_UPLOAD', now);
      db.prepare('INSERT INTO files (id, document_version_id, storage_key, original_name, mime_type, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), versionId, file.key, file.originalName, file.mimeType, file.sizeBytes, file.sha256, now);
      db.prepare('INSERT INTO market_quotes (id, process_id, document_version_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(quoteId, processId, versionId, 'RECEIVED', now);
    }
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, user.id, 'MARKET_QUOTATIONS_ADDED', 'process', processId, now);
  })();
}

export function removeMarketQuote(user: CurrentUser, processId: string, quoteId: string): { storageKey: string; originalName: string } {
  assertCanManageQuotes(user, processId);
  const db = getSqlite();
  const quote = db.prepare(`SELECT q.document_version_id AS versionId, d.id AS documentId, f.storage_key AS storageKey, f.original_name AS originalName
    FROM market_quotes q JOIN document_versions dv ON dv.id = q.document_version_id JOIN documents d ON d.id = dv.document_id JOIN files f ON f.document_version_id = dv.id
    WHERE q.id = ? AND q.process_id = ?`).get(quoteId, processId) as { versionId: string; documentId: string; storageKey: string; originalName: string } | undefined;
  if (!quote) throw new Error('La cotización indicada no existe en este expediente.');
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('DELETE FROM document_extractions WHERE document_version_id = ?').run(quote.versionId);
    db.prepare('DELETE FROM market_quote_items WHERE quote_id = ?').run(quoteId);
    db.prepare('DELETE FROM market_quotes WHERE id = ?').run(quoteId);
    db.prepare('DELETE FROM version_actions WHERE document_version_id = ?').run(quote.versionId);
    db.prepare('DELETE FROM files WHERE document_version_id = ?').run(quote.versionId);
    db.prepare('DELETE FROM document_versions WHERE id = ?').run(quote.versionId);
    db.prepare('DELETE FROM documents WHERE id = ?').run(quote.documentId);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, user.id, 'MARKET_QUOTATION_REMOVED', 'market_quote', quoteId, now);
  })();
  return { storageKey: quote.storageKey, originalName: quote.originalName };
}
