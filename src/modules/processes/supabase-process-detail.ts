import type { CurrentUser } from '../../platform/auth/current-user';
import { crearClienteSupabaseServidor } from '../../platform/supabase/server';
import type { ProcessDetail } from './process-queries';
import { listarResumenesProcesosSupabase } from './supabase-process-summaries';

type FilaProceso = {
  id: string;
  id_institucion: string;
  abierto_por: string;
  fase_actual: string;
  estado_actual: string;
  abierto_en: string;
  objeto_contractual: string | null;
};
type FilaInstitucion = { id: string; nombre: string; ciudad: string };
type FilaDocumento = { id: string; tipo_documento: string; creado_en: string };
type FilaArchivo = { id: string; id_version_documento: string; ruta_objeto: string; nombre_original: string; tipo_mime: string; tamano_bytes: number; creado_en: string };
type FilaVersion = { id: string; id_documento: string };
type FilaCotizacion = { id: string; id_version_documento: string | null; nombre_proveedor: string | null };
type FilaHistorial = { fase_destino: string; accion: string; id_actor: string | null; observacion: string | null; creado_en: string };
type FilaPerfil = { id_usuario: string; nombre_mostrado: string };
type FilaBloqueo = { motivo: string };

function datos<T>(respuesta: { data: T; error: { message: string } | null }, operacion: string): T {
  if (respuesta.error) throw new Error(`${operacion}: ${respuesta.error.message}`);
  return respuesta.data;
}

function perfilVacio() {
  return { objectDescription: '', unspscCodes: '', demandAnalysis: '', supplyAnalysis: '', taxBasis: '' };
}

