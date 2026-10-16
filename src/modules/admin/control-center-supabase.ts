import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminControlCenter, PuertoCentroControl } from './control-center';

const MENSAJE = 'No fue posible consultar el centro de control.';
/** Eventos sin actor (p. ej. la recuperación desde /setup). */
const SIN_ACTOR = 'Sistema LEXCON';
/**
 * Máximo de bloqueos listados: acota la consulta (PostgREST devuelve a lo sumo 1000 filas) y las listas de
 * identificadores de las consultas siguientes (límite de longitud de la URL). El contador de bloqueos es exacto.
 */
const LIMITE_BLOQUEOS = 100;

type FilaBloqueo = { id_proceso: string; alcance: string; motivo: string; creado_en: string };
type FilaProceso = { id: string; id_institucion: string };
type FilaInstitucion = { id: string; nombre: string };
type FilaEvento = { accion: string; id_actor: string | null; id_institucion: string | null; creado_en: string };
type FilaPerfil = { id_usuario: string; nombre_mostrado: string };

/** Solo el código de PostgreSQL/PostgREST: el mensaje del proveedor no se registra ni se muestra. */
function fallo(error: unknown): Error {
  console.error('[centro-control] consulta falló', (error as { code?: string } | null)?.code ?? 'sin-código');
  return new Error(MENSAJE);
}

function filas<T>(respuesta: { data: unknown; error: unknown }): T[] {
  if (respuesta.error) throw fallo(respuesta.error);
  return (respuesta.data ?? []) as T[];
}

async function contar(consulta: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw fallo(error);
  return count ?? 0;
}

async function nombresInstituciones(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const instituciones = filas<FilaInstitucion>(await supabase.from('instituciones_educativas').select('id,nombre').in('id', ids));
  return new Map(instituciones.map((institucion) => [institucion.id, institucion.nombre]));
}

/** Adaptador delgado con consultas separadas, como supabase-process-summaries.ts. */
export function crearPuertoCentroControlSupabase(supabase: SupabaseClient): PuertoCentroControl {
  return {
    async contadores() {
      const [processes, asignados, blocked, institutions, auditEvents] = await Promise.all([
        contar(supabase.from('procesos_contratacion').select('id', { count: 'exact', head: true })),
        contar(supabase.from('responsables_proceso').select('id', { count: 'exact', head: true }).eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true)),
        contar(supabase.from('bloqueos_proceso').select('id', { count: 'exact', head: true }).eq('activo', true)),
        contar(supabase.from('instituciones_educativas').select('id', { count: 'exact', head: true }).eq('activo', true)),
        contar(supabase.from('eventos_auditoria').select('id', { count: 'exact', head: true })),
      ]);
      // Un índice único garantiza a lo sumo un ABOGADO activo por proceso.
      return { processes, unassigned: Math.max(processes - asignados, 0), blocked, institutions, auditEvents };
    },
    async bloqueosActivos() {
      const bloqueos = filas<FilaBloqueo>(await supabase.from('bloqueos_proceso').select('id_proceso,alcance,motivo,creado_en').eq('activo', true).order('creado_en', { ascending: false }).limit(LIMITE_BLOQUEOS));
      if (!bloqueos.length) return [];
      const procesos = filas<FilaProceso>(await supabase.from('procesos_contratacion').select('id,id_institucion').in('id', [...new Set(bloqueos.map((bloqueo) => bloqueo.id_proceso))]));
      const institucionPorProceso = new Map(procesos.map((proceso) => [proceso.id, proceso.id_institucion]));
      const nombres = await nombresInstituciones(supabase, [...new Set(procesos.map((proceso) => proceso.id_institucion))]);
      return bloqueos.map((bloqueo): AdminControlCenter['blocks'][number] => ({
        processId: bloqueo.id_proceso,
        institutionName: nombres.get(institucionPorProceso.get(bloqueo.id_proceso) ?? '') ?? 'Institución no disponible',
        scope: bloqueo.alcance,
        reason: bloqueo.motivo,
        createdAt: bloqueo.creado_en,
      }));
    },
    async ultimosEventos(limite) {
      const eventos = filas<FilaEvento>(await supabase.from('eventos_auditoria').select('accion,id_actor,id_institucion,creado_en').order('creado_en', { ascending: false }).limit(limite));
      if (!eventos.length) return [];
      const idsActores = [...new Set(eventos.flatMap((evento) => (evento.id_actor ? [evento.id_actor] : [])))];
      const perfiles = idsActores.length ? filas<FilaPerfil>(await supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado').in('id_usuario', idsActores)) : [];
      const nombresActores = new Map(perfiles.map((perfil) => [perfil.id_usuario, perfil.nombre_mostrado]));
      const nombres = await nombresInstituciones(supabase, [...new Set(eventos.flatMap((evento) => (evento.id_institucion ? [evento.id_institucion] : [])))]);
      return eventos.map((evento): AdminControlCenter['events'][number] => ({
        action: evento.accion,
        actorName: (evento.id_actor ? nombresActores.get(evento.id_actor) : undefined) ?? SIN_ACTOR,
        institutionName: evento.id_institucion ? nombres.get(evento.id_institucion) ?? null : null,
        createdAt: evento.creado_en,
      }));
    },
  };
}
