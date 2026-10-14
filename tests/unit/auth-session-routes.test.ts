import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  publicoConfigurado: vi.fn(),
  signOut: vi.fn(),
  currentUser: vi.fn(),
  deleteSession: vi.fn(),
  cookieLocal: vi.fn(),
}));

vi.mock('@/platform/supabase/public', () => ({ supabasePublicoConfigurado: () => mocks.publicoConfigurado() }));
vi.mock('@/platform/supabase/session', () => ({ crearClienteSupabaseSesion: async () => ({ auth: { signOut: (opciones?: unknown) => mocks.signOut(opciones) } }) }));
vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/platform/auth/session', () => ({ deleteSession: (token: string) => mocks.deleteSession(token) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (nombre: string) => mocks.cookieLocal(nombre) }) }));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.publicoConfigurado.mockReturnValue(true);
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('cierra solo la sesión de este dispositivo, no las de la misma cuenta en otros equipos', async () => {
    const { POST } = await import('../../src/app/api/auth/logout/route');
    const respuesta = await POST();
    expect(respuesta.status).toBe(200);
    // El modo por defecto de Supabase es "global": cerraba también el celular o el portátil de la misma persona.
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('en modo local elimina la sesión propia y no llama a Supabase', async () => {
    mocks.publicoConfigurado.mockReturnValue(false);
    mocks.cookieLocal.mockReturnValue({ value: 'token-local' });
    const { POST } = await import('../../src/app/api/auth/logout/route');
    await POST();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.deleteSession).toHaveBeenCalledWith('token-local');
  });
});

describe('GET /api/auth/session (mantener la sesión activa)', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('responde 200 si hay una sesión válida', async () => {
    mocks.currentUser.mockResolvedValue({ id: 'u-1' });
    const { GET } = await import('../../src/app/api/auth/session/route');
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ activa: true });
    expect(respuesta.headers.get('cache-control')).toMatch(/no-store/);
  });

  it('responde 401 si la sesión ya no existe', async () => {
    mocks.currentUser.mockResolvedValue(null);
    const { GET } = await import('../../src/app/api/auth/session/route');
    const respuesta = await GET();
    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ activa: false });
  });

  it('ante una falla pasajera responde 503 para que la pantalla no cierre la sesión por error', async () => {
    mocks.currentUser.mockRejectedValue(new Error('Supabase no responde'));
    const { GET } = await import('../../src/app/api/auth/session/route');
    const respuesta = await GET();
    expect(respuesta.status).toBe(503);
  });
});
