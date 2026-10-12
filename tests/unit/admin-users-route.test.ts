import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { PuertoCorreccionCorreo } from '../../src/modules/access/email-correction';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  invitarUsuario: vi.fn(),
  reenviarAcceso: vi.fn(),
  cambiarEstadoUsuario: vi.fn(),
  crearClienteServidor: vi.fn(),
  puerto: {
    buscarUsuario: vi.fn(),
    existeCorreo: vi.fn(),
    actualizarCorreoAuth: vi.fn(),
    registrarEvento: vi.fn(),
  } satisfies Record<keyof PuertoCorreccionCorreo, unknown>,
}));

vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/modules/access/supabase-user-administration', () => ({
  invitarUsuario: (...argumentos: unknown[]) => mocks.invitarUsuario(...argumentos),
  reenviarAcceso: (...argumentos: unknown[]) => mocks.reenviarAcceso(...argumentos),
  cambiarEstadoUsuario: (...argumentos: unknown[]) => mocks.cambiarEstadoUsuario(...argumentos),
}));
// Se conserva el servicio real (corregirCorreo y ErrorCorreo); solo el adaptador de Supabase se sustituye.
vi.mock('@/modules/access/email-correction', async () => {
  const real = await vi.importActual<typeof import('../../src/modules/access/email-correction')>('@/modules/access/email-correction');
  return { ...real, crearPuertoCorreccion: () => mocks.puerto };
});
vi.mock('@/platform/supabase/server', () => ({ crearClienteSupabaseServidor: () => mocks.crearClienteServidor() }));

type Manejador = (solicitud: Request) => Promise<Response>;

const ADMIN = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const OBJETIVO = { id: 'u-2', nombre: 'Luis', correo: 'luis@viejo.com', activo: true };

