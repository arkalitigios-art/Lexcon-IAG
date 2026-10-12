import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appUrl } from '@/platform/app-url';
import { configuracionSupabasePublica } from '@/platform/supabase/public';
import { ErrorCuenta, type PuertoCuenta } from './account-service';

const MENSAJE_VERIFICACION = 'No fue posible verificar la contraseña en este momento. Intente de nuevo en unos minutos.';

/**
 * `sesion` es el cliente con las cookies de la persona (para cambiar SU contraseña y SU correo);
 * `servicio` es el cliente con clave de servicio (solo para nombre y auditoría).
 */
export function crearPuertoCuenta(sesion: Pick<SupabaseClient, 'auth'>, servicio: SupabaseClient): PuertoCuenta {
  return {
    async verificarContrasena(correo, contrasena) {
      try {
        const configuracion = configuracionSupabasePublica();
        if (!configuracion) throw new Error('Supabase no está configurado.');
        // Cliente aislado: verificar la contraseña no debe renovar ni reemplazar la sesión de la persona.
        const aislado = createClient(configuracion.url, configuracion.clavePublicable, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const { error } = await aislado.auth.signInWithPassword({ email: correo, password: contrasena });
        if (!error) return true;
        // Solo unas credenciales rechazadas cuentan como contraseña incorrecta.
        if (error.code === 'invalid_credentials') return false;
      } catch {
        // Cualquier excepción se trata como falla del servicio, igual que el resto de errores.
      }
      // Una falla del servicio (límite, red, configuración) no es una contraseña incorrecta ni debe sumar intentos.
      throw new ErrorCuenta('FALLO', MENSAJE_VERIFICACION);
    },
    async actualizarContrasena(nueva) {
      const { error } = await sesion.auth.updateUser({ password: nueva });
      if (error) {
        if (error.code === 'weak_password') throw new ErrorCuenta('DATOS_INVALIDOS', 'La contraseña no cumple los requisitos del servicio; use una más larga o menos común.');
        if (error.code === 'same_password') throw new ErrorCuenta('DATOS_INVALIDOS', 'La contraseña nueva debe ser distinta de la actual.');
        throw new ErrorCuenta('FALLO', 'No fue posible actualizar la contraseña. Inicie sesión de nuevo e intente otra vez.');
      }
    },
    async solicitarCambioCorreo(nuevo) {
      const { error } = await sesion.auth.updateUser({ email: nuevo }, { emailRedirectTo: appUrl('/auth/confirm?next=%2Fdashboard%2Faccount&flujo=correo') });
      if (error) {
        const ya = error.code === 'email_exists' || error.message.toLowerCase().includes('already');
        throw new ErrorCuenta(ya ? 'DATOS_INVALIDOS' : 'FALLO', ya ? 'Ya existe una cuenta con ese correo.' : 'No fue posible enviar la confirmación al correo nuevo.');
      }
    },
    async actualizarNombre(idUsuario, nombre) {
      const { error } = await servicio.from('perfiles_usuario').update({ nombre_mostrado: nombre, actualizado_en: new Date().toISOString() }).eq('id_usuario', idUsuario);
      if (error) throw new ErrorCuenta('FALLO', 'No fue posible guardar el nombre.');
    },
    async registrarEvento(accion, idUsuario, datos) {
      try {
        const { error } = await servicio.rpc('registrar_evento_acceso', { p_id_actor: idUsuario, p_id_usuario: idUsuario, p_accion: accion, p_datos: datos });
        if (error) throw new Error('auditoría');
      } catch {
        // Diagnóstico sin datos personales: etiqueta fija y solo la acción.
        console.error('[cuenta] auditoría no registrada', accion);
        throw new Error('auditoría');
      }
    },
  };
}
