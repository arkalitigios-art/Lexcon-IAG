export interface ConfiguracionSupabasePublica {
  url: string;
  clavePublicable: string;
}

function valor(nombre: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string | null {
  const resultado = process.env[nombre]?.trim();
  return resultado && resultado.length > 0 ? resultado : null;
}

export function configuracionSupabasePublica(): ConfiguracionSupabasePublica | null {
  const url = valor('NEXT_PUBLIC_SUPABASE_URL');
  const clavePublicable = valor('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!url && !clavePublicable) return null;
  if (!url || !clavePublicable) throw new Error('La configuración pública de Supabase está incompleta. Defina NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  if (!/^https:\/\/[^\s]+$/i.test(url)) throw new Error('NEXT_PUBLIC_SUPABASE_URL debe ser una URL HTTPS válida.');
  return { url, clavePublicable };
}

export function supabasePublicoConfigurado(): boolean {
  return configuracionSupabasePublica() !== null;
}
