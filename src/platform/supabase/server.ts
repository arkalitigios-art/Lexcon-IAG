import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ConfiguracionSupabase {
  url: string;
  claveServicio: string;
}

function valorSeguro(nombre: 'LEXCON_SUPABASE_URL' | 'LEXCON_SUPABASE_SERVICE_ROLE_KEY'): string | null {
  const valor = process.env[nombre]?.trim();
  return valor && valor.length > 0 ? valor : null;
}

export function configuracionSupabase(): ConfiguracionSupabase | null {
  const url = valorSeguro('LEXCON_SUPABASE_URL');
  const claveServicio = valorSeguro('LEXCON_SUPABASE_SERVICE_ROLE_KEY');
  if (!url && !claveServicio) return null;
  if (!url || !claveServicio) throw new Error('La configuración de Supabase está incompleta. Defina LEXCON_SUPABASE_URL y LEXCON_SUPABASE_SERVICE_ROLE_KEY únicamente en el servidor.');
  if (!/^https:\/\/[^\s]+$/i.test(url)) throw new Error('LEXCON_SUPABASE_URL debe ser una URL HTTPS válida.');
  return { url, claveServicio };
}

export function supabaseConfigurado(): boolean {
  return configuracionSupabase() !== null;
}

/**
 * Cliente exclusivo de servidor. La clave de servicio evita RLS solamente tras
 * la autorización realizada por los módulos de LEXCON; nunca se importa desde
 * componentes cliente ni se expone con prefijo NEXT_PUBLIC_.
 */
export function crearClienteSupabaseServidor(): SupabaseClient {
  const configuracion = configuracionSupabase();
  if (!configuracion) throw new Error('Supabase no está configurado. La aplicación continúa en modo local hasta registrar las credenciales privadas del proyecto.');
  return createClient(configuracion.url, configuracion.claveServicio, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
