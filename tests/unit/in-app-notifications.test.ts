import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  servidorConfigurado: vi.fn(),
  getSqlite: vi.fn(),
  prepare: vi.fn(),
  all: vi.fn(),
}));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.servidorConfigurado() }));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => mocks.getSqlite() }));

async function cargar() {
  return import('../../src/modules/processes/in-app-notifications');
}

describe('notificaciones internas del usuario', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.servidorConfigurado.mockReset();
    mocks.getSqlite.mockReset();
    mocks.prepare.mockReset();
    mocks.all.mockReset();
    mocks.all.mockReturnValue([{ id: 'n-1', processId: 'p-1', body: 'Borrador listo', createdAt: '2026-10-01T10:00:00Z' }]);
    mocks.prepare.mockReturnValue({ all: mocks.all });
    mocks.getSqlite.mockReturnValue({ prepare: mocks.prepare });
  });

  it('con Supabase activo no consulta SQLite y devuelve una lista vacía', async () => {
    // En producción no hay base SQLite: consultarla rompía los paneles del Abogado y de la IE con un error de servidor.
    mocks.servidorConfigurado.mockReturnValue(true);
    const { listInAppNotifications } = await cargar();
    expect(listInAppNotifications('u-1')).toEqual([]);
    expect(mocks.getSqlite).not.toHaveBeenCalled();
  });

  it('en modo local consulta las alertas abiertas del usuario, de las más recientes a las más antiguas', async () => {
    mocks.servidorConfigurado.mockReturnValue(false);
    const { listInAppNotifications } = await cargar();
    const filas = listInAppNotifications('u-1');
    expect(filas).toEqual([{ id: 'n-1', processId: 'p-1', body: 'Borrador listo', createdAt: '2026-10-01T10:00:00Z' }]);
    const sql = String(mocks.prepare.mock.calls[0][0]);
    expect(sql).toMatch(/FROM alerts/i);
    expect(sql).toMatch(/user_id = \?/);
    expect(sql).toMatch(/channel = 'IN_APP'/);
    expect(sql).toMatch(/status = 'OPEN'/);
    expect(sql).toMatch(/ORDER BY created_at DESC/i);
    expect(mocks.all).toHaveBeenCalledWith('u-1', 6);
  });

  it('admite otro límite de resultados', async () => {
    mocks.servidorConfigurado.mockReturnValue(false);
    const { listInAppNotifications } = await cargar();
    listInAppNotifications('u-2', 3);
    expect(mocks.all).toHaveBeenCalledWith('u-2', 3);
  });
});
