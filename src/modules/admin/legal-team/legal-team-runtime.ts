import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearPuertoEquipoJuridicoLocal } from './legal-team-port-local';
import { crearPuertoEquipoJuridicoSupabase } from './legal-team-port-supabase';
import type { PuertoEquipoJuridico } from './legal-team-service';

export function puertoEquipoJuridico(): PuertoEquipoJuridico {
  return supabaseConfigurado() ? crearPuertoEquipoJuridicoSupabase(crearClienteSupabaseServidor()) : crearPuertoEquipoJuridicoLocal();
}