/** La autorización se resuelve antes de leer cualquier dato con service_role. */
export async function obtenerDetalleProcesoSupabase(user: CurrentUser, idProceso: string): Promise<ProcessDetail | null> {
  const resumen = (await listarResumenesProcesosSupabase(user)).find((proceso) => proceso.id === idProceso);
  if (!resumen) return null;

  const supabase = crearClienteSupabaseServidor();
  const proceso = datos(await supabase
    .from('procesos_contratacion')
    .select('id, id_institucion, abierto_por, fase_actual, estado_actual, abierto_en, objeto_contractual')
    .eq('id', idProceso)
    .maybeSingle(), 'No fue posible consultar el expediente remoto') as FilaProceso | null;
  if (!proceso) return null;

  const [institucionRespuesta, documentosRespuesta, historialRespuesta, bloqueoRespuesta] = await Promise.all([
    supabase.from('instituciones_educativas').select('id, nombre, ciudad').eq('id', proceso.id_institucion).maybeSingle(),
    supabase.from('documentos_expediente').select('id, tipo_documento, creado_en').eq('id_proceso', idProceso).order('creado_en', { ascending: true }),
    supabase.from('historial_fases_proceso').select('fase_destino, accion, id_actor, observacion, creado_en').eq('id_proceso', idProceso).order('creado_en', { ascending: true }),
    supabase.from('bloqueos_proceso').select('motivo').eq('id_proceso', idProceso).eq('activo', true).order('creado_en', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const institucion = datos(institucionRespuesta, 'No fue posible consultar la Institución Educativa') as FilaInstitucion | null;
  const documentos = datos(documentosRespuesta, 'No fue posible consultar los documentos remotos') as FilaDocumento[];
  const historial = datos(historialRespuesta, 'No fue posible consultar la trazabilidad remota') as FilaHistorial[];
  const bloqueo = datos(bloqueoRespuesta, 'No fue posible consultar los bloqueos remotos') as FilaBloqueo | null;
  if (!institucion) return null;

  const idsDocumentos = documentos.map((documento) => documento.id);
  const versiones = idsDocumentos.length
    ? datos(await supabase.from('versiones_documento').select('id, id_documento').in('id_documento', idsDocumentos), 'No fue posible consultar las versiones documentales') as FilaVersion[]
    : [];
  const idsVersiones = versiones.map((version) => version.id);
  const [archivos, cotizaciones] = idsVersiones.length
    ? await Promise.all([
      supabase.from('archivos_documento').select('id, id_version_documento, ruta_objeto, nombre_original, tipo_mime, tamano_bytes, creado_en').in('id_version_documento', idsVersiones).eq('estado_archivo', 'DISPONIBLE').order('creado_en', { ascending: true }),
      supabase.from('cotizaciones_mercado').select('id, id_version_documento, nombre_proveedor').eq('id_proceso', idProceso),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const archivosDisponibles = datos(archivos, 'No fue posible consultar los archivos privados') as FilaArchivo[];
  const cotizacionesMercado = datos(cotizaciones, 'No fue posible consultar las cotizaciones remotas') as FilaCotizacion[];

  const idsPerfiles = [...new Set([proceso.abierto_por, ...historial.flatMap((evento) => evento.id_actor ? [evento.id_actor] : [])])];
  const perfiles = idsPerfiles.length
    ? datos(await supabase.from('perfiles_usuario').select('id_usuario, nombre_mostrado').in('id_usuario', idsPerfiles), 'No fue posible consultar los perfiles de trazabilidad') as FilaPerfil[]
    : [];
  const perfilesPorId = new Map(perfiles.map((perfil) => [perfil.id_usuario, perfil.nombre_mostrado]));
  const versionesPorId = new Map(versiones.map((version) => [version.id, version]));
  const documentosPorId = new Map(documentos.map((documento) => [documento.id, documento]));
  const cotizacionPorVersion = new Map(cotizacionesMercado.flatMap((cotizacion) => cotizacion.id_version_documento ? [[cotizacion.id_version_documento, cotizacion] as const] : []));

  const documentosExpediente = archivosDisponibles.flatMap((archivo) => {
    const version = versionesPorId.get(archivo.id_version_documento);
    const documento = version ? documentosPorId.get(version.id_documento) : undefined;
    return documento ? [{
      fileId: archivo.id,
      kind: documento.tipo_documento,
      originalName: archivo.nombre_original,
      mimeType: archivo.tipo_mime,
      sizeBytes: archivo.tamano_bytes,
      createdAt: archivo.creado_en,
    }] : [];
  });

  return {
    ...resumen,
    phase: proceso.fase_actual,
    status: proceso.estado_actual,
    createdAt: proceso.abierto_en,
    institutionId: proceso.id_institucion,
    institutionName: institucion.nombre,
    institutionCity: institucion.ciudad,
    responsibleName: perfilesPorId.get(proceso.abierto_por) ?? 'Responsable institucional',
    objectDescription: proceso.objeto_contractual,
    blockReason: bloqueo?.motivo ?? null,
    persistence: 'SUPABASE',
    quotations: archivosDisponibles.flatMap((archivo) => {
      const cotizacion = cotizacionPorVersion.get(archivo.id_version_documento);
      return cotizacion ? [{
        quoteId: cotizacion.id,
        fileId: archivo.id,
        originalName: archivo.nombre_original,
        supplierName: cotizacion.nombre_proveedor,
        mimeType: archivo.tipo_mime,
        sizeBytes: archivo.tamano_bytes,
        createdAt: archivo.creado_en,
      }] : [];
    }),
    quotationTotals: [],
    approvalDelivery: null,
    documents: documentosExpediente,
    evaluationTeam: { evaluators: [], supervisor: null },
    selectionDecision: null,
    actions: historial.map((evento) => ({
      phase: evento.fase_destino,
      action: evento.accion,
      actorName: evento.id_actor ? perfilesPorId.get(evento.id_actor) ?? 'Usuario no disponible' : 'Sistema',
      note: evento.observacion,
      createdAt: evento.creado_en,
    })),
    drafts: [],
    marketStudy: { regulationName: null, regulationVersion: null, profile: perfilVacio(), comparisons: [] },
  };
}

export async function obtenerArchivoProcesoSupabase(user: CurrentUser, idProceso: string, idArchivo: string): Promise<{ ruta: string; nombre: string; mime: string } | null> {
  const detalle = await obtenerDetalleProcesoSupabase(user, idProceso);
  const archivo = detalle?.documents.find((documento) => documento.fileId === idArchivo);
  if (!archivo) return null;
  const respuesta = await crearClienteSupabaseServidor()
    .from('archivos_documento')
    .select('ruta_objeto, nombre_original, tipo_mime')
    .eq('id', idArchivo)
    .maybeSingle();
  const fila = datos(respuesta, 'No fue posible consultar el archivo privado') as { ruta_objeto: string; nombre_original: string; tipo_mime: string } | null;
  return fila ? { ruta: fila.ruta_objeto, nombre: fila.nombre_original, mime: fila.tipo_mime } : null;
}
