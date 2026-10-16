import type { CurrentUser } from '../../platform/auth/current-user';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '../../platform/supabase/server';
import { hasCapability } from '../access/authorization';
import { crearPuertoCentroControlLocal } from './control-center-local';
import { crearPuertoCentroControlSupabase } from './control-center-supabase';

/** Eventos que muestra Registro de actuaciones (el mismo número que mostraba la versión SQLite). */
export const LIMITE_EVENTOS = 8;

export interface AdminControlCenter {
  counts: { processes: number; unassigned: number; blocked: number; institutions: number; auditEvents: number };
  blocks: Array<{ processId: string; institutionName: string; scope: string; reason: string; createdAt: string }>;
  events: Array<{ action: string; actorName: string; institutionName: string | null; createdAt: string }>;
}

export interface PuertoCentroControl {
  contadores(): Promise<AdminControlCenter['counts']>;
  bloqueosActivos(): Promise<AdminControlCenter['blocks']>;
  ultimosEventos(limite: number): Promise<AdminControlCenter['events']>;
}

export async function obtenerCentroControl(puerto: PuertoCentroControl, actor: CurrentUser): Promise<AdminControlCenter> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new Error('No tienes autorización para consultar el centro de control.');
  }
  const [counts, blocks, events] = await Promise.all([puerto.contadores(), puerto.bloqueosActivos(), puerto.ultimosEventos(LIMITE_EVENTOS)]);
  return { counts, blocks, events };
}

/** Alertas y bloqueos y Registro de actuaciones: Supabase cuando está configurado; SQLite en la demostración local. */
export async function getAdminControlCenter(actor: CurrentUser): Promise<AdminControlCenter> {
  const puerto = supabaseConfigurado() ? crearPuertoCentroControlSupabase(crearClienteSupabaseServidor()) : crearPuertoCentroControlLocal();
  return obtenerCentroControl(puerto, actor);
}
