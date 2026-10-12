import type { SupabaseClient } from '@supabase/supabase-js';
import { enmascararCorreo } from '@/platform/security/mask-email';

export type CodigoErrorCorreo = 'NO_AUTORIZADO' | 'DATOS_INVALIDOS' | 'FALLO';

export class ErrorCorreo extends Error {
  constructor(readonly codigo: CodigoErrorCorreo, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCorreo';
  }
}

export interface UsuarioCorregible { id: string; nombre: string; correo: string; activo: boolean }

export interface PuertoCorreccionCorreo {
  buscarUsuario(idUsuario: string): Promise<UsuarioCorregible | null>;
  existeCorreo(correo: string): Promise<boolean>;
  actualizarCorreoAuth(idUsuario: string, correo: string): Promise<void>;
  registrarEvento(idActor: string, idUsuario: string, datos: Record<string, string>): Promise<void>;
}

export async function corregirCorreo(
  puerto: PuertoCorreccionCorreo,
  actor: { id: string; role: string },
  idUsuario: unknown,
  correoNuevo: unknown,
): Promise<void> {
  if (actor.role !== 'ARKA_ADMIN') throw new ErrorCorreo('NO_AUTORIZADO', 'No tienes autorización para corregir correos.');
  if (idUsuario === actor.id) throw new ErrorCorreo('DATOS_INVALIDOS', 'Para cambiar su propio correo use Mi cuenta.');
  // Validar el formato antes de cualquier consulta: un valor inválido no debe llegar a la base de datos.
  if (typeof idUsuario !== 'string' || !idUsuario.trim()) throw new ErrorCorreo('DATOS_INVALIDOS', 'La cuenta solicitada no es válida.');
  const nuevo = typeof correoNuevo === 'string' ? correoNuevo.trim().toLowerCase() : '';
  if (!nuevo || nuevo.length > 254 || !/^\S+@\S+\.\S+$/.test(nuevo)) throw new ErrorCorreo('DATOS_INVALIDOS', 'El correo nuevo no es válido.');
  const usuario = await puerto.buscarUsuario(idUsuario);
  if (!usuario) throw new ErrorCorreo('DATOS_INVALIDOS', 'La cuenta solicitada no existe.');
  if (usuario.correo.toLowerCase() === nuevo) throw new ErrorCorreo('DATOS_INVALIDOS', 'El correo nuevo debe ser distinto del actual.');
  if (await puerto.existeCorreo(nuevo)) throw new ErrorCorreo('DATOS_INVALIDOS', 'Ya existe una cuenta con ese correo.');

  await puerto.actualizarCorreoAuth(usuario.id, nuevo);
  try {
    await puerto.registrarEvento(actor.id, usuario.id, { correo_anterior: enmascararCorreo(usuario.correo), correo_nuevo: enmascararCorreo(nuevo) });
  } catch {
    // Sin auditoría no se deja el cambio: se devuelve el correo anterior.
    let revertido = true;
    try {
      await puerto.actualizarCorreoAuth(usuario.id, usuario.correo);
    } catch {
      revertido = false;
    }
    if (!revertido) {
      // Diagnóstico con etiqueta fija: nunca incluye correos ni texto del proveedor.
      console.error('[correo] no se pudo revertir el cambio de correo');
      throw new ErrorCorreo('FALLO', 'El correo se cambió pero no se pudo registrar en la auditoría ni revertir. Verifique el correo de la cuenta en Supabase.');
    }
    throw new ErrorCorreo('FALLO', 'No fue posible registrar el cambio en la auditoría. El correo no se modificó.');
  }
}

export function crearPuertoCorreccion(supabase: SupabaseClient): PuertoCorreccionCorreo {
  return {
    async buscarUsuario(idUsuario) {
      const { data, error } = await supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado,correo_electronico,activo').eq('id_usuario', idUsuario).maybeSingle();
      if (error) throw new ErrorCorreo('FALLO', 'No fue posible consultar la cuenta.');
      return data ? { id: data.id_usuario as string, nombre: data.nombre_mostrado as string, correo: data.correo_electronico as string, activo: data.activo as boolean } : null;
    },
    async existeCorreo(correo) {
      const { count, error } = await supabase.from('perfiles_usuario').select('id_usuario', { count: 'exact', head: true }).eq('correo_electronico', correo.toLowerCase());
      if (error) throw new ErrorCorreo('FALLO', 'No fue posible verificar el correo.');
      return (count ?? 0) > 0;
    },
    async actualizarCorreoAuth(idUsuario, correo) {
      const { error } = await supabase.auth.admin.updateUserById(idUsuario, { email: correo, email_confirm: true });
      if (error) {
        const mensaje = error.message.toLowerCase();
        const ya = error.code === 'email_exists' || mensaje.includes('already') || mensaje.includes('registered');
        throw new ErrorCorreo(ya ? 'DATOS_INVALIDOS' : 'FALLO', ya ? 'Ya existe una cuenta con ese correo.' : 'No fue posible actualizar el correo en el servicio de acceso.');
      }
    },
    async registrarEvento(idActor, idUsuario, datos) {
      try {
        const { error } = await supabase.rpc('registrar_evento_acceso', { p_id_actor: idActor, p_id_usuario: idUsuario, p_accion: 'EMAIL_CORRECTED', p_datos: datos });
        if (error) throw new Error('auditoría');
      } catch {
        // Diagnóstico con etiqueta fija: sin correos ni texto del proveedor.
        console.error('[correo] auditoría no registrada');
        throw new Error('auditoría');
      }
    },
  };
}
