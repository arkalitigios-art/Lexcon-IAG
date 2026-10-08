import { randomUUID } from 'node:crypto';
import { getSqlite } from '../../platform/database/client';
import type { CurrentUser } from '../../platform/auth/current-user';
import { hasCapability } from '../access/authorization';
import { notifyAssignedAttorney } from '../automation/iag-drafts';

export interface AttorneyOption { id: string; name: string }

export function listAvailableAttorneys(): AttorneyOption[] {
  return getSqlite().prepare(`
    SELECT u.id, u.display_name AS name
    FROM users u
    JOIN memberships m ON m.user_id = u.id AND m.active = 1
    WHERE u.active = 1 AND m.role = 'ARKA_ATTORNEY'
    ORDER BY u.display_name ASC
  `).all() as AttorneyOption[];
}

export function assignAttorney(actor: CurrentUser, processId: string, attorneyId: string): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ATTORNEY_ASSIGN')) throw new Error('No tienes autorización para asignar abogado.');
  const db = getSqlite();
  const attorney = db.prepare(`
    SELECT u.id FROM users u JOIN memberships m ON m.user_id = u.id AND m.active = 1
    WHERE u.id = ? AND u.active = 1 AND m.role = 'ARKA_ATTORNEY'
  `).get(attorneyId) as { id: string } | undefined;
  const process = db.prepare('SELECT id FROM processes WHERE id = ?').get(processId) as { id: string } | undefined;
  if (!attorney || !process) throw new Error('La asignación solicitada no es válida.');

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE attorney_assignments SET active = 0 WHERE process_id = ? AND active = 1').run(processId);
    db.prepare(`
      INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(process_id, user_id) DO UPDATE SET active = 1, created_at = excluded.created_at
    `).run(randomUUID(), processId, attorneyId, now);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), processId, actor.id, 'ATTORNEY_ASSIGNED', 'user', attorneyId, now);
  })(); notifyAssignedAttorney(processId);
}
