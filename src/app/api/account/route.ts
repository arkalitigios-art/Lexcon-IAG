import { NextResponse } from 'next/server';
import { actualizarNombre, cambiarContrasena, ErrorCuenta, solicitarCambioCorreo } from '@/modules/access/account-service';
import { crearPuertoCuenta } from '@/modules/access/account-port-supabase';
import { currentUser } from '@/platform/auth/current-user';
import { AttemptLimiter } from '@/platform/security/attempt-limiter';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';

export const dynamic = 'force-dynamic';

const VENTANA_MS = 15 * 60_000;
const MAXIMO_CUERPO = 10_000;
const MENSAJE_BLOQUEO = 'Demasiados intentos. Intente de nuevo más tarde.';

/**
 * Evita que una sesión robada adivine la contraseña actual a través de este endpoint:
 * 5 contraseñas actuales incorrectas por persona bloquean la ruta durante 15 minutos.
 * Mientras dura el bloqueo se rechaza cualquier acción de Mi cuenta, también el cambio de nombre.
 *
 * Límites conocidos: el bloqueo se comprueba antes de verificar la contraseña y el fallo se
 * registra después, así que solicitudes en paralelo pueden superar los 5 intentos antes de que
 * se anote el primer fallo; la red de seguridad es el límite de inicios de sesión por IP de
 * Supabase. El conteo vive en memoria de cada proceso (una sola instancia en Dokploy) y un
 * reinicio lo borra. Solo la contraseña incorrecta suma: los datos inválidos y las fallas del
 * servicio no.
 */
const intentosContrasena = new AttemptLimiter({ maxFailures: 5, windowMs: VENTANA_MS });

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

/** Una configuración parcial o no HTTPS lanza; para quien llama el servicio simplemente no está disponible. */
function configurado(): boolean {
  try { return supabasePublicoConfigurado() && supabaseConfigurado(); } catch { return false; }
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export async function PATCH(solicitud: Request) {
  if (!configurado()) return responder({ error: 'Mi cuenta requiere el acceso con Supabase.' }, 503);

  let idUsuario: string | null = null;
  try {
    const usuario = await currentUser();
    if (!usuario) return responder({ error: 'Inicie sesión para continuar.' }, 401);
    const sesionSupabase = await crearClienteSupabaseSesion();
    const { data: { user: auth } } = await sesionSupabase.auth.getUser();
    if (!auth?.email) return responder({ error: 'Inicie sesión para continuar.' }, 401);
    idUsuario = usuario.id;

    // Antes de analizar el cuerpo o verificar nada: una cuenta bloqueada no puede seguir adivinando.
    if (intentosContrasena.isBlocked(idUsuario)) return responder({ error: MENSAJE_BLOQUEO }, 429);

    let texto: string;
    try { texto = await solicitud.text(); } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }
    if (texto.length > MAXIMO_CUERPO) return responder({ error: 'La solicitud es demasiado grande.' }, 413);

    let analizado: unknown;
    try { analizado = JSON.parse(texto); } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }
    if (!esObjetoPlano(analizado)) return responder({ error: 'La solicitud no es válida.' }, 400);
    const cuerpo = analizado;

    const puerto = crearPuertoCuenta(sesionSupabase, crearClienteSupabaseServidor());
    const contexto = { idUsuario, correo: auth.email };
    if (cuerpo.accion === 'NOMBRE') {
      await actualizarNombre(puerto, contexto, { nombre: cuerpo.nombre });
      return responder({ ok: true }, 200);
    }
    if (cuerpo.accion === 'CONTRASENA') {
      await cambiarContrasena(puerto, contexto, { actual: cuerpo.actual, nueva: cuerpo.nueva });
      intentosContrasena.reset(idUsuario);
      return responder({ ok: true }, 200);
    }
    if (cuerpo.accion === 'CORREO') {
      await solicitarCambioCorreo(puerto, contexto, { contrasenaActual: cuerpo.contrasenaActual, correoNuevo: cuerpo.correoNuevo });
      intentosContrasena.reset(idUsuario);
      return responder({ ok: true, mensaje: 'Enviamos una confirmación al correo nuevo. Hasta que la confirme, seguirá entrando con el correo actual. Abra el enlace de confirmación desde este mismo navegador.' }, 200);
    }
    return responder({ error: 'La acción solicitada no es válida.' }, 400);
  } catch (error) {
    if (error instanceof ErrorCuenta) {
      if (error.codigo === 'CONTRASENA_INCORRECTA' && idUsuario) intentosContrasena.recordFailure(idUsuario);
      // Diagnóstico del servidor: etiqueta fija y solo el código; nunca contraseñas, correos, cuerpos ni mensajes.
      if (error.codigo === 'FALLO') console.error('[cuenta] fallo del servicio', error.codigo);
      return responder({ error: error.message }, error.codigo === 'FALLO' ? 500 : error.codigo === 'CONTRASENA_INCORRECTA' ? 403 : 400);
    }
    console.error('[cuenta] fallo inesperado', error instanceof Error ? error.name : typeof error);
    return responder({ error: 'No fue posible completar la operación.' }, 500);
  }
}
