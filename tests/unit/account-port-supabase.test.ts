import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { crearPuertoCuenta } from '../../src/modules/access/account-port-supabase';
import { ErrorCuenta } from '../../src/modules/access/account-service';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  configuracion: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: (...argumentos: unknown[]) => mocks.createClient(...argumentos) }));
vi.mock('@/platform/supabase/public', () => ({ configuracionSupabasePublica: () => mocks.configuracion() }));
vi.mock('@/platform/app-url', () => ({ appUrl: (ruta: string) => `https://app.prueba${ruta}` }));

const CONFIGURACION = { url: 'https://proyecto.supabase.prueba', clavePublicable: 'clave-publicable-de-prueba' };

function clienteDeSesion(updateUser = vi.fn().mockResolvedValue({ error: null })) {
  return { cliente: { auth: { updateUser } } as unknown as Pick<SupabaseClient, 'auth'>, updateUser };
}

function clienteDeServicio() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const rpc = vi.fn().mockResolvedValue({ error: null });
  return { cliente: { from, rpc } as unknown as SupabaseClient, from, update, eq, rpc };
}

function crear(parcial: { sesion?: ReturnType<typeof clienteDeSesion>; servicio?: ReturnType<typeof clienteDeServicio> } = {}) {
  const sesion = parcial.sesion ?? clienteDeSesion();
  const servicio = parcial.servicio ?? clienteDeServicio();
  return { puerto: crearPuertoCuenta(sesion.cliente, servicio.cliente), sesion, servicio };
}

