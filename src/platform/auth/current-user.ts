import { cookies } from 'next/headers';
import { getSqlite } from '../database/client';
import { readSession } from './session';
import type { PlatformRole } from '../../modules/access/authorization';
import { crearClienteSupabaseSesion } from '../supabase/session';
import { supabasePublicoConfigurado } from '../supabase/public';
import { mapearIdentidadSupabase, type IdentidadSupabase } from './supabase-identity';

export interface CurrentUser { id: string; name: string; role: PlatformRole; institutionId: string | null; institutionName: string | null }

export async function currentUser(): Promise<CurrentUser | null> {
  if (supabasePublicoConfigurado()) return currentSupabaseUser();
  const token = (await cookies()).get('lexcon_session')?.value;
  if (!token) return null; const session = readSession(token); if (!session) return null;
  return getSqlite().prepare(`SELECT u.id, u.display_name AS name, m.role, m.institution_id AS institutionId, i.name AS institutionName FROM users u JOIN memberships m ON m.user_id = u.id AND m.active = 1 LEFT JOIN institutions i ON i.id = m.institution_id WHERE u.id = ? AND u.active = 1 AND (m.institution_id IS NULL OR i.active = 1) LIMIT 1`).get(session.userId) as CurrentUser | undefined ?? null;
}

async function currentSupabaseUser(): Promise<CurrentUser | null> {
  const supabase = await crearClienteSupabaseSesion();
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) return null;
  const { data, error } = await supabase.rpc('obtener_identidad_actual');
  if (error) throw new Error('No fue posible verificar el perfil y el rol de la sesión de Supabase.');
  const identidad = (data as IdentidadSupabase[] | null)?.[0];
  return identidad ? mapearIdentidadSupabase(identidad) : null;
}
