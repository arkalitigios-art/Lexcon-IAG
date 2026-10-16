import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { crearPuertoInstitucionesSupabase } from '../../src/modules/admin/institutions/institution-port-supabase';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones, type ConsultaFalsa } from './helpers/supabase-falso';

const ID = '11111111-1111-4111-8111-111111111111';
const OTRA = '22222222-2222-4222-8222-222222222222';
const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const FILA = {
  id: ID, nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '800123456-7', codigo_dane: '123001000001',
  estado_servicio: 'SUSPENDIDO', observacion_servicio: 'Mora de agosto', activo: false, creado_en: '2026-10-01T00:00:00.000Z',
};
const FILA_OTRA = { ...FILA, id: OTRA, nombre: 'IE Otra', nit: null, codigo_dane: null, estado_servicio: 'ACTIVO', observacion_servicio: null, activo: true };
const DATOS = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: '123001000001', estado: 'ENDED' as const, observacion: 'Fin de contrato' };

function tablas(institucion: unknown = FILA) {
  return {
    instituciones_educativas: (consulta: ConsultaFalsa) => (operaciones(consulta, 'maybeSingle').length ? { data: institucion } : { data: [FILA, FILA_OTRA] }),
    asignaciones_roles_usuario: () => ({ data: [{ id_usuario: 'u-1', id_institucion: ID }, { id_usuario: 'u-1', id_institucion: ID }, { id_usuario: 'u-2', id_institucion: ID }] }),
    procesos_contratacion: () => ({ data: [{ id_institucion: ID }, { id_institucion: OTRA }, { id_institucion: OTRA }] }),
  };
}

describe('adaptador Supabase de Instituciones Educativas', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('lista con el estado traducido y los conteos de cuentas y procesos', async () => {
    const falso = crearSupabaseFalso({ tablas: tablas() });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).listar()).toEqual([
      { id: ID, nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '800123456-7', codigoDane: '123001000001', estado: 'SUSPENDED_ARREARS', observacion: 'Mora de agosto', activa: false, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 2, procesos: 1 },
      { id: OTRA, nombre: 'IE Otra', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 0, procesos: 2 },
    ]);
    const [consulta] = consultasDe(falso.consultas, 'instituciones_educativas');
    expect(operaciones(consulta, 'order')).toEqual([['activo', { ascending: false }], ['nombre']]);
    const [asignaciones] = consultasDe(falso.consultas, 'asignaciones_roles_usuario');
    expect(operaciones(asignaciones, 'eq')).toEqual([['activa', true]]);
    expect(operaciones(asignaciones, 'in')).toEqual([['id_institucion', [ID, OTRA]]]);
  });

  it('obtener devuelve null sin consultar si el identificador no es un UUID', async () => {
    const falso = crearSupabaseFalso({ tablas: tablas() });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).obtener('abc')).toBeNull();
    expect(falso.consultas).toEqual([]);
  });

  it('obtener devuelve la IE con sus conteos, o null si no existe', async () => {
    expect(await crearPuertoInstitucionesSupabase(crearSupabaseFalso({ tablas: tablas() }).cliente).obtener(ID)).toMatchObject({ id: ID, estado: 'SUSPENDED_ARREARS', cuentasActivas: 2, procesos: 1 });
    expect(await crearPuertoInstitucionesSupabase(crearSupabaseFalso({ tablas: tablas(null) }).cliente).obtener(ID)).toBeNull();
  });

  it('guardar llama a guardar_institucion con el estado de la base y devuelve el identificador', async () => {
    const falso = crearSupabaseFalso({ rpc: () => ({ data: ID }) });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).guardar(ID, DATOS, ADMIN)).toBe(ID);
    expect(falso.llamadasRpc).toEqual([{
      nombre: 'guardar_institucion',
      argumentos: { p_id_actor: 'a-1', p_id: ID, p_nombre: 'IE INEM', p_ciudad: 'Montería', p_departamento: 'Córdoba', p_nit: null, p_codigo_dane: '123001000001', p_estado: 'FINALIZADO', p_observacion: 'Fin de contrato' },
    }]);
  });

  it.each<[{ code: string; message: string }, string, string]>([
    [{ code: '23505', message: 'duplicate key value violates unique constraint "instituciones_educativas_nit_key"' }, 'DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.'],
    [{ code: '23505', message: 'duplicate key value violates unique constraint "instituciones_educativas_codigo_dane_key"' }, 'DUPLICADA', 'Ya existe una Institución Educativa con ese código DANE.'],
    [{ code: '42501', message: 'ACTOR_NO_AUTORIZADO' }, 'NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.'],
    [{ code: 'P0002', message: 'INSTITUCION_NO_EXISTE' }, 'NO_ENCONTRADA', 'La Institución Educativa no existe.'],
    [{ code: '22023', message: 'DATOS_INVALIDOS' }, 'DATOS_INVALIDOS', 'Los datos de la Institución Educativa no son válidos.'],
  ])('traduce el error %o', async (error, codigo, mensaje) => {
    const falso = crearSupabaseFalso({ rpc: () => ({ error }) });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).guardar(null, DATOS, ADMIN)).rejects.toMatchObject({ codigo, message: mensaje });
  });

  it('un fallo desconocido responde genérico y registra solo el código', async () => {
    const falso = crearSupabaseFalso({ rpc: () => ({ error: { code: 'XX000', message: 'detalle interno con IE INEM' } }) });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).guardar(null, DATOS, ADMIN)).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible guardar la Institución Educativa.' });
    expect(consola).toHaveBeenCalledWith('[instituciones] guardar_institucion falló', 'XX000');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('IE INEM');
  });

  it('un error al consultar responde FALLO', async () => {
    const falso = crearSupabaseFalso({ tablas: { instituciones_educativas: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).listar()).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible consultar las Instituciones Educativas.' });
  });
});
