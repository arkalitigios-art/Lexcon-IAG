import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { configuracionSupabasePublica } from './public';

export async function actualizarSesionSupabase(request: NextRequest): Promise<NextResponse> {
  const configuracion = configuracionSupabasePublica();
  if (!configuracion) return NextResponse.next({ request });

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(configuracion.url, configuracion.clavePublicable, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesPorActualizar) => {
        cookiesPorActualizar.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookiesPorActualizar.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();
  return respuesta;
}
