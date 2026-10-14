import { NextResponse } from 'next/server'; import { cookies } from 'next/headers'; import { deleteSession } from '@/platform/auth/session';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';

export async function POST() {
  // scope "local": solo esta sesión. El modo por defecto ("global") cerraba también la sesión de la misma persona en sus otros dispositivos.
  if (supabasePublicoConfigurado()) await (await crearClienteSupabaseSesion()).auth.signOut({ scope: 'local' });
  const token = (await cookies()).get('lexcon_session')?.value;
  if (token) deleteSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('lexcon_session');
  return response;
}
