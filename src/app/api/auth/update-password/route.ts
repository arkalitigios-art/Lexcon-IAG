import { NextResponse } from 'next/server';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { validarContrasena } from '@/platform/auth/password-policy';

export async function POST(request: Request) {
  if (!supabasePublicoConfigurado()) return NextResponse.json({ error: 'El acceso remoto no está configurado.' }, { status: 503 });
  try {
    const cuerpo = await request.json() as { password?: unknown; idUsuarioEnlace?: unknown } | null;
    const password = validarContrasena(cuerpo?.password);
    const supabase = await crearClienteSupabaseSesion();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'El enlace de acceso venció. Solicita uno nuevo.' }, { status: 401 });
    // Las pestañas de un mismo navegador comparten la cookie de sesión: si otra sesión (por ejemplo la de un
    // Administrador) reemplazó a la del enlace, cambiar la contraseña aquí afectaría a otra cuenta.
    const idEnlace = typeof cuerpo?.idUsuarioEnlace === 'string' ? cuerpo.idUsuarioEnlace : '';
    if (!idEnlace || idEnlace !== user.id) {
      return NextResponse.json({ error: 'La sesión de este navegador cambió mientras definía su contraseña (otra sesión abierta). No se hizo ningún cambio: abra de nuevo el enlace del correo en una ventana donde no haya otra sesión iniciada.' }, { status: 409 });
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error('No fue posible actualizar la contraseña. Solicita un enlace nuevo.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.' }, { status: 400 });
  }
}
