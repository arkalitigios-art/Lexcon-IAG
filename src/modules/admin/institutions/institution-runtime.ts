import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearPuertoInstitucionesLocal } from './institution-port-local';
import { crearPuertoInstitucionesSupabase } from './institution-port-supabase';
import type { PuertoInstituciones } from './institution-service';

/** Supabase cuando está configurado (producción); SQLite en la demostración local. */
export function puertoInstituciones(): PuertoInstituciones {
  return supabaseConfigurado() ? crearPuertoInstitucionesSupabase(crearClienteSupabaseServidor()) : crearPuertoInstitucionesLocal();
}
