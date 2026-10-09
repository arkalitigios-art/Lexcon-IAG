import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { configuracionSupabasePublica } from './public';

export async function crearClienteSupabaseSesion() {
  const configuracion = configuracionSupabasePublica();
  if (!configuracion) throw new Error('Supabase no está configurado para la sesión de servidor.');
  const almacenCookies = await cookies();

  return createServerClient(configuracion.url, configuracion.clavePublicable, {
    cookies: {
      getAll: () => almacenCookies.getAll(),
      setAll: (cookiesPorActualizar) => {
        try {
          cookiesPorActualizar.forEach(({ name, value, options }) => almacenCookies.set(name, value, options));
        } catch {
          // Los Server Components no pueden emitir Set-Cookie. proxy.ts los refresca.
        }
      },
    },
  });
}
