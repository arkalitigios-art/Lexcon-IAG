import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { corregirCorreo, crearPuertoCorreccion, ErrorCorreo, type PuertoCorreccionCorreo } from '../../src/modules/access/email-correction';

const admin = { id: 'a-1', role: 'ARKA_ADMIN' as const };
const objetivo = { id: 'u-2', nombre: 'Luis', correo: 'luis@viejo.com', activo: true };

function puertoFalso(parcial: Partial<PuertoCorreccionCorreo> = {}): PuertoCorreccionCorreo {
  return {
    buscarUsuario: vi.fn().mockResolvedValue(objetivo),
    existeCorreo: vi.fn().mockResolvedValue(false),
    actualizarCorreoAuth: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

describe('corregirCorreo', () => {
  let consolaError: MockInstance;

  beforeEach(() => {
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consolaError.mockRestore();
  });

  it('cambia el correo en Auth y deja auditoría enmascarada', async () => {
    const puerto = puertoFalso();
    await corregirCorreo(puerto, admin, 'u-2', 'Luis@Nuevo.com');
    expect(puerto.actualizarCorreoAuth).toHaveBeenCalledWith('u-2', 'luis@nuevo.com');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('a-1', 'u-2', { correo_anterior: 'l***@viejo.com', correo_nuevo: 'l***@nuevo.com' });
  });

  it('verifica el correo ya normalizado (minúsculas y sin espacios)', async () => {
    const puerto = puertoFalso();
    await corregirCorreo(puerto, admin, 'u-2', '  Luis@Nuevo.com ');
    expect(puerto.existeCorreo).toHaveBeenCalledWith('luis@nuevo.com');
  });

  it('solo un Administrador puede corregir correos', async () => {
    const puerto = puertoFalso();
    await expect(corregirCorreo(puerto, { id: 'x', role: 'ARKA_ATTORNEY' }, 'u-2', 'a@b.co')).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    expect(puerto.buscarUsuario).not.toHaveBeenCalled();
    expect(puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
  });

  it('un Administrador no corrige su propio correo por esta vía', async () => {
    await expect(corregirCorreo(puertoFalso(), admin, 'a-1', 'a@b.co')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una cuenta inexistente', async () => {
    const puerto = puertoFalso({ buscarUsuario: vi.fn().mockResolvedValue(null) });
    await expect(corregirCorreo(puerto, admin, 'u-9', 'a@b.co')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo ya registrado', async () => {
    const puerto = puertoFalso({ existeCorreo: vi.fn().mockResolvedValue(true) });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'otro@correo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
  });

  it('rechaza un correo igual al actual o inválido', async () => {
    await expect(corregirCorreo(puertoFalso(), admin, 'u-2', 'LUIS@viejo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(corregirCorreo(puertoFalso(), admin, 'u-2', 'sin-arroba')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo que no es texto, vacío o demasiado largo', async () => {
    const puerto = puertoFalso();
    for (const correo of [undefined, null, 42, {}, '', '   ', `${'a'.repeat(250)}@b.co`]) {
      await expect(corregirCorreo(puerto, admin, 'u-2', correo)).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'El correo nuevo no es válido.' });
    }
    expect(puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
  });

  it('valida el formato del correo antes de consultar la cuenta, para no revelar si existe', async () => {
    const puerto = puertoFalso({ buscarUsuario: vi.fn().mockResolvedValue(null) });
    await expect(corregirCorreo(puerto, admin, 'u-desconocido', 'sin-arroba')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'El correo nuevo no es válido.' });
    expect(puerto.buscarUsuario).not.toHaveBeenCalled();
    expect(puerto.existeCorreo).not.toHaveBeenCalled();
  });

  it('rechaza un identificador que no es texto o está vacío sin consultar nada', async () => {
    const puerto = puertoFalso();
    for (const id of [undefined, null, 42, {}, [], '', '   ']) {
      await expect(corregirCorreo(puerto, admin, id, 'luis@nuevo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'La cuenta solicitada no es válida.' });
    }
    expect(puerto.buscarUsuario).not.toHaveBeenCalled();
    expect(puerto.existeCorreo).not.toHaveBeenCalled();
    expect(puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
    expect(puerto.registrarEvento).not.toHaveBeenCalled();
  });

  it('la autorización y la comprobación de la propia cuenta van antes que la validación del identificador', async () => {
    const puerto = puertoFalso();
    await expect(corregirCorreo(puerto, { id: 'x', role: 'ARKA_ATTORNEY' }, 42, 'luis@nuevo.com')).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await expect(corregirCorreo(puerto, admin, 'a-1', 'luis@nuevo.com')).rejects.toMatchObject({ message: 'Para cambiar su propio correo use Mi cuenta.' });
    expect(puerto.buscarUsuario).not.toHaveBeenCalled();
  });

  it('si el primer cambio de correo falla, no audita ni intenta revertir', async () => {
    const actualizarCorreoAuth = vi.fn().mockRejectedValue(new ErrorCorreo('FALLO', 'No fue posible actualizar el correo en el servicio de acceso.'));
    const puerto = puertoFalso({ actualizarCorreoAuth });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'luis@nuevo.com')).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible actualizar el correo en el servicio de acceso.' });
    expect(actualizarCorreoAuth).toHaveBeenCalledTimes(1);
    expect(actualizarCorreoAuth).toHaveBeenCalledWith('u-2', 'luis@nuevo.com');
    expect(puerto.registrarEvento).not.toHaveBeenCalled();
  });

  it('revierte el correo si falla la auditoría', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'luis@nuevo.com')).rejects.toBeInstanceOf(ErrorCorreo);
    expect(puerto.actualizarCorreoAuth).toHaveBeenNthCalledWith(1, 'u-2', 'luis@nuevo.com');
    expect(puerto.actualizarCorreoAuth).toHaveBeenNthCalledWith(2, 'u-2', 'luis@viejo.com');
  });

  it('si la auditoría falla y la reversión funciona, informa que el correo no se modificó', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'luis@nuevo.com')).rejects.toMatchObject({
      codigo: 'FALLO',
      message: 'No fue posible registrar el cambio en la auditoría. El correo no se modificó.',
    });
    expect(puerto.actualizarCorreoAuth).toHaveBeenCalledTimes(2);
    expect(consolaError).not.toHaveBeenCalled();
  });

  it('si la auditoría falla y la reversión también, no afirma que el correo no se modificó', async () => {
    const actualizarCorreoAuth = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ErrorCorreo('FALLO', 'detalle-interno-de-auth'));
    const puerto = puertoFalso({ actualizarCorreoAuth, registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    const error = await corregirCorreo(puerto, admin, 'u-2', 'luis@nuevo.com').catch((causa: unknown) => causa);
    expect(error).toBeInstanceOf(ErrorCorreo);
    expect(error).toMatchObject({
      codigo: 'FALLO',
      message: 'El correo se cambió pero no se pudo registrar en la auditoría ni revertir. Verifique el correo de la cuenta en Supabase.',
    });
    expect((error as Error).message).not.toContain('no se modificó');
    expect(actualizarCorreoAuth).toHaveBeenCalledTimes(2);
    expect(consolaError).toHaveBeenCalledTimes(1);
    expect(consolaError).toHaveBeenCalledWith('[correo] no se pudo revertir el cambio de correo');
    const registro = JSON.stringify(consolaError.mock.calls);
    for (const secreto of ['luis@viejo.com', 'luis@nuevo.com', 'detalle-interno-de-auth']) expect(registro).not.toContain(secreto);
  });
});

describe('crearPuertoCorreccion', () => {
  let consolaError: MockInstance;

  beforeEach(() => {
    consolaError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consolaError.mockRestore();
  });

  function clienteFalso() {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqPerfil = vi.fn(() => ({ maybeSingle }));
    const eqConteo = vi.fn().mockResolvedValue({ count: 0, error: null });
    const select = vi.fn((_columnas: string, opciones?: unknown) => (opciones ? { eq: eqConteo } : { eq: eqPerfil }));
    const from = vi.fn(() => ({ select }));
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const cliente = { from, rpc, auth: { admin: { updateUserById } } } as unknown as SupabaseClient;
    return { cliente, from, select, eqPerfil, eqConteo, maybeSingle, updateUserById, rpc };
  }

  describe('buscarUsuario', () => {
    it('lee el perfil y lo traduce al modelo del servicio', async () => {
      const falso = clienteFalso();
      falso.maybeSingle.mockResolvedValue({ data: { id_usuario: 'u-2', nombre_mostrado: 'Luis', correo_electronico: 'luis@viejo.com', activo: true }, error: null });
      const usuario = await crearPuertoCorreccion(falso.cliente).buscarUsuario('u-2');
      expect(falso.from).toHaveBeenCalledWith('perfiles_usuario');
      expect(falso.select).toHaveBeenCalledTimes(1);
      expect(falso.select).toHaveBeenCalledWith('id_usuario,nombre_mostrado,correo_electronico,activo');
      expect(falso.eqPerfil).toHaveBeenCalledWith('id_usuario', 'u-2');
      expect(usuario).toEqual(objetivo);
    });

    it('devuelve null si no hay perfil', async () => {
      const falso = clienteFalso();
      expect(await crearPuertoCorreccion(falso.cliente).buscarUsuario('u-9')).toBeNull();
    });

    it('un error de consulta se convierte en un fallo controlado', async () => {
      const falso = clienteFalso();
      falso.maybeSingle.mockResolvedValue({ data: null, error: { message: 'detalle-interno-de-postgres' } });
      const error = await crearPuertoCorreccion(falso.cliente).buscarUsuario('u-2').catch((causa: unknown) => causa);
      expect(error).toBeInstanceOf(ErrorCorreo);
      expect(error).toMatchObject({ codigo: 'FALLO', message: 'No fue posible consultar la cuenta.' });
    });
  });

  describe('existeCorreo', () => {
    it('compara con la dirección en minúsculas', async () => {
      const falso = clienteFalso();
      await crearPuertoCorreccion(falso.cliente).existeCorreo('Luis@Nuevo.COM');
      expect(falso.eqConteo).toHaveBeenCalledWith('correo_electronico', 'luis@nuevo.com');
    });

    it('indica si ya hay perfiles con ese correo', async () => {
      const falso = clienteFalso();
      const puerto = crearPuertoCorreccion(falso.cliente);
      expect(await puerto.existeCorreo('a@b.co')).toBe(false);
      falso.eqConteo.mockResolvedValue({ count: 1, error: null });
      expect(await puerto.existeCorreo('a@b.co')).toBe(true);
    });

    it('un error de consulta se convierte en un fallo controlado', async () => {
      const falso = clienteFalso();
      falso.eqConteo.mockResolvedValue({ count: null, error: { message: 'detalle-interno-de-postgres' } });
      await expect(crearPuertoCorreccion(falso.cliente).existeCorreo('a@b.co')).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible verificar el correo.' });
    });
  });

  describe('actualizarCorreoAuth', () => {
    it('actualiza el correo y lo deja confirmado', async () => {
      const falso = clienteFalso();
      await crearPuertoCorreccion(falso.cliente).actualizarCorreoAuth('u-2', 'luis@nuevo.com');
      expect(falso.updateUserById).toHaveBeenCalledWith('u-2', { email: 'luis@nuevo.com', email_confirm: true });
    });

    it.each([
      ['el código email_exists', { code: 'email_exists', message: 'Mensaje sin pistas' }],
      ['un mensaje que dice already', { message: 'A user with this email address has already been registered' }],
      ['un mensaje que dice registered', { message: 'Email already REGISTERED' }],
    ])('detecta un correo duplicado por %s', async (_caso, error) => {
      const falso = clienteFalso();
      falso.updateUserById.mockResolvedValue({ error });
      const causa = await crearPuertoCorreccion(falso.cliente).actualizarCorreoAuth('u-2', 'luis@nuevo.com').catch((c: unknown) => c);
      expect(causa).toBeInstanceOf(ErrorCorreo);
      expect(causa).toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'Ya existe una cuenta con ese correo.' });
    });

    it('cualquier otro error es un fallo controlado que no muestra el texto del proveedor', async () => {
      const falso = clienteFalso();
      falso.updateUserById.mockResolvedValue({ error: { code: 'unexpected_failure', message: 'detalle-interno-del-proveedor' } });
      const causa = await crearPuertoCorreccion(falso.cliente).actualizarCorreoAuth('u-2', 'luis@nuevo.com').catch((c: unknown) => c);
      expect(causa).toBeInstanceOf(ErrorCorreo);
      expect(causa).toMatchObject({ codigo: 'FALLO', message: 'No fue posible actualizar el correo en el servicio de acceso.' });
      expect((causa as Error).message).not.toContain('detalle-interno');
    });
  });

  describe('registrarEvento', () => {
    it('registra EMAIL_CORRECTED con el actor, la cuenta y los datos enmascarados', async () => {
      const falso = clienteFalso();
      const datos = { correo_anterior: 'l***@viejo.com', correo_nuevo: 'l***@nuevo.com' };
      await crearPuertoCorreccion(falso.cliente).registrarEvento('a-1', 'u-2', datos);
      expect(falso.rpc).toHaveBeenCalledWith('registrar_evento_acceso', { p_id_actor: 'a-1', p_id_usuario: 'u-2', p_accion: 'EMAIL_CORRECTED', p_datos: datos });
      expect(consolaError).not.toHaveBeenCalled();
    });

    it('si la auditoría falla deja un diagnóstico fijo, sin correos, y lanza', async () => {
      const falso = clienteFalso();
      falso.rpc.mockResolvedValue({ error: { message: 'luis@viejo.com no pudo registrarse' } });
      await expect(crearPuertoCorreccion(falso.cliente).registrarEvento('a-1', 'u-2', { correo_anterior: 'l***@viejo.com', correo_nuevo: 'l***@nuevo.com' })).rejects.toThrow('auditoría');
      expect(consolaError).toHaveBeenCalledTimes(1);
      expect(consolaError).toHaveBeenCalledWith('[correo] auditoría no registrada');
      const registro = JSON.stringify(consolaError.mock.calls);
      for (const secreto of ['luis@viejo.com', 'viejo.com', 'nuevo.com']) expect(registro).not.toContain(secreto);
    });

    it('si la llamada a la auditoría lanza, también deja el diagnóstico fijo y lanza', async () => {
      const falso = clienteFalso();
      falso.rpc.mockRejectedValue(new Error('red caída hacia luis@viejo.com'));
      await expect(crearPuertoCorreccion(falso.cliente).registrarEvento('a-1', 'u-2', {})).rejects.toThrow('auditoría');
      expect(consolaError).toHaveBeenCalledWith('[correo] auditoría no registrada');
      expect(JSON.stringify(consolaError.mock.calls)).not.toContain('luis@viejo.com');
    });
  });
});
