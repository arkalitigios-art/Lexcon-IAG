import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { PuertoConfiguracion } from '../../src/modules/access/setup-administrator';

const CODIGO = 'codigo-de-prueba-con-24-caracteres!';
const CODIGO_ORIGINAL = process.env.LEXCON_SETUP_TOKEN;

const mocks = vi.hoisted(() => ({
  configurado: vi.fn(),
  puerto: {
    contarAdministradoresActivos: vi.fn(),
    listarAdministradoresActivos: vi.fn(),
    crearUsuarioAuth: vi.fn(),
    registrarAdministrador: vi.fn(),
    eliminarUsuarioAuth: vi.fn(),
    actualizarCredenciales: vi.fn(),
    registrarEvento: vi.fn(),
  } satisfies Record<keyof PuertoConfiguracion, unknown>,
}));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado(), crearClienteSupabaseServidor: () => ({}) }));
vi.mock('@/modules/access/setup-administrator-supabase', () => ({ crearPuertoSupabase: () => mocks.puerto }));

type Manejador = (solicitud: Request) => Promise<Response>;

function solicitudCruda(texto: string, ip = '10.0.0.1'): Request {
  return new Request('http://localhost/api/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: texto,
  });
}

function solicitud(cuerpo: unknown, ip = '10.0.0.1'): Request {
  return solicitudCruda(JSON.stringify(cuerpo), ip);
}

const CREAR_VALIDO = { accion: 'crear', codigo: CODIGO, nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'clave-segura-1' };
const CREAR_CON_CODIGO_MALO = { ...CREAR_VALIDO, codigo: 'incorrecto' };
const ADMINISTRADOR = { id: 'u-1', nombre: 'Ana', correo: 'ana@correo.com' };

/** Envía `veces` solicitudes con código incorrecto desde la misma IP. */
async function fallar(POST: Manejador, ip: string, veces: number): Promise<void> {
  for (let i = 0; i < veces; i++) await POST(solicitud(CREAR_CON_CODIGO_MALO, ip));
}

