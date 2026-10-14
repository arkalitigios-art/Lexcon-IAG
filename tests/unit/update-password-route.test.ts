import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  publicoConfigurado: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/platform/supabase/public', () => ({ supabasePublicoConfigurado: () => mocks.publicoConfigurado() }));
vi.mock('@/platform/supabase/session', () => ({
  crearClienteSupabaseSesion: async () => ({ auth: { getUser: () => mocks.getUser(), updateUser: (datos: unknown) => mocks.updateUser(datos) } }),
}));

type Manejador = (solicitud: Request) => Promise<Response>;

function solicitud(cuerpo: unknown): Request {
  return new Request('http://localhost/api/auth/update-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
}

async function cargar(): Promise<Manejador> {
  const { POST } = await import('../../src/app/api/auth/update-password/route');
  return POST;
}

const CLAVE = 'clave-nueva-22';

describe('POST /api/auth/update-password', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.publicoConfigurado.mockReset();
    mocks.publicoConfigurado.mockReturnValue(true);
    mocks.getUser.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'abogado-1' } } });
    mocks.updateUser.mockReset();
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  it('cambia la contraseña cuando la sesión es la de la persona del enlace', async () => {
    const POST = await cargar();
    const respuesta = await POST(solicitud({ password: CLAVE, idUsuarioEnlace: 'abogado-1' }));
    expect(respuesta.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: CLAVE });
  });

  it('no cambia nada si otra sesión reemplazó a la del enlace en el mismo navegador', async () => {
    // El enlace era de "abogado-1", pero la cookie ahora pertenece al administrador.
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    const POST = await cargar();
    const respuesta = await POST(solicitud({ password: CLAVE, idUsuarioEnlace: 'abogado-1' }));
    expect(respuesta.status).toBe(409);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    const cuerpo = await respuesta.json() as { error: string };
    expect(cuerpo.error).toMatch(/otra sesión|enlace/i);
    // El mensaje no revela a quién pertenece la sesión actual.
    expect(JSON.stringify(cuerpo)).not.toContain('admin-1');
  });

  it('exige el identificador de la persona del enlace', async () => {
    const POST = await cargar();
    for (const cuerpo of [{ password: CLAVE }, { password: CLAVE, idUsuarioEnlace: '' }, { password: CLAVE, idUsuarioEnlace: 42 }]) {
      const respuesta = await POST(solicitud(cuerpo));
      expect(respuesta.status).toBe(409);
    }
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña demasiado corta antes de consultar la sesión', async () => {
    const POST = await cargar();
    const respuesta = await POST(solicitud({ password: 'corta', idUsuarioEnlace: 'abogado-1' }));
    expect(respuesta.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('responde 401 si no hay sesión', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const POST = await cargar();
    const respuesta = await POST(solicitud({ password: CLAVE, idUsuarioEnlace: 'abogado-1' }));
    expect(respuesta.status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('responde 503 si Supabase no está configurado', async () => {
    mocks.publicoConfigurado.mockReturnValue(false);
    const POST = await cargar();
    expect((await POST(solicitud({ password: CLAVE, idUsuarioEnlace: 'abogado-1' }))).status).toBe(503);
  });
});
