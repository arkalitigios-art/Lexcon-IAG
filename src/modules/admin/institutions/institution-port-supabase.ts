import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorInstitucion, type EstadoServicio, type InstitucionAdministrada, type PuertoInstituciones } from './institution-service';

type EstadoBase = 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO';

const ESTADO_A_BASE: Record<EstadoServicio, EstadoBase> = { ACTIVE: 'ACTIVO', SUSPENDED_ARREARS: 'SUSPENDIDO', ENDED: 'FINALIZADO' };
const BASE_A_ESTADO: Record<EstadoBase, EstadoServicio> = { ACTIVO: 'ACTIVE', SUSPENDIDO: 'SUSPENDED_ARREARS', FINALIZADO: 'ENDED' };
const COLUMNAS = 'id,nombre,ciudad,departamento,nit,codigo_dane,estado_servicio,observacion_servicio,activo,creado_en';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAJE_CONSULTA = 'No fue posible consultar las Instituciones Educativas.';
const MENSAJE_GUARDADO = 'No fue posible guardar la Institución Educativa.';

interface FilaInstitucion {
  id: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  nit: string | null;
  codigo_dane: string | null;
  estado_servicio: EstadoBase;
  observacion_servicio: string | null;
  activo: boolean;
  creado_en: string;
}

interface Conteos { cuentas: Map<string, number>; procesos: Map<string, number> }

/** Cuentas (personas distintas con asignación activa) y procesos por IE. Se cuentan en la aplicación: escala del piloto. */
async function contar(supabase: SupabaseClient, ids: string[]): Promise<Conteos> {
  if (!ids.length) return { cuentas: new Map(), procesos: new Map() };
  const [asignaciones, procesos] = await Promise.all([
    supabase.from('asignaciones_roles_usuario').select('id_usuario,id_institucion').eq('activa', true).in('id_institucion', ids),
    supabase.from('procesos_contratacion').select('id_institucion').in('id_institucion', ids),
  ]);
  if (asignaciones.error || procesos.error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
  const personas = new Map<string, Set<string>>();
  for (const fila of (asignaciones.data ?? []) as unknown as Array<{ id_usuario: string; id_institucion: string }>) {
    const conjunto = personas.get(fila.id_institucion) ?? new Set<string>();
    conjunto.add(fila.id_usuario);
    personas.set(fila.id_institucion, conjunto);
  }
  const totalProcesos = new Map<string, number>();
  for (const fila of (procesos.data ?? []) as unknown as Array<{ id_institucion: string }>) {
    totalProcesos.set(fila.id_institucion, (totalProcesos.get(fila.id_institucion) ?? 0) + 1);
  }
  return { cuentas: new Map([...personas].map(([id, conjunto]) => [id, conjunto.size])), procesos: totalProcesos };
}

function mapear(fila: FilaInstitucion, conteos: Conteos): InstitucionAdministrada {
  return {
    id: fila.id,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    departamento: fila.departamento,
    nit: fila.nit,
    codigoDane: fila.codigo_dane,
    estado: BASE_A_ESTADO[fila.estado_servicio] ?? 'ENDED',
    observacion: fila.observacion_servicio,
    activa: fila.activo,
    creadaEn: fila.creado_en,
    cuentasActivas: conteos.cuentas.get(fila.id) ?? 0,
    procesos: conteos.procesos.get(fila.id) ?? 0,
  };
}

/** Traduce los errores de guardar_institucion; solo se registra el código, nunca el mensaje del proveedor. */
function errorDeGuardado(error: { code?: string; message?: string }): ErrorInstitucion {
  const mensaje = error.message ?? '';
  if (error.code === '23505') {
    if (mensaje.includes('_codigo_dane_key')) return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese código DANE.');
    if (mensaje.includes('_nit_key')) return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.');
    return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con esos datos.');
  }
  if (error.code === '42501') return new ErrorInstitucion('NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.');
  if (error.code === 'P0002') return new ErrorInstitucion('NO_ENCONTRADA', 'La Institución Educativa no existe.');
  if (error.code === '22023') return new ErrorInstitucion('DATOS_INVALIDOS', 'Los datos de la Institución Educativa no son válidos.');
  console.error('[instituciones] guardar_institucion falló', error.code || 'sin-código');
  return new ErrorInstitucion('FALLO', MENSAJE_GUARDADO);
}

/** Adaptador delgado: las reglas están en institution-service.ts y la atomicidad en guardar_institucion. */
export function crearPuertoInstitucionesSupabase(supabase: SupabaseClient): PuertoInstituciones {
  return {
    async listar() {
      const { data, error } = await supabase.from('instituciones_educativas').select(COLUMNAS).order('activo', { ascending: false }).order('nombre');
      if (error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
      const filas = (data ?? []) as unknown as FilaInstitucion[];
      const conteos = await contar(supabase, filas.map((fila) => fila.id));
      return filas.map((fila) => mapear(fila, conteos));
    },
    async obtener(id) {
      // Un identificador que no es UUID haría fallar a PostgREST (22P02): para la pantalla es una IE inexistente.
      if (!UUID.test(id)) return null;
      const { data, error } = await supabase.from('instituciones_educativas').select(COLUMNAS).eq('id', id).maybeSingle();
      if (error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
      if (!data) return null;
      const fila = data as unknown as FilaInstitucion;
      return mapear(fila, await contar(supabase, [fila.id]));
    },
    async guardar(id, datos, actor) {
      const { data, error } = await supabase.rpc('guardar_institucion', {
        p_id_actor: actor.id,
        p_id: id,
        p_nombre: datos.nombre,
        p_ciudad: datos.ciudad,
        p_departamento: datos.departamento,
        p_nit: datos.nit,
        p_codigo_dane: datos.codigoDane,
        p_estado: ESTADO_A_BASE[datos.estado],
        p_observacion: datos.observacion,
      });
      if (error) throw errorDeGuardado(error);
      if (typeof data !== 'string') throw new ErrorInstitucion('FALLO', MENSAJE_GUARDADO);
      return data;
    },
  };
}
