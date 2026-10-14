import { getSqlite } from '@/platform/database/client';
import { supabaseConfigurado } from '@/platform/supabase/server';

export interface InAppNotification {
  id: string;
  processId: string | null;
  body: string;
  createdAt: string;
}

/**
 * Notificaciones internas abiertas del usuario, de la más reciente a la más antigua.
 * Con Supabase activo no se consulta SQLite (en el servidor de producción no existe): el flujo que genera estas alertas
 * todavía escribe en SQLite, así que por ahora no hay notificaciones que mostrar y los paneles cargan sin ellas.
 */
export function listInAppNotifications(userId: string, limit = 6): InAppNotification[] {
  // Mismo criterio que listProcessesFor para elegir entre Supabase y SQLite.
  if (supabaseConfigurado()) return [];
  return getSqlite().prepare(
    `SELECT id, process_id AS processId, body, created_at AS createdAt
     FROM alerts WHERE user_id = ? AND channel = 'IN_APP' AND status = 'OPEN' ORDER BY created_at DESC LIMIT ?`,
  ).all(userId, limit) as InAppNotification[];
}
