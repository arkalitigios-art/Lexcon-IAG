import { getSqlite } from '../../platform/database/client';
import type { AdminControlCenter, PuertoCentroControl } from './control-center';

/** Demostración local: las mismas consultas SQLite de la versión anterior. */
export function crearPuertoCentroControlLocal(): PuertoCentroControl {
  const uno = (sql: string): number => (getSqlite().prepare(sql).get() as { count: number }).count;
  return {
    async contadores() {
      return {
        processes: uno('SELECT COUNT(*) AS count FROM processes'),
        unassigned: uno('SELECT COUNT(*) AS count FROM processes p WHERE NOT EXISTS (SELECT 1 FROM attorney_assignments a WHERE a.process_id = p.id AND a.active = 1)'),
        blocked: uno('SELECT COUNT(*) AS count FROM workflow_blocks WHERE active = 1'),
        institutions: uno('SELECT COUNT(*) AS count FROM institutions WHERE active = 1'),
        auditEvents: uno('SELECT COUNT(*) AS count FROM audit_events'),
      };
    },
    async bloqueosActivos() {
      return getSqlite().prepare(`SELECT block.process_id AS processId, institution.name AS institutionName, block.scope, block.reason, block.created_at AS createdAt FROM workflow_blocks block JOIN processes process ON process.id = block.process_id JOIN institutions institution ON institution.id = process.institution_id WHERE block.active = 1 ORDER BY block.created_at DESC`).all() as AdminControlCenter['blocks'];
    },
    async ultimosEventos(limite) {
      return getSqlite().prepare(`SELECT event.action, actor.display_name AS actorName, institution.name AS institutionName, event.created_at AS createdAt FROM audit_events event JOIN users actor ON actor.id = event.actor_user_id LEFT JOIN processes process ON process.id = event.process_id LEFT JOIN institutions institution ON institution.id = process.institution_id ORDER BY event.created_at DESC LIMIT ?`).all(limite) as AdminControlCenter['events'];
    },
  };
}
