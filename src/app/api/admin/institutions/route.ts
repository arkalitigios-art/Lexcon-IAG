import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { actualizarInstitucion, crearInstitucion, ErrorInstitucion, type CodigoErrorInstitucion, type EntradaInstitucion } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';

export const dynamic = 'force-dynamic';

const MAXIMO_CUERPO = 10_000;
const ESTADO_HTTP: Record<CodigoErrorInstitucion, number> = { NO_AUTORIZADO: 403, DATOS_INVALIDOS: 400, NO_ENCONTRADA: 404, DUPLICADA: 409, FALLO: 500 };

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

async function leerCuerpo(solicitud: Request): Promise<Record<string, unknown> | null> {
  let texto: string;
  try { texto = await solicitud.text(); } catch { return null; }
  if (texto.length > MAXIMO_CUERPO) return null;
  let valor: unknown;
  try { valor = JSON.parse(texto); } catch { return null; }
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function entrada(cuerpo: Record<string, unknown>): EntradaInstitucion {
  return { nombre: cuerpo.nombre, ciudad: cuerpo.ciudad, departamento: cuerpo.departamento, nit: cuerpo.nit, codigoDane: cuerpo.codigoDane, estado: cuerpo.estado, observacion: cuerpo.observacion };
}

function responderError(error: unknown): NextResponse {
  if (error instanceof ErrorInstitucion) return responder({ error: error.message }, ESTADO_HTTP[error.codigo]);
  // Diagnóstico sin datos de la solicitud ni texto del proveedor: etiqueta fija y tipo de error.
  console.error('[instituciones] fallo inesperado', error instanceof Error ? error.name : typeof error);
  return responder({ error: 'No fue posible guardar la Institución Educativa.' }, 500);
}

export async function POST(solicitud: Request) {
  try {
    const usuario = await currentUser();
    if (!usuario || usuario.role !== 'ARKA_ADMIN') return responder({ error: 'No autorizado.' }, 403);
    const cuerpo = await leerCuerpo(solicitud);
    if (!cuerpo) return responder({ error: 'La solicitud no es válida.' }, 400);
    const id = await crearInstitucion(puertoInstituciones(), usuario, entrada(cuerpo));
    return responder({ ok: true, id }, 201);
  } catch (error) {
    return responderError(error);
  }
}

export async function PATCH(solicitud: Request) {
  try {
    const usuario = await currentUser();
    if (!usuario || usuario.role !== 'ARKA_ADMIN') return responder({ error: 'No autorizado.' }, 403);
    const cuerpo = await leerCuerpo(solicitud);
    if (!cuerpo) return responder({ error: 'La solicitud no es válida.' }, 400);
    const id = await actualizarInstitucion(puertoInstituciones(), usuario, cuerpo.id, entrada(cuerpo));
    return responder({ ok: true, id }, 200);
  } catch (error) {
    return responderError(error);
  }
}
