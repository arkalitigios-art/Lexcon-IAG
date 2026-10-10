import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { cambiarEstadoUsuario, invitarUsuario, reenviarAcceso } from '@/modules/access/supabase-user-administration';

async function administrador() {
  const user = await currentUser();
  return user?.role === 'ARKA_ADMIN' ? user : null;
}

export async function POST(request: Request) {
  const user = await administrador();
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  try {
    const data = await request.json() as { nombre?: string; correo?: string; codigoRol?: string; idInstitucion?: string | null };
    await invitarUsuario(user, { nombre: data.nombre ?? '', correo: data.correo ?? '', codigoRol: data.codigoRol ?? '', idInstitucion: data.idInstitucion });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible enviar la invitación.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await administrador();
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  try {
    const data = await request.json() as { idUsuario?: string; accion?: 'REENVIAR' | 'CAMBIAR_ESTADO'; activo?: boolean };
    if (!data.idUsuario || !data.accion) throw new Error('Selecciona una cuenta y una acción.');
    if (data.accion === 'REENVIAR') await reenviarAcceso(user, data.idUsuario);
    else if (data.accion === 'CAMBIAR_ESTADO' && typeof data.activo === 'boolean') await cambiarEstadoUsuario(user, data.idUsuario, data.activo);
    else throw new Error('La acción solicitada no es válida.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible actualizar el acceso.' }, { status: 400 });
  }
}
