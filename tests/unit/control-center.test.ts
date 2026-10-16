import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse en esta prueba.'); } }));

import { LIMITE_EVENTOS, obtenerCentroControl, type PuertoCentroControl } from '../../src/modules/admin/control-center';
import { crearPuertoCentroControlSupabase } from '../../src/modules/admin/control-center-supabase';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
const CONTADORES = { processes: 5, unassigned: 2, blocked: 2, institutions: 4, auditEvents: 9 };

describe('centro de control', () => {
  it('solo el Administrador lo consulta y pide los últimos eventos con el límite acordado', async () => {
    const puerto = { contadores: vi.fn(async () => CONTADORES), bloqueosActivos: vi.fn(async () => []), ultimosEventos: vi.fn(async () => []) } satisfies PuertoCentroControl;
    await expect(obtenerCentroControl(puerto, ABOGADO)).rejects.toThrow('No tienes autorización para consultar el centro de control.');
    expect(puerto.contadores).not.toHaveBeenCalled();
    expect(await obtenerCentroControl(puerto, ADMIN)).toEqual({ counts: CONTADORES, blocks: [], events: [] });
    expect(puerto.ultimosEventos).toHaveBeenCalledWith(LIMITE_EVENTOS);
    expect(LIMITE_EVENTOS).toBe(8);
  });
});

describe('adaptador Supabase del centro de control', () => {
  it('cuenta procesos, sin responsable, bloqueos, IE activas y eventos', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        procesos_contratacion: () => ({ count: 5 }),
        responsables_proceso: () => ({ count: 3 }),
        bloqueos_proceso: () => ({ count: 2 }),
        instituciones_educativas: () => ({ count: 4 }),
        eventos_auditoria: () => ({ count: 9 }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).contadores()).toEqual(CONTADORES);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'select')).toEqual([['id', { count: 'exact', head: true }]]);
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
    expect(operaciones(consultasDe(falso.consultas, 'instituciones_educativas')[0], 'eq')).toEqual([['activo', true]]);
  });

  it('lista los bloqueos activos con la institución del proceso', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        bloqueos_proceso: () => ({ data: [{ id_proceso: 'p-1', alcance: 'MERCADO', motivo: 'No existe reglamento institucional aplicable.', creado_en: '2026-10-10T00:00:00.000Z' }] }),
        procesos_contratacion: () => ({ data: [{ id: 'p-1', id_institucion: 'ie-1' }] }),
        instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).bloqueosActivos()).toEqual([
      { processId: 'p-1', institutionName: 'IE INEM', scope: 'MERCADO', reason: 'No existe reglamento institucional aplicable.', createdAt: '2026-10-10T00:00:00.000Z' },
    ]);
    const [bloqueos] = consultasDe(falso.consultas, 'bloqueos_proceso');
    expect(operaciones(bloqueos, 'eq')).toEqual([['activo', true]]);
    expect(operaciones(bloqueos, 'order')).toEqual([['creado_en', { ascending: false }]]);
    expect(operaciones(bloqueos, 'limit')).toEqual([[100]]);
  });

  it('sin bloqueos no consulta procesos', async () => {
    const falso = crearSupabaseFalso({ tablas: { bloqueos_proceso: () => ({ data: [] }) } });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).bloqueosActivos()).toEqual([]);
    expect(falso.consultas.map((consulta) => consulta.tabla)).toEqual(['bloqueos_proceso']);
  });

  it('lista los últimos eventos con el nombre de quien actuó', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        eventos_auditoria: () => ({ data: [
          { accion: 'ABOGADO_ASIGNADO', id_actor: 'u-1', id_institucion: 'ie-1', creado_en: '2026-10-12T00:00:00.000Z' },
          { accion: 'ADMIN_RECOVERED', id_actor: null, id_institucion: null, creado_en: '2026-10-11T00:00:00.000Z' },
        ] }),
        perfiles_usuario: () => ({ data: [{ id_usuario: 'u-1', nombre_mostrado: 'Ana' }] }),
        instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).ultimosEventos(8)).toEqual([
      { action: 'ABOGADO_ASIGNADO', actorName: 'Ana', institutionName: 'IE INEM', createdAt: '2026-10-12T00:00:00.000Z' },
      { action: 'ADMIN_RECOVERED', actorName: 'Sistema LEXCON', institutionName: null, createdAt: '2026-10-11T00:00:00.000Z' },
    ]);
    const [eventos] = consultasDe(falso.consultas, 'eventos_auditoria');
    expect(operaciones(eventos, 'order')).toEqual([['creado_en', { ascending: false }]]);
    expect(operaciones(eventos, 'limit')).toEqual([[8]]);
  });

  it('un error de consulta responde con un mensaje genérico', async () => {
    const falso = crearSupabaseFalso({ tablas: { eventos_auditoria: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoCentroControlSupabase(falso.cliente).ultimosEventos(8)).rejects.toThrow('No fue posible consultar el centro de control.');
  });
});
