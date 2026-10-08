import { getSqlite } from '../../platform/database/client';

export interface AdminControlCenter {
  counts: { processes: number; unassigned: number; blocked: number; institutions: number; activeAccesses: number; auditEvents: number };
  blocks: Array<{ processId: string; institutionName: string; scope: string; reason: string; createdAt: string }>;
  accesses: Array<{ id: string; active: boolean; name: string; email: string; role: string; institutionName: string | null }>;
  events: Array<{ action: string; actorName: string; institutionName: string | null; createdAt: string }>;
}

export function getAdminControlCenter(): AdminControlCenter {
  const db = getSqlite();
  const one = (sql: string): number => (db.prepare(sql).get() as { count: number }).count;
  return {
    counts: {
      processes: one('SELECT COUNT(*) AS count FROM processes'),
      unassigned: one('SELECT COUNT(*) AS count FROM processes p WHERE NOT EXISTS (SELECT 1 FROM attorney_assignments a WHERE a.process_id = p.id AND a.active = 1)'),
      blocked: one('SELECT COUNT(*) AS count FROM workflow_blocks WHERE active = 1'),
      institutions: one('SELECT COUNT(*) AS count FROM institutions WHERE active = 1'),
      activeAccesses: one('SELECT COUNT(*) AS count FROM memberships WHERE active = 1'),
      auditEvents: one('SELECT COUNT(*) AS count FROM audit_events'),
    },
    blocks: db.prepare(`SELECT block.process_id AS processId, institution.name AS institutionName, block.scope, block.reason, block.created_at AS createdAt FROM workflow_blocks block JOIN processes process ON process.id = block.process_id JOIN institutions institution ON institution.id = process.institution_id WHERE block.active = 1 ORDER BY block.created_at DESC`).all() as AdminControlCenter['blocks'],
    accesses: db.prepare(`SELECT membership.id, membership.active, user.display_name AS name, user.email, membership.role, institution.name AS institutionName FROM memberships membership JOIN users user ON user.id = membership.user_id LEFT JOIN institutions institution ON institution.id = membership.institution_id WHERE user.active = 1 ORDER BY membership.active DESC, membership.role, user.display_name`).all() as AdminControlCenter['accesses'],
    events: db.prepare(`SELECT event.action, actor.display_name AS actorName, institution.name AS institutionName, event.created_at AS createdAt FROM audit_events event JOIN users actor ON actor.id = event.actor_user_id LEFT JOIN processes process ON process.id = event.process_id LEFT JOIN institutions institution ON institution.id = process.institution_id ORDER BY event.created_at DESC LIMIT 8`).all() as AdminControlCenter['events'],
  };
}
