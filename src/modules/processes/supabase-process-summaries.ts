import type { CurrentUser } from '../../platform/auth/current-user';
import { crearClienteSupabaseServidor } from '../../platform/supabase/server';

export interface ResumenProcesoRemoto {
  id: string;
  institutionId: string;
  institutionSequence: number;
  phase: string;
  status: string;
  createdAt: string;
  institutionName: string;
  attorneyName: string | null;
  objectDescription: string | null;
}

type FilaProceso = { id: string; id_institucion: string; consecutivo_institucional: number; fase_actual: string; estado_actual: string; abierto_en: string; objeto_contractual: string | null };
type FilaInstitucion = { id: string; nombre: string };
type FilaResponsable = { id_proceso: string; id_usuario: string | null; tipo_responsabilidad: string };
type FilaPerfil = { id_usuario: string; nombre_mostrado: string };

function resultado<T>(respuesta: { data: T; error: { message: string } | null }, operacion: string): T {
  if (respuesta.error) throw new Error(`${operacion}: ${respuesta.error.message}`);
  return respuesta.data;
}

export async function listarResumenesProcesosSupabase(user: CurrentUser): Promise<ResumenProcesoRemoto[]> {
  const supabase = crearClienteSupabaseServidor();
  let consulta = supabase.from('procesos_contratacion').select('id, id_institucion, consecutivo_institucional, fase_actual, estado_actual, abierto_en, objeto_contractual').order('abierto_en', { ascending: false });

  if ((user.role === 'IE_RECTOR' || user.role === 'IE_SUPPORT' || user.role === 'IE_COMMITTEE') && user.institutionId) {
    consulta = consulta.eq('id_institucion', user.institutionId);
    if (user.role === 'IE_COMMITTEE') consulta = consulta.eq('fase_actual', 'EVALUACION');
  } else if (user.role === 'ARKA_ATTORNEY') {
    const responsables = resultado(await supabase.from('responsables_proceso').select('id_proceso').eq('id_usuario', user.id).eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true), 'No fue posible consultar las asignaciones jurídicas') as Array<Pick<FilaResponsable, 'id_proceso'>>;
    if (!responsables.length) return [];
    consulta = consulta.in('id', responsables.map((responsable) => responsable.id_proceso));
  } else if (user.role !== 'ARKA_ADMIN') {
    return [];
  }

  const procesos = resultado(await consulta, 'No fue posible consultar los procesos remotos') as FilaProceso[];
  if (!procesos.length) return [];
  const idsProcesos = procesos.map((proceso) => proceso.id);
  const idsInstituciones = [...new Set(procesos.map((proceso) => proceso.id_institucion))];
  const [instituciones, responsables] = await Promise.all([
    supabase.from('instituciones_educativas').select('id, nombre').in('id', idsInstituciones),
    supabase.from('responsables_proceso').select('id_proceso, id_usuario, tipo_responsabilidad').in('id_proceso', idsProcesos).eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true),
  ]);
  const institucionesActivas = resultado(instituciones, 'No fue posible consultar las Instituciones Educativas') as FilaInstitucion[];
  const abogadosPorProceso = resultado(responsables, 'No fue posible consultar los responsables jurídicos') as FilaResponsable[];
  const idsAbogados = [...new Set(abogadosPorProceso.flatMap((responsable) => responsable.id_usuario ? [responsable.id_usuario] : []))];
  const perfiles = idsAbogados.length
    ? resultado(await supabase.from('perfiles_usuario').select('id_usuario, nombre_mostrado').in('id_usuario', idsAbogados), 'No fue posible consultar los perfiles jurídicos') as FilaPerfil[]
    : [];
  const institucionesPorId = new Map(institucionesActivas.map((institucion) => [institucion.id, institucion.nombre]));
  const perfilesPorId = new Map(perfiles.map((perfil) => [perfil.id_usuario, perfil.nombre_mostrado]));
  const abogadosPorProcesoId = new Map(abogadosPorProceso.map((responsable) => [responsable.id_proceso, responsable.id_usuario ? perfilesPorId.get(responsable.id_usuario) ?? null : null]));

  return procesos.map((proceso) => ({
    id: proceso.id,
    institutionId: proceso.id_institucion,
    institutionSequence: proceso.consecutivo_institucional,
    phase: proceso.fase_actual,
    status: proceso.estado_actual,
    createdAt: proceso.abierto_en,
    institutionName: institucionesPorId.get(proceso.id_institucion) ?? 'Institución no disponible',
    attorneyName: abogadosPorProcesoId.get(proceso.id) ?? null,
    objectDescription: proceso.objeto_contractual,
  }));
}
