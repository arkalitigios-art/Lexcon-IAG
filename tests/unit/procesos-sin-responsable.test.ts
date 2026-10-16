import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ cliente: null as unknown, listarGeneral: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => true, crearClienteSupabaseServidor: () => mocks.cliente }));
vi.mock('@/modules/processes/supabase-process-summaries', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../src/modules/processes/supabase-process-summaries')>()),
  listarResumenesProcesosSupabase: (...argumentos: unknown[]) => mocks.listarGeneral(...argumentos),
}));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse con Supabase.'); } }));

import { listUnassignedProcesses } from '../../src/modules/processes/process-queries';
import { listarProcesosSinResponsableSupabase } from '../../src/modules/processes/supabase-process-summaries';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const PROCESOS = [
  { id: 'p-1', id_institucion: 'ie-1', consecutivo_institucional: 1, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-03T00:00:00.000Z', objeto_contractual: 'Suministro de papelería' },
  { id: 'p-2', id_institucion: 'ie-2', consecutivo_institucional: 1, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-02T00:00:00.000Z', objeto_contractual: null },
  { id: 'p-3', id_institucion: 'ie-1', consecutivo_institucional: 2, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-01T00:00:00.000Z', objeto_contractual: null },
];

function falsoCon(responsables: Array<{ id_proceso: string }>) {
  return crearSupabaseFalso({
    tablas: {
      procesos_contratacion: () => ({ data: PROCESOS }),
      responsables_proceso: () => ({ data: responsables }),
      instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
    },
  });
}

describe('procesos sin responsable jurídico (Supabase)', () => {
  beforeEach(() => {
    mocks.listarGeneral.mockReset();
  });

  it('devuelve solo los procesos sin ABOGADO activo, con su institución', async () => {
    const falso = falsoCon([{ id_proceso: 'p-2' }]);
    const procesos = await listarProcesosSinResponsableSupabase(falso.cliente);
    expect(procesos).toEqual([
      { id: 'p-1', institutionId: 'ie-1', institutionSequence: 1, phase: 'MERCADO', status: 'PENDIENTE_ACTUACION', createdAt: '2026-10-03T00:00:00.000Z', institutionName: 'IE INEM', attorneyName: null, objectDescription: 'Suministro de papelería' },
      { id: 'p-3', institutionId: 'ie-1', institutionSequence: 2, phase: 'MERCADO', status: 'PENDIENTE_ACTUACION', createdAt: '2026-10-01T00:00:00.000Z', institutionName: 'IE INEM', attorneyName: null, objectDescription: null },
    ]);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
    const [instituciones] = consultasDe(falso.consultas, 'instituciones_educativas');
    expect(operaciones(instituciones, 'in')).toEqual([['id', ['ie-1']]]);
  });

  it('si todos tienen responsable no consulta instituciones', async () => {
    const falso = falsoCon(PROCESOS.map((proceso) => ({ id_proceso: proceso.id })));
    expect(await listarProcesosSinResponsableSupabase(falso.cliente)).toEqual([]);
    expect(consultasDe(falso.consultas, 'instituciones_educativas')).toEqual([]);
  });

  it('listUnassignedProcesses usa la consulta propia y no el listado general con un usuario vacío', async () => {
    mocks.cliente = falsoCon([]).cliente;
    expect((await listUnassignedProcesses()).map((proceso) => proceso.id)).toEqual(['p-1', 'p-2', 'p-3']);
    expect(mocks.listarGeneral).not.toHaveBeenCalled();
  });

  it('un error de consulta se informa sin datos', async () => {
    const falso = crearSupabaseFalso({ tablas: { procesos_contratacion: () => ({ error: { message: 'fallo' } }) } });
    await expect(listarProcesosSinResponsableSupabase(falso.cliente)).rejects.toThrow(/No fue posible consultar los procesos remotos/);
  });
});