function solicitud(cuerpo: unknown): Request {
  return new Request('http://localhost/api/admin/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
}

async function cargar(): Promise<Manejador> {
  const { PATCH } = await import('../../src/app/api/admin/users/route');
  return PATCH;
}

function sinAdaptador() {
  for (const funcion of Object.values(mocks.puerto)) expect(funcion).not.toHaveBeenCalled();
}

describe('PATCH /api/admin/users', () => {
  let consolaError: MockInstance;

  const registroDeConsola = () => JSON.stringify(consolaError.mock.calls);

  beforeEach(() => {
    vi.resetModules();
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.currentUser.mockReset();
    mocks.currentUser.mockResolvedValue(ADMIN);
    mocks.invitarUsuario.mockReset();
    mocks.reenviarAcceso.mockReset();
    mocks.reenviarAcceso.mockResolvedValue(undefined);
    mocks.cambiarEstadoUsuario.mockReset();
    mocks.cambiarEstadoUsuario.mockResolvedValue(undefined);
    mocks.crearClienteServidor.mockReset();
    mocks.crearClienteServidor.mockReturnValue({});
    for (const funcion of Object.values(mocks.puerto)) funcion.mockReset();
    mocks.puerto.buscarUsuario.mockResolvedValue(OBJETIVO);
    mocks.puerto.existeCorreo.mockResolvedValue(false);
    mocks.puerto.actualizarCorreoAuth.mockResolvedValue(undefined);
    mocks.puerto.registrarEvento.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consolaError.mockRestore();
  });

  describe('autorización', () => {
    it('responde 403 sin sesión y no ejecuta ninguna acción', async () => {
      mocks.currentUser.mockResolvedValue(null);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(403);
      expect((await respuesta.json() as { error: string }).error).toBe('No autorizado.');
      sinAdaptador();
      expect(mocks.crearClienteServidor).not.toHaveBeenCalled();
    });

    it.each(['ARKA_ATTORNEY', 'IE_RECTOR', 'IE_SUPPORT'] as const)('responde 403 al rol %s y nunca llega al servicio', async (rol) => {
      mocks.currentUser.mockResolvedValue({ ...ADMIN, id: 'x-1', role: rol });
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(403);
      sinAdaptador();
      expect(mocks.crearClienteServidor).not.toHaveBeenCalled();
      expect(mocks.reenviarAcceso).not.toHaveBeenCalled();
      expect(mocks.cambiarEstadoUsuario).not.toHaveBeenCalled();
    });
  });

  describe('CORREGIR_CORREO', () => {
    it('un Administrador corrige el correo con la dirección normalizada y responde 200', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: '  Luis@Nuevo.com ' }));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toEqual({ ok: true });
      expect(mocks.puerto.buscarUsuario).toHaveBeenCalledWith('u-2');
      expect(mocks.puerto.actualizarCorreoAuth).toHaveBeenCalledWith('u-2', 'luis@nuevo.com');
      expect(mocks.puerto.registrarEvento).toHaveBeenCalledWith('a-1', 'u-2', { correo_anterior: 'l***@viejo.com', correo_nuevo: 'l***@nuevo.com' });
    });

    it('un correo ya registrado responde 400 con el mensaje del servicio', async () => {
      mocks.puerto.existeCorreo.mockResolvedValue(true);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'otro@correo.com' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('Ya existe una cuenta con ese correo.');
      expect(mocks.puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
      expect(consolaError).not.toHaveBeenCalled();
    });

    it.each([42, true, ['u-2'], { id: 'u-2' }])('un idUsuario que no es texto (%j) responde 400 sin tocar el adaptador', async (idUsuario) => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario, accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La cuenta solicitada no es válida.');
      sinAdaptador();
    });

    it('un correo que no es texto responde 400 con el mensaje del servicio', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 42 }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('El correo nuevo no es válido.');
      sinAdaptador();
    });

    it('el Administrador no corrige su propio correo por esta vía', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'a-1', accion: 'CORREGIR_CORREO', correo: 'ana@nuevo.com' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('Para cambiar su propio correo use Mi cuenta.');
      sinAdaptador();
    });

    it('un fallo controlado del servicio responde 500 con su mensaje', async () => {
      const { ErrorCorreo } = await import('../../src/modules/access/email-correction');
      mocks.puerto.actualizarCorreoAuth.mockRejectedValue(new ErrorCorreo('FALLO', 'No fue posible actualizar el correo en el servicio de acceso.'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(500);
      expect((await respuesta.json() as { error: string }).error).toBe('No fue posible actualizar el correo en el servicio de acceso.');
      expect(consolaError).toHaveBeenCalledTimes(1);
      expect(consolaError).toHaveBeenCalledWith('[correo] fallo del servicio', 'FALLO');
      expect(registroDeConsola()).not.toContain('luis@');
    });

    it('un error inesperado responde 500 genérico, sin texto interno y sin secretos en el registro', async () => {
      mocks.puerto.actualizarCorreoAuth.mockRejectedValue(new Error('secreto-interno'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(500);
      const texto = await respuesta.text();
      expect(JSON.parse(texto)).toEqual({ error: 'No fue posible corregir el correo.' });
      expect(texto).not.toContain('secreto-interno');
      expect(consolaError).toHaveBeenCalledWith('[correo] fallo inesperado', 'Error');
      const registro = registroDeConsola();
      for (const secreto of ['secreto-interno', 'luis@viejo.com', 'luis@nuevo.com']) expect(registro).not.toContain(secreto);
    });

    it('si no se puede crear el cliente de servidor responde 500 genérico, sin texto de configuración', async () => {
      mocks.crearClienteServidor.mockImplementation(() => { throw new Error('Supabase no está configurado: LEXCON_SUPABASE_URL'); });
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CORREGIR_CORREO', correo: 'luis@nuevo.com' }));
      expect(respuesta.status).toBe(500);
      const texto = await respuesta.text();
      expect(JSON.parse(texto)).toEqual({ error: 'No fue posible corregir el correo.' });
      expect(texto).not.toContain('LEXCON_SUPABASE_URL');
      expect(registroDeConsola()).not.toContain('LEXCON_SUPABASE_URL');
    });
  });

  describe('cuerpo y acciones existentes', () => {
    it.each([
      ['sin idUsuario', { accion: 'REENVIAR' }],
      ['sin acción', { idUsuario: 'u-2' }],
      ['con cuerpo vacío', {}],
    ])('responde 400 %s y no ejecuta nada', async (_caso, cuerpo) => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud(cuerpo));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('Selecciona una cuenta y una acción.');
      sinAdaptador();
      expect(mocks.reenviarAcceso).not.toHaveBeenCalled();
      expect(mocks.cambiarEstadoUsuario).not.toHaveBeenCalled();
    });

    it('REENVIAR sigue llamando a reenviarAcceso con el Administrador y la cuenta', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'REENVIAR' }));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toEqual({ ok: true });
      expect(mocks.reenviarAcceso).toHaveBeenCalledWith(ADMIN, 'u-2');
      sinAdaptador();
    });

    it('CAMBIAR_ESTADO sigue llamando a cambiarEstadoUsuario con el valor indicado', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CAMBIAR_ESTADO', activo: false }));
      expect(respuesta.status).toBe(200);
      expect(mocks.cambiarEstadoUsuario).toHaveBeenCalledWith(ADMIN, 'u-2', false);
      sinAdaptador();
    });

    it('CAMBIAR_ESTADO sin un booleano responde 400 y no cambia nada', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'CAMBIAR_ESTADO', activo: 'no' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La acción solicitada no es válida.');
      expect(mocks.cambiarEstadoUsuario).not.toHaveBeenCalled();
    });

    it('una acción desconocida responde 400', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'BORRAR' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La acción solicitada no es válida.');
    });

    it('un error de una acción existente conserva su mensaje con estado 400', async () => {
      mocks.reenviarAcceso.mockRejectedValue(new Error('La cuenta ya no está activa.'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ idUsuario: 'u-2', accion: 'REENVIAR' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La cuenta ya no está activa.');
    });
  });
});
