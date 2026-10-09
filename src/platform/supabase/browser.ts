'use client';

import { createBrowserClient } from '@supabase/ssr';
import { configuracionSupabasePublica } from './public';

export function crearClienteSupabaseNavegador() {
  const configuracion = configuracionSupabasePublica();
  if (!configuracion) throw new Error('Supabase no está configurado para el navegador.');
  return createBrowserClient(configuracion.url, configuracion.clavePublicable);
}