describe('POST /api/setup', () => {
  let consolaError: MockInstance;

  /** Todo lo registrado en consola, para comprobar que nunca incluye secretos. */
  const registroDeConsola = () => JSON.stringify(consolaError.mock.calls);

  beforeEach(() => {
    vi.resetModules();
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LEXCON_SETUP_TOKEN = CODIGO;
    mocks.configurado.mockReset();
    mocks.configurado.mockReturnValue(true);
    for (const funcion of Object.values(mocks.puerto)) funcion.mockReset();
    mocks.puerto.contarAdministradoresActivos.mockResolvedValue(0);
    mocks.puerto.listarAdministradoresActivos.mockResolvedValue([]);
    mocks.puerto.crearUsuarioAuth.mockResolvedValue({ id: 'u-1' });
    mocks.puerto.registrarAdministrador.mockResolvedValue(undefined);
    mocks.puerto.eliminarUsuarioAuth.mockResolvedValue(undefined);
    mocks.puerto.actualizarCredenciales.mockResolvedValue(undefined);
    mocks.puerto.registrarEvento.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consolaError.mockRestore();
  });

  afterAll(() => {
    if (CODIGO_ORIGINAL === undefined) delete process.env.LEXCON_SETUP_TOKEN;
    else process.env.LEXCON_SETUP_TOKEN = CODIGO_ORIGINAL;
  });

  it('responde 404 cuando el servidor no tiene código configurado', async () => {
    delete process.env.LEXCON_SETUP_TOKEN;
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud({ accion: 'crear' }));
    expect(respuesta.status).toBe(404);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
  });

  it('responde 404 cuando Supabase no está configurado', async () => {
    mocks.configurado.mockReturnValue(false);
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud(CREAR_VALIDO));
    expect(respuesta.status).toBe(404);
    expect((await respuesta.json() as { error: string }).error).toBe('No encontrada.');
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('responde 404 (y no 500) cuando la comprobación de Supabase lanza por una configuración incompleta', async () => {
    mocks.configurado.mockImplementation(() => { throw new Error('La configuración de Supabase está incompleta.'); });
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud(CREAR_VALIDO));
    expect(respuesta.status).toBe(404);
    const texto = await respuesta.text();
    expect(JSON.parse(texto)).toEqual({ error: 'No encontrada.' });
    expect(texto).not.toContain('incompleta');
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('crea el primer administrador con el código correcto', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud(CREAR_VALIDO));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(mocks.puerto.registrarAdministrador).toHaveBeenCalled();
  });

  it('usa el mismo mensaje genérico con código inválido y con bloqueo', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const primera = await POST(solicitud(CREAR_CON_CODIGO_MALO));
    expect(primera.status).toBe(403);
    expect(primera.headers.get('cache-control')).toBe('no-store');
    const mensajeInvalido = (await primera.json() as { error: string }).error;
    for (let i = 0; i < 4; i++) await POST(solicitud(CREAR_CON_CODIGO_MALO));
    const bloqueada = await POST(solicitud({ ...CREAR_CON_CODIGO_MALO, codigo: CODIGO }));
    expect(bloqueada.status).toBe(403);
    expect(bloqueada.headers.get('cache-control')).toBe('no-store');
    expect((await bloqueada.json() as { error: string }).error).toBe(mensajeInvalido);
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('no bloquea a otra dirección IP', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const mala = { accion: 'crear', codigo: 'incorrecto' };
    for (let i = 0; i < 5; i++) await POST(solicitud(mala, '10.0.0.9'));
    // La IP bloqueada sigue rechazada, incluso con el código correcto...
    const sigueBloqueada = await POST(solicitud(CREAR_VALIDO, '10.0.0.9'));
    expect(sigueBloqueada.status).toBe(403);
    // ...mientras que otra IP no se ve afectada.
    const otra = await POST(solicitud(CREAR_VALIDO, '10.0.0.10'));
    expect(otra.status).toBe(200);
  });

  it('bloquea a todas las direcciones tras 30 fallos en total (límite global)', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    for (let n = 1; n <= 5; n++) await fallar(POST, `10.1.0.${n}`, 5);
    // Con 25 fallos acumulados, una IP nueva con el código correcto todavía funciona.
    const antesDelLimite = await POST(solicitud(CREAR_VALIDO, '10.1.0.98'));
    expect(antesDelLimite.status).toBe(200);
    mocks.puerto.crearUsuarioAuth.mockClear();

    // Los fallos 26 a 30 alcanzan el límite global.
    await fallar(POST, '10.1.0.6', 5);
    const nueva = await POST(solicitud(CREAR_VALIDO, '10.1.0.99'));
    expect(nueva.status).toBe(403);
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('un acierto reinicia solo el contador de esa IP', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    await fallar(POST, '10.2.0.1', 4);
    await fallar(POST, '10.2.0.2', 4);

    const acierto = await POST(solicitud(CREAR_VALIDO, '10.2.0.1'));
    expect(acierto.status).toBe(200);

    // A: 4 + 4 fallos sin reinicio la habrían bloqueado; con el reinicio sigue libre.
    await fallar(POST, '10.2.0.1', 4);
    expect((await POST(solicitud(CREAR_VALIDO, '10.2.0.1'))).status).toBe(200);

    // B no fue reiniciada: su quinto fallo la bloquea.
    await fallar(POST, '10.2.0.2', 1);
    expect((await POST(solicitud(CREAR_VALIDO, '10.2.0.2'))).status).toBe(403);
  });

  it('devuelve 400 para una acción desconocida', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud({ accion: 'borrar', codigo: CODIGO }));
    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 cuando el cuerpo no es JSON', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitudCruda('no es json'));
    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 cuando el JSON no es un objeto (null, arreglo, número)', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    for (const cuerpo of [null, [], [CREAR_VALIDO], 7, 'texto']) {
      const respuesta = await POST(solicitud(cuerpo));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La solicitud no es válida.');
    }
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('devuelve 413 si el cuerpo supera 10.000 caracteres, antes de analizar el JSON o el código', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const enorme = JSON.stringify({ ...CREAR_VALIDO, relleno: 'x' }).padEnd(10_001, ' ');
    expect(enorme.length).toBe(10_001);
    const respuesta = await POST(solicitudCruda(enorme));
    expect(respuesta.status).toBe(413);
    expect((await respuesta.json() as { error: string }).error).toBe('La solicitud es demasiado grande.');
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
    expect(mocks.puerto.contarAdministradoresActivos).not.toHaveBeenCalled();
  });

  it('acepta un cuerpo de exactamente 10.000 caracteres (no responde 413)', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const limite = JSON.stringify(CREAR_VALIDO).padEnd(10_000, ' ');
    expect(limite.length).toBe(10_000);
    const respuesta = await POST(solicitudCruda(limite));
    expect(respuesta.status).toBe(200);
  });

  it('acota la clave del limitador cuando x-forwarded-for es muy largo', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const base = 'a'.repeat(64);
    const largaA = base + 'x'.repeat(436);
    const largaB = base + 'y'.repeat(436);
    expect(largaA).toHaveLength(500);

    // Una cabecera de 500 caracteres funciona con normalidad.
    const ok = await POST(solicitud(CREAR_VALIDO, largaA));
    expect(ok.status).toBe(200);

    // Cinco fallos desde esa cabecera la bloquean...
    for (let i = 0; i < 5; i++) expect((await POST(solicitud(CREAR_CON_CODIGO_MALO, largaA))).status).toBe(403);
    const bloqueada = await POST(solicitud(CREAR_VALIDO, largaA));
    expect(bloqueada.status).toBe(403);

    // ...y, como la clave se acota a 64 caracteres, otra cabecera con el mismo prefijo comparte el bloqueo.
    const mismoPrefijo = await POST(solicitud(CREAR_VALIDO, largaB));
    expect(mismoPrefijo.status).toBe(403);
  });

  describe('resultados de las acciones', () => {
    it('listar devuelve 200 con los administradores activos', async () => {
      mocks.puerto.contarAdministradoresActivos.mockResolvedValue(1);
      mocks.puerto.listarAdministradoresActivos.mockResolvedValue([ADMINISTRADOR]);
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud({ accion: 'listar', codigo: CODIGO }));
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get('cache-control')).toBe('no-store');
      expect(await respuesta.json()).toEqual({ administradores: [ADMINISTRADOR] });
    });

    it('recuperar devuelve 200 y aplica las credenciales y la auditoría', async () => {
      mocks.puerto.contarAdministradoresActivos.mockResolvedValue(1);
      mocks.puerto.listarAdministradoresActivos.mockResolvedValue([ADMINISTRADOR]);
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud({
        accion: 'recuperar', codigo: CODIGO, idUsuario: 'u-1', correo: 'nueva@correo.com', contrasena: 'clave-segura-2',
      }));
      expect(respuesta.status).toBe(200);
      expect(await respuesta.json()).toEqual({ ok: true });
      expect(mocks.puerto.actualizarCredenciales).toHaveBeenCalledWith('u-1', { correo: 'nueva@correo.com', contrasena: 'clave-segura-2' });
      expect(mocks.puerto.registrarEvento).toHaveBeenCalledWith('ADMIN_RECOVERED', 'u-1', expect.any(Object));
    });

    it('crear devuelve 409 si ya existe un Administrador activo', async () => {
      mocks.puerto.contarAdministradoresActivos.mockResolvedValue(1);
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud(CREAR_VALIDO));
      expect(respuesta.status).toBe(409);
      expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
    });

    it('devuelve 400 con el mensaje del servicio cuando los datos no son válidos', async () => {
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud({ ...CREAR_VALIDO, contrasena: '1234567' }));
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json() as { error: string }).error).toBe('La contraseña debe tener al menos 8 caracteres.');
      expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
    });

    it('devuelve 500 y revierte la cuenta cuando falla el registro del Administrador', async () => {
      mocks.puerto.registrarAdministrador.mockRejectedValue(new Error('rpc'));
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud(CREAR_VALIDO));
      expect(respuesta.status).toBe(500);
      expect((await respuesta.json() as { error: string }).error).toBe('No fue posible registrar el Administrador. La cuenta fue cancelada.');
      expect(mocks.puerto.eliminarUsuarioAuth).toHaveBeenCalledWith('u-1');
      expect(consolaError).toHaveBeenCalledWith('[setup] fallo del servicio', 'FALLO');
      const registro = registroDeConsola();
      for (const secreto of [CODIGO, 'clave-segura-1', 'ana@correo.com']) expect(registro).not.toContain(secreto);
    });

    it('devuelve 500 genérico ante una excepción inesperada sin filtrar su mensaje', async () => {
      mocks.puerto.contarAdministradoresActivos.mockRejectedValue(new Error('secreto-interno'));
      const { POST } = await import('../../src/app/api/setup/route');
      const respuesta = await POST(solicitud(CREAR_VALIDO));
      expect(respuesta.status).toBe(500);
      const texto = await respuesta.text();
      expect(JSON.parse(texto)).toEqual({ error: 'No fue posible completar la operación.' });
      expect(texto).not.toContain('secreto-interno');
      expect(consolaError).toHaveBeenCalledWith('[setup] fallo inesperado', 'Error');
      const registro = registroDeConsola();
      for (const secreto of ['secreto-interno', CODIGO, 'clave-segura-1', 'ana@correo.com']) expect(registro).not.toContain(secreto);
    });
  });
});
