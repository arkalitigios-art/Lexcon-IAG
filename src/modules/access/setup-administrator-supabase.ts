import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorConfiguracion, type AdministradorResumen, type PuertoConfiguracion } from './setup-administrator';

function mensajeAuth(error: { message?: string; code?: string }): ErrorConfiguracion {
  const texto = error.message?.toLowerCase() ?? '';
  if (error.code === 'email_exists' || texto.includes('already') || texto.includes('registered')) return new ErrorConfiguracion('DATOS_INVALIDOS', 'Ya existe una cuenta con este correo.');
  if (error.code === 'weak_password') return new ErrorConfiguracion('DATOS_INVALIDOS', 'La contraseña no cumple la política del servicio; use una más larga o menos común.');
  return new ErrorConfiguracion('FALLO', 'No fue posible completar la operación con el servicio de acceso.');
}

/**
 * Administradores con asignación de rol activa Y perfil activo. Es la única fuente
 * para contar y para listar, de modo que ambos resultados siempre coinciden entre sí
 * y con la guarda SQL de `registrar_acceso_usuario`.
 */
async function consultarAdministradoresActivos(supabase: SupabaseClient): Promise<AdministradorResumen[]> {
  const { data: asignaciones, error } = await supabase.from('asignaciones_roles_usuario')
    .select('id_usuario,roles!inner(codigo)').eq('activa', true).eq('roles.codigo', 'ADMINISTRADOR_ARKA');
  if (error) throw new ErrorConfiguracion('FALLO', 'No fue posible consultar los Administradores.');
  const ids = (asignaciones ?? []).map((fila) => fila.id_usuario as string);
  if (ids.length === 0) return [];
  const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles_usuario')
    .select('id_usuario,nombre_mostrado,correo_electronico').eq('activo', true).in('id_usuario', ids);
  if (errorPerfiles) throw new ErrorConfiguracion('FALLO', 'No fue posible consultar los Administradores.');
  return (perfiles ?? []).map((perfil) => ({ id: perfil.id_usuario as string, nombre: perfil.nombre_mostrado as string, correo: perfil.correo_electronico as string }));
}

/** Adaptador delgado: toda la lógica de negocio está en setup-administrator.ts. */
export function crearPuertoSupabase(supabase: SupabaseClient): PuertoConfiguracion {
  return {
    async contarAdministradoresActivos() {
      try {
        return (await consultarAdministradoresActivos(supabase)).length;
      } catch {
        throw new ErrorConfiguracion('FALLO', 'No fue posible verificar el estado de la configuración.');
      }
    },
    listarAdministradoresActivos() {
      return consultarAdministradoresActivos(supabase);
    },
    async crearUsuarioAuth({ correo, contrasena, nombre }) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: correo, password: contrasena, email_confirm: true, user_metadata: { nombre_mostrado: nombre },
      });
      if (error || !data.user) throw mensajeAuth(error ?? {});
      return { id: data.user.id };
    },
    async registrarAdministrador({ idUsuario, nombre, correo }) {
      const { error } = await supabase.rpc('registrar_acceso_usuario', {
        p_id_usuario: idUsuario, p_nombre: nombre, p_correo: correo, p_codigo_rol: 'ADMINISTRADOR_ARKA', p_id_institucion: null, p_id_actor: null,
      });
      if (error) {
        // Solo el código del error (nunca el mensaje, que puede incluir el correo); al llamador se le lanza un error genérico.
        console.error('[setup] registrar_acceso_usuario falló', error.code || 'sin-código');
        throw new Error('rpc');
      }
    },
    async eliminarUsuarioAuth(idUsuario) {
      // supabase-js no lanza: devuelve { error }. Hoy el servicio descarta este rechazo (.catch(() => undefined)),
      // así que la única huella de una cuenta de Auth huérfana es este registro con etiqueta fija; luego se lanza
      // igualmente para que cualquier otro llamador detecte el fallo.
      const { error } = await supabase.auth.admin.deleteUser(idUsuario);
      if (error) {
        console.error('[setup] no se pudo revertir la cuenta de Auth');
        throw new ErrorConfiguracion('FALLO', 'No fue posible eliminar la cuenta de acceso.');
      }
    },
    async actualizarCredenciales(idUsuario, cambios) {
      const { error } = await supabase.auth.admin.updateUserById(idUsuario, {
        ...(cambios.correo ? { email: cambios.correo, email_confirm: true } : {}),
        ...(cambios.contrasena ? { password: cambios.contrasena } : {}),
      });
      if (error) throw mensajeAuth(error);
    },
    async registrarEvento(accion, idUsuario, datos) {
      const { error } = await supabase.rpc('registrar_evento_acceso', { p_id_actor: null, p_id_usuario: idUsuario, p_accion: accion, p_datos: datos });
      if (error) throw new ErrorConfiguracion('FALLO', 'La recuperación se aplicó, pero no se pudo registrar en la auditoría.');
    },
  };
}
