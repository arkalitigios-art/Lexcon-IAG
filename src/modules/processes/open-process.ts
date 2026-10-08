import { randomUUID } from 'node:crypto';
import { getSqlite } from '../../platform/database/client';
import type { CurrentUser } from '../../platform/auth/current-user';
import type { StoredFile } from '../../platform/storage/local-storage';
import { hasCapability } from '../access/authorization';

export function openProcess(user: CurrentUser, files: StoredFile[]): string {
  if (!user.institutionId || !hasCapability({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, 'PROCESS_OPEN')) throw new Error('No tienes autorización para abrir expedientes institucionales.');
  if (!files.length) throw new Error('Debes cargar al menos una cotización de mercado.');
  const db = getSqlite(); const processId = randomUUID(); const now = new Date().toISOString();
  const regulation = db.prepare(`SELECT rv.id FROM regulation_versions rv JOIN regulations r ON r.id = rv.regulation_id WHERE r.institution_id = ? AND rv.status = 'ACTIVE' ORDER BY rv.created_at DESC LIMIT 1`).get(user.institutionId) as { id: string } | undefined;
  db.transaction(() => {
    const status = regulation ? 'RECEIVED' : 'BLOCKED_REGULATION';
    const sequence = (db.prepare('SELECT COALESCE(MAX(institution_sequence), 0) + 1 AS value FROM processes WHERE institution_id = ?').get(user.institutionId) as { value: number }).value;
    db.prepare('INSERT INTO processes (id, institution_id, institution_sequence, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(processId, user.institutionId, sequence, regulation?.id ?? null, 'MARKET', status, user.id, now);
    for (const file of files) {
      const documentId = randomUUID(); const versionId = randomUUID();
      db.prepare('INSERT INTO documents (id, process_id, kind, created_at) VALUES (?, ?, ?, ?)').run(documentId, processId, 'MARKET_QUOTATION', now);
      db.prepare('INSERT INTO document_versions (id, document_id, version_number, author_user_id, origin, created_at) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, documentId, user.id, 'INSTITUTION_UPLOAD', now);
      db.prepare('INSERT INTO files (id, document_version_id, storage_key, original_name, mime_type, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), versionId, file.key, file.originalName, file.mimeType, file.sizeBytes, file.sha256, now);
      db.prepare('INSERT INTO market_quotes (id, process_id, document_version_id, status, created_at) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), processId, versionId, 'RECEIVED', now);
    }
    if (!regulation) db.prepare('INSERT INTO workflow_blocks (id, process_id, scope, reason, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), processId, 'MARKET', 'No existe reglamento institucional aplicable.', now);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, user.id, 'PROCESS_OPENED_FROM_QUOTES', 'process', processId, now);
  })(); return processId;
}
