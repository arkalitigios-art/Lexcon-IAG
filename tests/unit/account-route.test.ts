import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { PuertoCuenta } from '../../src/modules/access/account-service';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getUser: vi.fn(),
  publicoConfigurado: vi.fn(),
  servidorConfigurado: vi.fn(),
  puerto: {
    verificarContrasena: vi.fn(),
    actualizarContrasena: vi.fn(),
    solicitarCambioCorreo: vi.fn(),
    actualizarNombre: vi.fn(),
    registrarEvento: vi.fn(),
  } satisfies Record<keyof PuertoCuenta, unknown>,
}));

vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/platform/supabase/session', () => ({ crearClienteSupabaseSesion: async () => ({ auth: { getUser: () => mocks.getUser() } }) }));
vi.mock('@/platform/supabase/public', () => ({ supabasePublicoConfigurado: () => mocks.publicoConfigurado() }));
vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.servidorConfigurado(), crearClienteSupabaseServidor: () => ({}) }));
vi.mock('@/modules/access/account-port-supabase', () => ({ crearPuertoCuenta: () => mocks.puerto }));

type Manejador = (solicitud: Request) => Promise<Response>;

const MENSAJE_BLOQUEO = 'Demasiados intentos. Intente de nuevo más tarde.';
const MENSAJE_CONTRASENA = 'La contraseña actual no es correcta.';
const CAMBIO_VALIDO = { accion: 'CONTRASENA', actual: 'clave-actual-1', nueva: 'clave-nueva-22' };

