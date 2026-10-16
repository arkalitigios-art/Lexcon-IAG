import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { PuertoInstituciones } from '../../src/modules/admin/institutions/institution-service';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  puerto: { listar: vi.fn(), obtener: vi.fn(), guardar: vi.fn() } satisfies Record<keyof PuertoInstituciones, unknown>,
}));

vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/modules/admin/institutions/institution-runtime', () => ({ puertoInstituciones: () => mocks.puerto }));
// El código anterior a esta tarea usaba SQLite: la prueba que falla nunca debe escribir en data/lexcon.sqlite.
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse en esta prueba.'); } }));

import * as ruta from '../../src/app/api/admin/institutions/route';
import { ErrorInstitucion } from '../../src/modules/admin/institutions/institution-service';

const ADMIN = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const CUERPO = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '', codigoDane: '', estado: 'ACTIVE', observacion: '' };
const DATOS = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null };
const EXISTENTE = { id: 'ie-1', nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 0, procesos: 0 };

function solicitud(metodo: 'POST' | 'PATCH', cuerpo: unknown, crudo?: string): Request {
  return new Request('http://localhost/api/admin/institutions', { method: metodo, headers: { 'content-type': 'application/json' }, body: crudo ?? JSON.stringify(cuerpo) });
}

describe('/api/admin/institutions', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.currentUser.mockReset();
    mocks.currentUser.mockResolvedValue(ADMIN);
    for (const funcion of Object.values(mocks.puerto)) funcion.mockReset();
    mocks.puerto.obtener.mockResolvedValue(EXISTENTE);
    mocks.puerto.guardar.mockImplementation(async (id: string | null) => id ?? 'ie-nueva');
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('ya no ofrece DELETE: el servicio se finaliza editando el estado', () => {
    expect('DELETE' in ruta).toBe(false);
  });

  it.each([null, { ...ADMIN, role: 'ARKA_ATTORNEY' }])('responde 403 sin Administrador (%o)', async (usuario) => {
    mocks.currentUser.mockResolvedValue(usuario);
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it.each(['no es json', 'null', '[]', '7'])('responde 400 si el cuerpo no es un objeto JSON (%s)', async (crudo) => {
    const respuesta = await ruta.POST(solicitud('POST', null, crudo));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'La solicitud no es válida.' });
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it('POST crea la IE y responde 201 con su identificador', async () => {
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(201);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(await respuesta.json()).toEqual({ ok: true, id: 'ie-nueva' });
    expect(mocks.puerto.guardar).toHaveBeenCalledWith(null, DATOS, ADMIN);
  });

  it('POST con datos inválidos responde 400 con el mensaje del servicio', async () => {
    const respuesta = await ruta.POST(solicitud('POST', { ...CUERPO, departamento: '' }));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'El departamento debe tener entre 2 y 100 caracteres.' });
  });

  it('un NIT duplicado responde 409 con un mensaje claro', async () => {
    mocks.puerto.guardar.mockRejectedValue(new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.'));
    const respuesta = await ruta.POST(solicitud('POST', { ...CUERPO, nit: '800123456-7' }));
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: 'Ya existe una Institución Educativa con ese NIT.' });
  });

  it('PATCH responde 404 si la IE no existe', async () => {
    mocks.puerto.obtener.mockResolvedValue(null);
    const respuesta = await ruta.PATCH(solicitud('PATCH', { ...CUERPO, id: 'ie-9' }));
    expect(respuesta.status).toBe(404);
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it('PATCH actualiza y responde 200', async () => {
    const respuesta = await ruta.PATCH(solicitud('PATCH', { ...CUERPO, id: 'ie-1', estado: 'SUSPENDED_ARREARS' }));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, id: 'ie-1' });
    expect(mocks.puerto.guardar).toHaveBeenCalledWith('ie-1', { ...DATOS, estado: 'SUSPENDED_ARREARS' }, ADMIN);
  });

  it('un error inesperado responde 500 genérico y registra solo el tipo', async () => {
    mocks.puerto.guardar.mockRejectedValue(new TypeError('detalle con datos'));
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: 'No fue posible guardar la Institución Educativa.' });
    expect(consola).toHaveBeenCalledWith('[instituciones] fallo inesperado', 'TypeError');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('detalle');
  });
});
