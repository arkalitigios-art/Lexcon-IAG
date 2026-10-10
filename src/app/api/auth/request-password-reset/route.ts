import { NextResponse } from 'next/server';
import { appUrl } from '@/platform/app-url';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string };
    if (supabasePublicoConfigurado() && typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email.trim())) {
      await (await crearClienteSupabaseSesion()).auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/auth/confirm?next=/auth/update-password') });
    }
  } catch {
    // La respuesta deliberadamente no indica si existe una cuenta o si falló el correo.
  }
  return NextResponse.json({ ok: true });
}
