import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), notificar: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({
  supabaseConfigurado: () => true,
  crearClienteSupabaseServidor: () => ({ rpc: (...argumentos: unknown[]) => mocks.rpc(...argumentos) }),
}));
vi.mock('@/modules/automation/iag-drafts', () => ({ notifyAssignedAttorney: (...argumentos: unknown[]) => mocks.notificar(...argumentos) }));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse con Supabase.'); } }));

import { assignAttorneyRemote } from '../../src/modules/assignments/attorney-assignment';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };

describe('assignAttorneyRemote con Supabase', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockReset();
    mocks.notificar.mockReset();
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('llama a asignar_abogado_proceso y no ejecuta el aviso SQLite', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await assignAttorneyRemote(ADMIN, 'p-1', 'u-9');
    expect(mocks.rpc).toHaveBeenCalledWith('asignar_abogado_proceso', { p_id_proceso: 'p-1', p_id_abogado: 'u-9', p_id_actor: 'a-1' });
    expect(mocks.notificar).not.toHaveBeenCalled();
  });

  it('un motivo conocido de la función se muestra y se registra con su código', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'P0001', message: 'Abogado no válido' } });
    await expect(assignAttorneyRemote(ADMIN, 'p-1', 'u-9')).rejects.toThrow('El abogado seleccionado no tiene un acceso activo de Abogado Lexcon.');
    expect(consola).toHaveBeenCalledWith('[asignacion] asignar_abogado_proceso falló', 'P0001', 'Abogado no válido');
  });

  it.each(['duplicate key value violates unique constraint "responsable_abogado_activo_unico"', 'constructor'])('un motivo desconocido responde genérico sin registrar el mensaje (%s)', async (mensaje) => {
    mocks.rpc.mockResolvedValue({ error: { code: '23505', message: mensaje } });
    await expect(assignAttorneyRemote(ADMIN, 'p-1', 'u-9')).rejects.toThrow('No fue posible registrar la asignación jurídica.');
    expect(consola).toHaveBeenCalledWith('[asignacion] asignar_abogado_proceso falló', '23505', 'motivo-no-reconocido');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('duplicate');
  });

  it('sin la capacidad ATTORNEY_ASSIGN no llama a la base', async () => {
    await expect(assignAttorneyRemote(ABOGADO, 'p-1', 'u-9')).rejects.toThrow('No tienes autorización para asignar abogado.');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
