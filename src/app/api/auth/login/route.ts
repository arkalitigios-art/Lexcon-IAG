import { NextResponse } from 'next/server';
import { getSqlite } from '@/platform/database/client'; import { verifyPassword } from '@/platform/auth/password'; import { createSession } from '@/platform/auth/session';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { currentUser } from '@/platform/auth/current-user';

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (supabasePublicoConfigurado()) {
    const supabase = await crearClienteSupabaseSesion();
    const { error } = await supabase.auth.signInWithPassword({ email: email ?? '', password: password ?? '' });
    if (error) return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 });
    try {
      if (await currentUser()) return NextResponse.json({ ok: true });
    } catch {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'La integración de acceso con Supabase aún no está disponible.' }, { status: 503 });
    }
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Esta cuenta no tiene un perfil activo autorizado.' }, { status: 403 });
  }
  const user = email ? getSqlite().prepare('SELECT id, password_hash AS passwordHash FROM users WHERE email = ? AND active = 1').get(email) as { id: string; passwordHash: string } | undefined : undefined;
  if (!user || !password || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: 'Credenciales no válidas.' }, { status: 401 });
  const session = createSession(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('lexcon_session', session.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', expires: new Date(session.expiresAt), path: '/' });
  return response;
}
