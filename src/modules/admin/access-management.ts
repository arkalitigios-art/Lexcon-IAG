import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../../platform/auth/current-user';
import { hasCapability } from '../access/authorization';
import { getSqlite } from '../../platform/database/client';

export function setAccessActive(actor: CurrentUser, membershipId: string, active: boolean): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) throw new Error('No tienes autorización para administrar accesos.');
  const db = getSqlite();
  const membership = db.prepare('SELECT id, user_id AS userId, active FROM memberships WHERE id = ?').get(membershipId) as { id: string; userId: string; active: number } | undefined;
  if (!membership) throw new Error('El acceso solicitado no existe.');
  if (membership.userId === actor.id && !active) throw new Error('No puedes desactivar tu propio acceso administrativo.');
  if (Boolean(membership.active) === active) return;
  db.transaction(() => {
    db.prepare('UPDATE memberships SET active = ? WHERE id = ?').run(active ? 1 : 0, membershipId);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)')
      .run(randomUUID(), actor.id, active ? 'ACCESS_ACTIVATED' : 'ACCESS_DEACTIVATED', 'membership', membershipId, new Date().toISOString());
  })();
}