function solicitudCruda(texto: string): Request {
  return new Request('http://localhost/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: texto });
}

function solicitud(cuerpo: unknown): Request {
  return solicitudCruda(JSON.stringify(cuerpo));
}

async function cargar(): Promise<Manejador> {
  const { PATCH } = await import('../../src/app/api/account/route');
  return PATCH;
}

/** Envía `veces` cambios de contraseña con la contraseña actual incorrecta. */
async function fallar(PATCH: Manejador, veces: number): Promise<void> {
  mocks.puerto.verificarContrasena.mockResolvedValue(false);
  for (let i = 0; i < veces; i++) expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(403);
}

describe('PATCH /api/account', () => {
  let consolaError: MockInstance;

  const registroDeConsola = () => JSON.stringify(consolaError.mock.calls);

  beforeEach(() => {
    vi.resetModules();
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.currentUser.mockReset();
    mocks.currentUser.mockResolvedValue({ id: 'u-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null });
    mocks.getUser.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'ana@correo.com' } } });
    mocks.publicoConfigurado.mockReset();
    mocks.publicoConfigurado.mockReturnValue(true);
    mocks.servidorConfigurado.mockReset();
    mocks.servidorConfigurado.mockReturnValue(true);
    for (const funcion of Object.values(mocks.puerto)) funcion.mockReset();
    mocks.puerto.verificarContrasena.mockResolvedValue(true);
    mocks.puerto.actualizarContrasena.mockResolvedValue(undefined);
    mocks.puerto.solicitarCambioCorreo.mockResolvedValue(undefined);
    mocks.puerto.actualizarNombre.mockResolvedValue(undefined);
    mocks.puerto.registrarEvento.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consolaError.mockRestore();
    vi.useRealTimers();
  });

  describe('disponibilidad y sesión', () => {
    it('responde 503 cuando Supabase no está configurado', async () => {
      mocks.servidorConfigurado.mockReturnValue(false);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }));
      expect(respuesta.status).toBe(503);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(mocks.currentUser).not.toHaveBeenCalled();
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });

    it('responde 503 cuando el acceso público de Supabase no está configurado', async () => {
      mocks.publicoConfigurado.mockReturnValue(false);
      const PATCH = await cargar();
      expect((await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }))).status).toBe(503);
    });

    it('responde 503 (y no 500) cuando la comprobación pública lanza por una configuración incompleta', async () => {
      mocks.publicoConfigurado.mockImplementation(() => { throw new Error('La configuración pública de Supabase está incompleta.'); });
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }));
      expect(respuesta.status).toBe(503);
      const texto = await respuesta.text();
      expect(texto).not.toContain('incompleta');
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });

    it('responde 503 (y no 500) cuando la comprobación del servidor lanza por una configuración no HTTPS', async () => {
      mocks.servidorConfigurado.mockImplementation(() => { throw new Error('LEXCON_SUPABASE_URL debe ser una URL HTTPS válida.'); });
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }));
      expect(respuesta.status).toBe(503);
      expect(await respuesta.text()).not.toContain('HTTPS');
    });

    it('responde 401 sin sesión', async () => {
      mocks.currentUser.mockResolvedValue(null);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }));
      expect(respuesta.status).toBe(401);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });

    it('responde 401 si la sesión de Supabase no tiene correo', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null } });
      const PATCH = await cargar();
      expect((await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }))).status).toBe(401);
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });
  });

  describe('cuerpo de la solicitud', () => {
    it('responde 413 si el cuerpo supera 10.000 caracteres, sin ejecutar ninguna acción', async () => {
      const PATCH = await cargar();
      const enorme = JSON.stringify({ accion: 'NOMBRE', nombre: 'Ana' }).padEnd(10_001, ' ');
      expect(enorme.length).toBe(10_001);
      const respuesta = await PATCH(solicitudCruda(enorme));
      expect(respuesta.status).toBe(413);
      expect((await respuesta.json() as { error: string }).error).toBe('La solicitud es demasiado grande.');
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });

    it('acepta un cuerpo de exactamente 10.000 caracteres', async () => {
      const PATCH = await cargar();
      const limite = JSON.stringify({ accion: 'NOMBRE', nombre: 'Ana' }).padEnd(10_000, ' ');
      expect(limite.length).toBe(10_000);
      expect((await PATCH(solicitudCruda(limite))).status).toBe(200);
    });

    it('responde 400 si el cuerpo no es JSON', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitudCruda('no es json'));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La solicitud no es válida.');
    });

    it('responde 400 (sin lanzar) cuando el JSON no es un objeto: null, arreglo, número o texto', async () => {
      const PATCH = await cargar();
      for (const cuerpo of [null, [], [{ accion: 'NOMBRE' }], 7, 'texto']) {
        const respuesta = await PATCH(solicitud(cuerpo));
        expect(respuesta.status).toBe(400);
        expect(respuesta.headers.get('cache-control')).toBe('no-store');
        expect((await respuesta.json() as { error: string }).error).toBe('La solicitud no es válida.');
      }
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
      expect(mocks.puerto.verificarContrasena).not.toHaveBeenCalled();
    });

    it('responde 400 para una acción desconocida', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'BORRAR' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La acción solicitada no es válida.');
    });
  });

  describe('acciones', () => {
    it('NOMBRE actualiza el nombre de la persona autenticada', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: '  Ana María  ' }));
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(await respuesta.json()).toEqual({ ok: true });
      expect(mocks.puerto.actualizarNombre).toHaveBeenCalledWith('u-1', 'Ana María');
      expect(mocks.puerto.verificarContrasena).not.toHaveBeenCalled();
    });

    it('NOMBRE con un nombre vacío responde 400', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: '   ' }));
      expect(respuesta.status).toBe(400);
      expect(mocks.puerto.actualizarNombre).not.toHaveBeenCalled();
    });

    it('CONTRASENA verifica la actual con el correo de la sesión y actualiza la nueva', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud(CAMBIO_VALIDO));
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(await respuesta.json()).toEqual({ ok: true });
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledWith('ana@correo.com', 'clave-actual-1');
      expect(mocks.puerto.actualizarContrasena).toHaveBeenCalledWith('clave-nueva-22');
      expect(mocks.puerto.registrarEvento).toHaveBeenCalledWith('PASSWORD_CHANGED', 'u-1', {});
    });

    it('CONTRASENA con la contraseña actual incorrecta responde 403 y no actualiza nada', async () => {
      mocks.puerto.verificarContrasena.mockResolvedValue(false);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud(CAMBIO_VALIDO));
      expect(respuesta.status).toBe(403);
      expect((await respuesta.json() as { error: string }).error).toBe(MENSAJE_CONTRASENA);
      expect(mocks.puerto.actualizarContrasena).not.toHaveBeenCalled();
    });

    it('CONTRASENA con una nueva demasiado corta responde 400 con el mensaje del servicio', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'CONTRASENA', actual: 'clave-actual-1', nueva: '1234567' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La contraseña debe tener al menos 8 caracteres.');
      expect(mocks.puerto.verificarContrasena).not.toHaveBeenCalled();
    });

    it('CORREO verifica la contraseña, pide la confirmación y devuelve el mensaje', async () => {
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'CORREO', correoNuevo: 'Nueva@Correo.com', contrasenaActual: 'clave-actual-1' }));
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(await respuesta.json()).toEqual({
        ok: true,
        mensaje: 'Enviamos una confirmación al correo nuevo. Hasta que la confirme, seguirá entrando con el correo actual. Abra el enlace de confirmación desde este mismo navegador.',
      });
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledWith('ana@correo.com', 'clave-actual-1');
      expect(mocks.puerto.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');
    });

    it.each(['ARKA_ADMIN', 'ARKA_ATTORNEY', 'IE_RECTOR', 'IE_SUPPORT'] as const)('CORREO funciona para el rol %s', async (rol) => {
      mocks.currentUser.mockResolvedValue({ id: 'u-9', name: 'Persona', role: rol, institutionId: rol.startsWith('IE_') ? 'ie-1' : null, institutionName: rol.startsWith('IE_') ? 'IE Uno' : null });
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'CORREO', correoNuevo: 'nueva@correo.com', contrasenaActual: 'clave-actual-1' }));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toMatchObject({ ok: true, mensaje: expect.stringContaining('correo nuevo') });
      expect(mocks.puerto.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');
      expect(mocks.puerto.registrarEvento).toHaveBeenCalledWith('EMAIL_CHANGE_REQUESTED', 'u-9', expect.any(Object));
    });

    it('CORREO con la contraseña incorrecta responde 403 y no pide la confirmación', async () => {
      mocks.puerto.verificarContrasena.mockResolvedValue(false);
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'CORREO', correoNuevo: 'nueva@correo.com', contrasenaActual: 'mala' }));
      expect(respuesta.status).toBe(403);
      expect(mocks.puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
    });

    it('un fallo del adaptador responde 500 con el mensaje del servicio y deja un diagnóstico sin secretos', async () => {
      const { ErrorCuenta } = await import('../../src/modules/access/account-service');
      mocks.puerto.actualizarNombre.mockRejectedValue(new ErrorCuenta('FALLO', 'No fue posible guardar el nombre.'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }));
      expect(respuesta.status).toBe(500);
      expect((await respuesta.json() as { error: string }).error).toBe('No fue posible guardar el nombre.');
      expect(consolaError).toHaveBeenCalledWith('[cuenta] fallo del servicio', 'FALLO');
    });
  });

  describe('protección de la contraseña actual contra intentos repetidos', () => {
    it('bloquea con 429 tras 5 contraseñas actuales incorrectas y no vuelve a verificarla', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 5);
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledTimes(5);

      // Incluso con la contraseña correcta, la sexta solicitud ni siquiera se verifica.
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      const sexta = await PATCH(solicitud(CAMBIO_VALIDO));
      expect(sexta.status).toBe(429);
      expect(sexta.headers.get('cache-control')).toBe('no-store');
      expect((await sexta.json() as { error: string }).error).toBe(MENSAJE_BLOQUEO);
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledTimes(5);
      expect(mocks.puerto.actualizarContrasena).not.toHaveBeenCalled();
    });

    it('el bloqueo se aplica antes de analizar el cuerpo y alcanza también a la acción CORREO', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 5);
      const conCuerpoInvalido = await PATCH(solicitudCruda('no es json'));
      expect(conCuerpoInvalido.status).toBe(429);
      const correo = await PATCH(solicitud({ accion: 'CORREO', correoNuevo: 'nueva@correo.com', contrasenaActual: 'clave-actual-1' }));
      expect(correo.status).toBe(429);
      expect(mocks.puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
    });

    it('el bloqueo es por persona: otra cuenta no se ve afectada', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 5);
      mocks.currentUser.mockResolvedValue({ id: 'u-2', name: 'Luis', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' });
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);
    });

    it('las solicitudes bloqueadas no registran más fallos ni prolongan el bloqueo', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
      const PATCH = await cargar();
      await fallar(PATCH, 5);

      // Una ráfaga de solicitudes bloqueadas a mitad de la ventana: ninguna debe sumar fallos.
      vi.setSystemTime(new Date('2026-10-11T10:07:00Z'));
      for (let i = 0; i < 10; i++) expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(429);
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledTimes(5);

      // Al cumplirse los 15 minutos desde el quinto fallo, el bloqueo termina.
      vi.setSystemTime(new Date('2026-10-11T10:15:01Z'));
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);
    });

    it('los datos inválidos no cuentan para el bloqueo', async () => {
      const PATCH = await cargar();
      for (let i = 0; i < 6; i++) {
        const respuesta = await PATCH(solicitud({ accion: 'CONTRASENA', actual: 'clave-actual-1', nueva: '1234567' }));
        expect(respuesta.status).toBe(400);
      }
      // Tampoco bloquea después: la contraseña correcta sigue funcionando.
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);
    });

    it('una falla del servicio al actualizar la contraseña no cuenta para el bloqueo', async () => {
      const { ErrorCuenta } = await import('../../src/modules/access/account-service');
      mocks.puerto.actualizarContrasena.mockRejectedValue(new ErrorCuenta('FALLO', 'No fue posible actualizar la contraseña.'));
      const PATCH = await cargar();
      for (let i = 0; i < 6; i++) expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(500);
    });

    it('una falla del servicio al verificar la contraseña no cuenta para el bloqueo', async () => {
      const { ErrorCuenta } = await import('../../src/modules/access/account-service');
      mocks.puerto.verificarContrasena.mockRejectedValue(new ErrorCuenta('FALLO', 'No fue posible verificar la contraseña en este momento.'));
      const PATCH = await cargar();
      for (let i = 0; i < 6; i++) expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(500);
      expect(mocks.puerto.verificarContrasena).toHaveBeenCalledTimes(6);
    });

    it('un cambio de contraseña correcto reinicia el contador', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 4);
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);

      // 4 + 4 fallos sin reinicio habrían bloqueado; con el reinicio sigue libre.
      await fallar(PATCH, 4);
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);
    });

    it('un cambio de correo correcto también reinicia el contador', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 4);
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud({ accion: 'CORREO', correoNuevo: 'nueva@correo.com', contrasenaActual: 'clave-actual-1' }))).status).toBe(200);
      await fallar(PATCH, 4);
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(200);
    });

    it('actualizar el nombre no reinicia el contador (no verifica la contraseña)', async () => {
      const PATCH = await cargar();
      await fallar(PATCH, 4);
      expect((await PATCH(solicitud({ accion: 'NOMBRE', nombre: 'Ana' }))).status).toBe(200);

      // Si el nombre hubiera reiniciado el contador, este sería el primer fallo y no el quinto.
      await fallar(PATCH, 1);
      mocks.puerto.verificarContrasena.mockResolvedValue(true);
      expect((await PATCH(solicitud(CAMBIO_VALIDO))).status).toBe(429);
    });
  });

  describe('errores inesperados', () => {
    it('devuelve 500 genérico sin filtrar el mensaje interno y sin secretos en el registro', async () => {
      mocks.puerto.actualizarContrasena.mockRejectedValue(new Error('secreto-interno'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud(CAMBIO_VALIDO));
      expect(respuesta.status).toBe(500);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      const texto = await respuesta.text();
      expect(JSON.parse(texto)).toEqual({ error: 'No fue posible completar la operación.' });
      expect(texto).not.toContain('secreto-interno');
      expect(consolaError).toHaveBeenCalledWith('[cuenta] fallo inesperado', 'Error');
      const registro = registroDeConsola();
      for (const secreto of ['secreto-interno', 'clave-actual-1', 'clave-nueva-22', 'ana@correo.com']) expect(registro).not.toContain(secreto);
    });

    it('devuelve 500 genérico si falla la lectura de la identidad de la sesión', async () => {
      mocks.currentUser.mockRejectedValue(new Error('perfil-interno'));
      const PATCH = await cargar();
      const respuesta = await PATCH(solicitud(CAMBIO_VALIDO));
      expect(respuesta.status).toBe(500);
      const texto = await respuesta.text();
      expect(JSON.parse(texto)).toEqual({ error: 'No fue posible completar la operación.' });
      expect(texto).not.toContain('perfil-interno');
      expect(consolaError).toHaveBeenCalledWith('[cuenta] fallo inesperado', 'Error');
      expect(registroDeConsola()).not.toContain('perfil-interno');
    });
  });
});