describe('crearPuertoCuenta', () => {
  let consolaError: MockInstance;

  beforeEach(() => {
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createClient.mockReset();
    mocks.configuracion.mockReset();
    mocks.signInWithPassword.mockReset();
    mocks.configuracion.mockReturnValue(CONFIGURACION);
    mocks.createClient.mockReturnValue({ auth: { signInWithPassword: mocks.signInWithPassword } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    consolaError.mockRestore();
  });

  describe('verificarContrasena', () => {
    it('devuelve true si el servicio acepta las credenciales y usa un cliente aislado', async () => {
      const { puerto } = crear();
      await expect(puerto.verificarContrasena('ana@correo.com', 'clave-actual-1')).resolves.toBe(true);
      expect(mocks.createClient).toHaveBeenCalledWith(CONFIGURACION.url, CONFIGURACION.clavePublicable, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@correo.com', password: 'clave-actual-1' });
    });

    it('devuelve false únicamente cuando el servicio responde invalid_credentials', async () => {
      mocks.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 } });
      const { puerto } = crear();
      await expect(puerto.verificarContrasena('ana@correo.com', 'mala')).resolves.toBe(false);
    });

    it('lanza ErrorCuenta FALLO con cualquier otro código de error, sin tratarlo como contraseña incorrecta', async () => {
      for (const error of [
        { code: 'over_request_rate_limit', message: 'rate limit', status: 429 },
        { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
        { message: 'Failed to fetch' },
      ]) {
        mocks.signInWithPassword.mockResolvedValue({ error });
        const { puerto } = crear();
        await expect(puerto.verificarContrasena('ana@correo.com', 'clave')).rejects.toMatchObject({
          name: 'ErrorCuenta',
          codigo: 'FALLO',
          message: 'No fue posible verificar la contraseña en este momento. Intente de nuevo en unos minutos.',
        });
      }
    });

    it('lanza ErrorCuenta FALLO si la configuración pública es nula', async () => {
      mocks.configuracion.mockReturnValue(null);
      const { puerto } = crear();
      await expect(puerto.verificarContrasena('ana@correo.com', 'clave')).rejects.toBeInstanceOf(ErrorCuenta);
      await expect(puerto.verificarContrasena('ana@correo.com', 'clave')).rejects.toMatchObject({ codigo: 'FALLO' });
      expect(mocks.createClient).not.toHaveBeenCalled();
    });

    it('lanza ErrorCuenta FALLO si la configuración pública lanza o si la llamada al servicio lanza', async () => {
      mocks.configuracion.mockImplementation(() => { throw new Error('configuración incompleta'); });
      const { puerto } = crear();
      await expect(puerto.verificarContrasena('ana@correo.com', 'clave')).rejects.toMatchObject({ codigo: 'FALLO' });

      mocks.configuracion.mockReturnValue(CONFIGURACION);
      mocks.signInWithPassword.mockRejectedValue(new Error('red caída'));
      await expect(puerto.verificarContrasena('ana@correo.com', 'clave')).rejects.toMatchObject({ codigo: 'FALLO' });
    });
  });

  describe('actualizarContrasena', () => {
    it('actualiza la contraseña con el cliente de sesión', async () => {
      const { puerto, sesion } = crear();
      await puerto.actualizarContrasena('clave-nueva-22');
      expect(sesion.updateUser).toHaveBeenCalledWith({ password: 'clave-nueva-22' });
    });

    it('explica una contraseña débil como dato inválido', async () => {
      const sesion = clienteDeSesion(vi.fn().mockResolvedValue({ error: { code: 'weak_password', message: 'Password is known to be weak' } }));
      const { puerto } = crear({ sesion });
      await expect(puerto.actualizarContrasena('12345678')).rejects.toMatchObject({
        codigo: 'DATOS_INVALIDOS',
        message: 'La contraseña no cumple los requisitos del servicio; use una más larga o menos común.',
      });
    });

    it('explica una contraseña repetida como dato inválido', async () => {
      const sesion = clienteDeSesion(vi.fn().mockResolvedValue({ error: { code: 'same_password', message: 'New password should be different' } }));
      const { puerto } = crear({ sesion });
      await expect(puerto.actualizarContrasena('clave-actual-1')).rejects.toMatchObject({
        codigo: 'DATOS_INVALIDOS',
        message: 'La contraseña nueva debe ser distinta de la actual.',
      });
    });

    it('trata cualquier otro error como falla del servicio', async () => {
      const sesion = clienteDeSesion(vi.fn().mockResolvedValue({ error: { code: 'session_not_found', message: 'Session not found' } }));
      const { puerto } = crear({ sesion });
      await expect(puerto.actualizarContrasena('clave-nueva-22')).rejects.toMatchObject({ codigo: 'FALLO' });
    });
  });

  describe('solicitarCambioCorreo', () => {
    it('pide la confirmación con el retorno marcado como flujo de correo', async () => {
      const { puerto, sesion } = crear();
      await puerto.solicitarCambioCorreo('nueva@correo.com');
      expect(sesion.updateUser).toHaveBeenCalledWith(
        { email: 'nueva@correo.com' },
        { emailRedirectTo: 'https://app.prueba/auth/confirm?next=%2Fdashboard%2Faccount&flujo=correo' },
      );
    });

    it('detecta un correo ya registrado por su código o por su mensaje', async () => {
      for (const error of [{ code: 'email_exists', message: 'Email exists' }, { message: 'A user with this email address has already been registered' }]) {
        const sesion = clienteDeSesion(vi.fn().mockResolvedValue({ error }));
        const { puerto } = crear({ sesion });
        await expect(puerto.solicitarCambioCorreo('otra@correo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'Ya existe una cuenta con ese correo.' });
      }
    });

    it('trata cualquier otro error como falla del servicio', async () => {
      const sesion = clienteDeSesion(vi.fn().mockResolvedValue({ error: { code: 'over_email_send_rate_limit', message: 'rate limit' } }));
      const { puerto } = crear({ sesion });
      await expect(puerto.solicitarCambioCorreo('nueva@correo.com')).rejects.toMatchObject({ codigo: 'FALLO' });
    });
  });

  describe('actualizarNombre', () => {
    it('actualiza el perfil filtrando por el identificador indicado', async () => {
      const { puerto, servicio } = crear();
      await puerto.actualizarNombre('u-1', 'Ana María');
      expect(servicio.from).toHaveBeenCalledWith('perfiles_usuario');
      expect(servicio.update).toHaveBeenCalledWith({ nombre_mostrado: 'Ana María', actualizado_en: expect.any(String) });
      expect(servicio.eq).toHaveBeenCalledWith('id_usuario', 'u-1');
    });

    it('lanza ErrorCuenta FALLO si el servicio responde con error', async () => {
      const servicio = clienteDeServicio();
      servicio.eq.mockResolvedValue({ error: { message: 'fallo' } });
      const { puerto } = crear({ servicio });
      await expect(puerto.actualizarNombre('u-1', 'Ana')).rejects.toMatchObject({ codigo: 'FALLO' });
    });
  });

  describe('registrarEvento', () => {
    it('llama a registrar_evento_acceso con los nombres de parámetro exactos', async () => {
      const { puerto, servicio } = crear();
      await puerto.registrarEvento('EMAIL_CHANGE_REQUESTED', 'u-1', { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' });
      expect(servicio.rpc).toHaveBeenCalledWith('registrar_evento_acceso', {
        p_id_actor: 'u-1',
        p_id_usuario: 'u-1',
        p_accion: 'EMAIL_CHANGE_REQUESTED',
        p_datos: { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' },
      });
      expect(consolaError).not.toHaveBeenCalled();
    });

    it('deja un diagnóstico con la acción y lanza si el servicio responde con error', async () => {
      const servicio = clienteDeServicio();
      servicio.rpc.mockResolvedValue({ error: { message: 'detalle interno ana@correo.com' } });
      const { puerto } = crear({ servicio });
      await expect(puerto.registrarEvento('PASSWORD_CHANGED', 'u-1', {})).rejects.toThrow('auditoría');
      expect(consolaError).toHaveBeenCalledWith('[cuenta] auditoría no registrada', 'PASSWORD_CHANGED');
      expect(JSON.stringify(consolaError.mock.calls)).not.toContain('ana@correo.com');
    });

    it('también registra el diagnóstico y lanza si la llamada al servicio lanza', async () => {
      const servicio = clienteDeServicio();
      servicio.rpc.mockRejectedValue(new Error('red caída'));
      const { puerto } = crear({ servicio });
      await expect(puerto.registrarEvento('PASSWORD_CHANGED', 'u-1', {})).rejects.toThrow('auditoría');
      expect(consolaError).toHaveBeenCalledWith('[cuenta] auditoría no registrada', 'PASSWORD_CHANGED');
    });
  });
});
