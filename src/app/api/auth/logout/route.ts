import { NextResponse } from 'next/server'; import { cookies } from 'next/headers'; import { deleteSession } from '@/platform/auth/session';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';

export async function POST() {
  if (supabasePublicoConfigurado()) await (await crearClienteSupabaseSesion()).auth.signOut();
  const token = (await cookies()).get('lexcon_session')?.value;
  if (token) deleteSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('lexcon_session');
  return response;
}
