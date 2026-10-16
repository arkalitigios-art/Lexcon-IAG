import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), asignar: vi.fn(), abogados: vi.fn(), procesos: vi.fn() }));

vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/modules/assignments/attorney-assignment', () => ({
  assignAttorneyRemote: (...argumentos: unknown[]) => mocks.asignar(...argumentos),
  listAvailableAttorneys: () => mocks.abogados(),
}));
vi.mock('@/modules/processes/process-queries', () => ({ listUnassignedProcesses: () => mocks.procesos() }));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse en esta prueba.'); } }));

import { GET, POST } from '../../src/app/api/admin/attorney-assignments/route';

const ADMIN = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const PROCESO = '0b0b5f0e-5d0f-4a52-9b0e-6a6f9a4f1c01';
const ABOGADO = '7c1d3a52-8f3e-4f0a-a1b2-3c4d5e6f7a8b';

function solicitud(cuerpo: unknown, crudo?: string): Request {
  return new Request('http://localhost/api/admin/attorney-assignments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: crudo ?? JSON.stringify(cuerpo) });
}

describe('/api/admin/attorney-assignments', () => {
  beforeEach(() => {
    mocks.currentUser.mockReset();
    mocks.currentUser.mockResolvedValue(ADMIN);
    mocks.asignar.mockReset();
    mocks.asignar.mockResolvedValue(undefined);
    mocks.abogados.mockReset();
    mocks.abogados.mockResolvedValue([]);
    mocks.procesos.mockReset();
    mocks.procesos.mockResolvedValue([]);
  });

  it('GET responde sin caché', async () => {
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
  });

  it('GET sin ser Administrador responde 403 sin caché', async () => {
    mocks.currentUser.mockResolvedValue({ ...ADMIN, role: 'ARKA_ATTORNEY' });
    const respuesta = await GET();
    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
  });

  it('POST con identificadores válidos asigna', async () => {
    const respuesta = await POST(solicitud({ processId: PROCESO, attorneyId: ABOGADO }));
    expect(respuesta.status).toBe(200);
    expect(mocks.asignar).toHaveBeenCalledWith(ADMIN, PROCESO, ABOGADO);
  });

  it.each([
    ['sin identificadores', {}],
    ['identificadores numéricos', { processId: 1, attorneyId: 2 }],
    ['identificadores que no son UUID', { processId: 'p-1', attorneyId: ABOGADO }],
    ['abogado que no es UUID', { processId: PROCESO, attorneyId: 'u-9' }],
    ['arreglos', { processId: [PROCESO], attorneyId: [ABOGADO] }],
  ])('POST %s responde 400 sin llamar a la base', async (_nombre, cuerpo) => {
    const respuesta = await POST(solicitud(cuerpo));
    expect(respuesta.status).toBe(400);
    expect(((await respuesta.json()) as { error: string }).error).toBe('Selecciona un expediente y un abogado válidos.');
    expect(mocks.asignar).not.toHaveBeenCalled();
  });

  it('POST con JSON inválido responde un mensaje en español', async () => {
    const respuesta = await POST(solicitud(null, '{no es json'));
    expect(respuesta.status).toBe(400);
    expect(((await respuesta.json()) as { error: string }).error).toBe('La solicitud no tiene un formato válido.');
    expect(mocks.asignar).not.toHaveBeenCalled();
  });

  it('POST con cuerpo JSON que no es un objeto responde 400', async () => {
    const respuesta = await POST(solicitud(null, 'null'));
    expect(respuesta.status).toBe(400);
    expect(mocks.asignar).not.toHaveBeenCalled();
  });

  it('POST sin ser Administrador responde 403 sin llamar a la base', async () => {
    mocks.currentUser.mockResolvedValue({ ...ADMIN, role: 'ARKA_ATTORNEY' });
    const respuesta = await POST(solicitud({ processId: PROCESO, attorneyId: ABOGADO }));
    expect(respuesta.status).toBe(403);
    expect(mocks.asignar).not.toHaveBeenCalled();
  });

  it('un error de la asignación se devuelve como 400 con su mensaje', async () => {
    mocks.asignar.mockRejectedValue(new Error('El proceso seleccionado no existe.'));
    const respuesta = await POST(solicitud({ processId: PROCESO, attorneyId: ABOGADO }));
    expect(respuesta.status).toBe(400);
    expect(((await respuesta.json()) as { error: string }).error).toBe('El proceso seleccionado no existe.');
  });
});
