import { NextResponse } from 'next/server';
import {
  codigoConfiguracionActivo, crearPrimerAdministrador, ErrorConfiguracion, listarAdministradores,
  MENSAJE_CODIGO, recuperarAdministrador,
} from '@/modules/access/setup-administrator';
import { crearPuertoSupabase } from '@/modules/access/setup-administrator-supabase';
import { AttemptLimiter } from '@/platform/security/attempt-limiter';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';

export const dynamic = 'force-dynamic';

const VENTANA_MS = 15 * 60_000;
const MAXIMO_CUERPO = 10_000;
const MAXIMO_CLAVE_IP = 64;
const porIp = new AttemptLimiter({ maxFailures: 5, windowMs: VENTANA_MS });
const enTotal = new AttemptLimiter({ maxFailures: 30, windowMs: VENTANA_MS });
const CLAVE_GLOBAL = 'global';

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Detrás de Traefik (Dokploy) el primer valor es la IP real del cliente. La clave se
 * acota a 64 caracteres para no confiar en una cabecera de tamaño arbitrario.
 *
 * Supuesto de confianza: el valor más a la izquierda de X-Forwarded-For solo es fiable si
 * Traefik descarta las cabeceras X-Forwarded-* enviadas por el cliente (comportamiento
 * por defecto con orígenes no confiables). Si se configura trustedIPs/insecure, o hay una
 * CDN por delante, el cliente controla ese valor y puede rotar de "IP" para esquivar el
 * límite por dirección. En ese caso el límite global (30 fallos cada 15 minutos) es la
 * red de seguridad: puede bloquear al operador legítimo, pero nunca permite más de 30
 * intentos por ventana. Los contadores viven en memoria, así que un reinicio los borra.
 */
function ipDe(solicitud: Request): string {
  const valor = solicitud.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || solicitud.headers.get('x-real-ip') || 'desconocida';
  return valor.slice(0, MAXIMO_CLAVE_IP);
}

/** Una configuración parcial o no HTTPS lanza; para quien llama la ruta simplemente no existe. */
function supabaseDisponible(): boolean {
  try { return supabaseConfigurado(); } catch { return false; }
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export async function POST(solicitud: Request) {
  const esperado = codigoConfiguracionActivo();
  if (!esperado || !supabaseDisponible()) return responder({ error: 'No encontrada.' }, 404);

  const ip = ipDe(solicitud);
  if (porIp.isBlocked(ip) || enTotal.isBlocked(CLAVE_GLOBAL)) return responder({ error: MENSAJE_CODIGO }, 403);

  let texto: string;
  try { texto = await solicitud.text(); } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }
  if (texto.length > MAXIMO_CUERPO) return responder({ error: 'La solicitud es demasiado grande.' }, 413);

  let analizado: unknown;
  try { analizado = JSON.parse(texto); } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }
  if (!esObjetoPlano(analizado)) return responder({ error: 'La solicitud no es válida.' }, 400);
  const cuerpo = analizado;

  try {
    const puerto = crearPuertoSupabase(crearClienteSupabaseServidor());
    if (cuerpo.accion === 'crear') {
      await crearPrimerAdministrador(puerto, esperado, cuerpo as { codigo: unknown; nombre: unknown; correo: unknown; contrasena: unknown });
      porIp.reset(ip);
      return responder({ ok: true }, 200);
    }
    if (cuerpo.accion === 'listar') {
      const administradores = await listarAdministradores(puerto, esperado, cuerpo.codigo);
      porIp.reset(ip);
      return responder({ administradores }, 200);
    }
    if (cuerpo.accion === 'recuperar') {
      await recuperarAdministrador(puerto, esperado, cuerpo as { codigo: unknown; idUsuario: unknown; correo: unknown; contrasena: unknown });
      porIp.reset(ip);
      return responder({ ok: true }, 200);
    }
    return responder({ error: 'La acción solicitada no es válida.' }, 400);
  } catch (error) {
    if (error instanceof ErrorConfiguracion) {
      if (error.codigo === 'CODIGO_INVALIDO') {
        porIp.recordFailure(ip);
        enTotal.recordFailure(CLAVE_GLOBAL);
        return responder({ error: MENSAJE_CODIGO }, 403);
      }
      // Diagnóstico del servidor: etiqueta fija y solo el código; nunca contraseñas, el código de configuración, correos ni mensajes.
      if (error.codigo === 'FALLO') console.error('[setup] fallo del servicio', error.codigo);
      const estado = error.codigo === 'NO_DISPONIBLE' ? 409 : error.codigo === 'DATOS_INVALIDOS' ? 400 : 500;
      return responder({ error: error.message }, estado);
    }
    console.error('[setup] fallo inesperado', error instanceof Error ? error.name : typeof error);
    return responder({ error: 'No fue posible completar la operación.' }, 500);
  }
}
