import { NextResponse } from 'next/server';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';

export async function POST(request: Request) {
  if (!supabasePublicoConfigurado()) return NextResponse.json({ error: 'El acceso remoto no está configurado.' }, { status: 503 });
  try {
    const { password } = await request.json() as { password?: string };
    if (!password || password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
    const supabase = await crearClienteSupabaseSesion();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'El enlace de acceso venció. Solicita uno nuevo.' }, { status: 401 });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error('No fue posible actualizar la contraseña. Solicita un enlace nuevo.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.' }, { status: 400 });
  }
}
