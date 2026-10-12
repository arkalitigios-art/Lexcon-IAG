import { NextResponse } from 'next/server';
import { currentUser, type CurrentUser } from '@/platform/auth/current-user';
import { cambiarEstadoUsuario, invitarUsuario, reenviarAcceso } from '@/modules/access/supabase-user-administration';
import { corregirCorreo, crearPuertoCorreccion, ErrorCorreo, type CodigoErrorCorreo } from '@/modules/access/email-correction';
import { crearClienteSupabaseServidor } from '@/platform/supabase/server';

const ESTADO_ERROR_CORREO: Record<CodigoErrorCorreo, number> = { NO_AUTORIZADO: 403, DATOS_INVALIDOS: 400, FALLO: 500 };

async function administrador() {
  const user = await currentUser();
  return user?.role === 'ARKA_ADMIN' ? user : null;
}

/** Solo los mensajes controlados de ErrorCorreo llegan a la pantalla; cualquier otro error se responde de forma genérica. */
async function corregirCorreoDeCuenta(user: CurrentUser, idUsuario: string, correo: unknown) {
  try {
    await corregirCorreo(crearPuertoCorreccion(crearClienteSupabaseServidor()), { id: user.id, role: user.role }, idUsuario, correo);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ErrorCorreo) {
      // Los fallos del servicio dejan un diagnóstico de etiqueta fija; los datos inválidos son del usuario y no se registran.
      if (error.codigo === 'FALLO') console.error('[correo] fallo del servicio', 'FALLO');
      return NextResponse.json({ error: error.message }, { status: ESTADO_ERROR_CORREO[error.codigo] });
    }
    // Diagnóstico sin datos personales ni texto del proveedor: etiqueta fija y solo el tipo de error.
    console.error('[correo] fallo inesperado', error instanceof Error ? error.name : typeof error);
    return NextResponse.json({ error: 'No fue posible corregir el correo.' }, { status: 500 });
  }
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
    const data = await request.json() as { idUsuario?: string; accion?: 'REENVIAR' | 'CAMBIAR_ESTADO' | 'CORREGIR_CORREO'; activo?: boolean; correo?: string };
    if (!data.idUsuario || !data.accion) throw new Error('Selecciona una cuenta y una acción.');
    if (data.accion === 'CORREGIR_CORREO') return await corregirCorreoDeCuenta(user, data.idUsuario, data.correo);
    if (data.accion === 'REENVIAR') await reenviarAcceso(user, data.idUsuario);
    else if (data.accion === 'CAMBIAR_ESTADO' && typeof data.activo === 'boolean') await cambiarEstadoUsuario(user, data.idUsuario, data.activo);
    else throw new Error('La acción solicitada no es válida.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible actualizar el acceso.' }, { status: 400 });
  }
}
