import { randomUUID } from 'node:crypto';
import { getSqlite } from '@/platform/database/client';
import type { CurrentUser } from '@/platform/auth/current-user';
import type { StoredFile } from '@/platform/storage/local-storage';

export interface InstitutionRegulation { version: number; originalName: string; createdAt: string };

export function getInstitutionRegulation(user: CurrentUser): InstitutionRegulation | null {
  if (!user.institutionId) return null;
  return getSqlite().prepare(`SELECT rv.version_number AS version, rf.original_name AS originalName, rv.created_at AS createdAt FROM regulations r JOIN regulation_versions rv ON rv.regulation_id = r.id AND rv.status = 'ACTIVE' JOIN regulation_files rf ON rf.regulation_version_id = rv.id WHERE r.institution_id = ? ORDER BY rv.version_number DESC LIMIT 1`).get(user.institutionId) as InstitutionRegulation | undefined ?? null;
}

export function registerInstitutionRegulation(user: CurrentUser, file: StoredFile): void {
  if (!user.institutionId || !['IE_RECTOR', 'IE_SUPPORT'].includes(user.role)) throw new Error('No tienes autorización para registrar el reglamento institucional.');
  const db = getSqlite(); const now = new Date().toISOString();
  db.transaction(() => {
    let regulation = db.prepare('SELECT id FROM regulations WHERE institution_id = ?').get(user.institutionId) as { id: string } | undefined;
    if (!regulation) { regulation = { id: randomUUID() }; db.prepare('INSERT INTO regulations (id, institution_id, created_at) VALUES (?, ?, ?)').run(regulation.id, user.institutionId, now); }
    const version = (db.prepare('SELECT COALESCE(MAX(version_number), 0) AS value FROM regulation_versions WHERE regulation_id = ?').get(regulation.id) as { value: number }).value + 1;
    db.prepare("UPDATE regulation_versions SET status = 'SUPERSEDED' WHERE regulation_id = ? AND status = 'ACTIVE'").run(regulation.id);
    const versionId = randomUUID();
    db.prepare('INSERT INTO regulation_versions (id, regulation_id, version_number, source_document_version_id, status, created_at) VALUES (?, ?, ?, NULL, ?, ?)').run(versionId, regulation.id, version, 'ACTIVE', now);
    db.prepare('INSERT INTO regulation_files (id, regulation_version_id, storage_key, original_name, mime_type, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), versionId, file.key, file.originalName, file.mimeType, file.sizeBytes, file.sha256, now);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)').run(randomUUID(), user.id, 'REGULATION_VERSION_REGISTERED', 'regulation_version', versionId, now);
  })();
}
