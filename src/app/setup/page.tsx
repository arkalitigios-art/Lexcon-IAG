import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { codigoConfiguracionActivo, estadoConfiguracion } from '@/modules/access/setup-administrator';
import { crearPuertoSupabase } from '@/modules/access/setup-administrator-supabase';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { SetupForm } from './setup-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Configuración inicial · LEXCON IAG', robots: { index: false, follow: false } };

/** Una configuración parcial o no HTTPS lanza; para quien llama la pantalla simplemente no existe. */
function supabaseDisponible(): boolean {
  try { return supabaseConfigurado(); } catch { return false; }
}

export default async function SetupPage() {
  if (!codigoConfiguracionActivo() || !supabaseDisponible()) notFound();
  const modo = await estadoConfiguracion(crearPuertoSupabase(crearClienteSupabaseServidor()));
  return <SetupForm modo={modo} />;
}
