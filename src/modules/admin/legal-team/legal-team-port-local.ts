import { getSqlite } from '@/platform/database/client';
import type { AbogadoEquipo, PuertoEquipoJuridico } from './legal-team-service';

/** Demostración local: abogados con usuario y membresía activos y sus asignaciones vigentes. */
export function crearPuertoEquipoJuridicoLocal(): PuertoEquipoJuridico {
  return {
    async listarAbogadosActivos() {
      return getSqlite().prepare(`SELECT u.id AS id, u.display_name AS nombre, u.email AS correo, COUNT(DISTINCT a.process_id) AS procesosAsignados
        FROM users u
        JOIN memberships m ON m.user_id = u.id AND m.role = 'ARKA_ATTORNEY' AND m.active = 1
        LEFT JOIN attorney_assignments a ON a.user_id = u.id AND a.active = 1
        WHERE u.active = 1
        GROUP BY u.id
        ORDER BY u.display_name`).all() as AbogadoEquipo[];
    },
  };
}
