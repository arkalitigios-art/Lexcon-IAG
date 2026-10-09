import { randomUUID } from 'node:crypto';
import { getSqlite } from '../../platform/database/client';
import type { CurrentUser } from '../../platform/auth/current-user';
import { hasCapability } from '../access/authorization';
import { notifyAssignedAttorney } from '../automation/iag-drafts';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '../../platform/supabase/server';

export interface AttorneyOption { id: string; name: string }

function listLocalAvailableAttorneys(): AttorneyOption[] {
  return getSqlite().prepare(`
    SELECT u.id, u.display_name AS name
    FROM users u
    JOIN memberships m ON m.user_id = u.id AND m.active = 1
    WHERE u.active = 1 AND m.role = 'ARKA_ATTORNEY'
    ORDER BY u.display_name ASC
  `).all() as AttorneyOption[];
}

export async function listAvailableAttorneys(): Promise<AttorneyOption[]> {
  if (!supabaseConfigurado()) return listLocalAvailableAttorneys();
  const supabase = crearClienteSupabaseServidor();
  const { data: rol, error: errorRol } = await supabase.from('roles').select('id').eq('codigo', 'ABOGADO_ARKA').eq('activo', true).single();
  if (errorRol || !rol) throw new Error('No fue posible consultar el rol jurídico.');
  const { data: asignaciones, error: errorAsignaciones } = await supabase.from('asignaciones_roles_usuario').select('id_usuario').eq('id_rol', rol.id).eq('activa', true);
  if (errorAsignaciones) throw new Error('No fue posible consultar los abogados activos.');
  const ids = (asignaciones ?? []).map((asignacion) => asignacion.id_usuario);
  if (!ids.length) return [];
  const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles_usuario').select('id_usuario, nombre_mostrado').in('id_usuario', ids).eq('activo', true).order('nombre_mostrado');
  if (errorPerfiles) throw new Error('No fue posible consultar los perfiles jurídicos.');
  return (perfiles ?? []).map((perfil) => ({ id: perfil.id_usuario, name: perfil.nombre_mostrado }));
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

export async function assignAttorneyRemote(actor: CurrentUser, processId: string, attorneyId: string): Promise<void> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ATTORNEY_ASSIGN')) throw new Error('No tienes autorización para asignar abogado.');
  if (!supabaseConfigurado()) return assignAttorney(actor, processId, attorneyId);
  const { error } = await crearClienteSupabaseServidor().rpc('asignar_abogado_proceso', { p_id_proceso: processId, p_id_abogado: attorneyId, p_id_actor: actor.id });
  if (error) throw new Error('No fue posible registrar la asignación jurídica.');
}
