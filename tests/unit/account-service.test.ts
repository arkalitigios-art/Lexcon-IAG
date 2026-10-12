import { describe, expect, it, vi } from 'vitest';
import { actualizarNombre, cambiarContrasena, ErrorCuenta, solicitarCambioCorreo, type PuertoCuenta } from '../../src/modules/access/account-service';

const sesion = { idUsuario: 'u-1', correo: 'ana@correo.com' };

function puertoFalso(parcial: Partial<PuertoCuenta> = {}): PuertoCuenta {
  return {
    verificarContrasena: vi.fn().mockResolvedValue(true),
    actualizarContrasena: vi.fn().mockResolvedValue(undefined),
    solicitarCambioCorreo: vi.fn().mockResolvedValue(undefined),
    actualizarNombre: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

describe('cambiarContrasena', () => {
  it('verifica la contraseña actual y actualiza la nueva', async () => {
    const puerto = puertoFalso();
    await cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-nueva-22' });
    expect(puerto.verificarContrasena).toHaveBeenCalledWith('ana@correo.com', 'clave-actual-1');
    expect(puerto.actualizarContrasena).toHaveBeenCalledWith('clave-nueva-22');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('PASSWORD_CHANGED', 'u-1', {});
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    const puerto = puertoFalso({ verificarContrasena: vi.fn().mockResolvedValue(false) });
    await expect(cambiarContrasena(puerto, sesion, { actual: 'mala', nueva: 'clave-nueva-22' })).rejects.toMatchObject({ codigo: 'CONTRASENA_INCORRECTA' });
    expect(puerto.actualizarContrasena).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva de menos de 8 caracteres', async () => {
    await expect(cambiarContrasena(puertoFalso(), sesion, { actual: 'clave-actual-1', nueva: '1234567' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una contraseña nueva igual a la actual', async () => {
    await expect(cambiarContrasena(puertoFalso(), sesion, { actual: 'clave-actual-1', nueva: 'clave-actual-1' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('no revierte el cambio si falla el registro de auditoría', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-nueva-22' })).resolves.toBeUndefined();
    expect(puerto.actualizarContrasena).toHaveBeenCalled();
  });

  it('rechaza una contraseña actual ausente o vacía sin consultar al servicio', async () => {
    for (const actual of [undefined, '', 42]) {
      const puerto = puertoFalso();
      await expect(cambiarContrasena(puerto, sesion, { actual, nueva: 'clave-nueva-22' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
      expect(puerto.verificarContrasena).not.toHaveBeenCalled();
      expect(puerto.actualizarContrasena).not.toHaveBeenCalled();
    }
  });

  it('no verifica la contraseña cuando la nueva es igual a la actual', async () => {
    const puerto = puertoFalso();
    await expect(cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-actual-1' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.verificarContrasena).not.toHaveBeenCalled();
    expect(puerto.actualizarContrasena).not.toHaveBeenCalled();
  });

  it('no revierte el cambio si el registro de auditoría lanza de forma síncrona', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn(() => { throw new Error('auditoría'); }) });
    await expect(cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-nueva-22' })).resolves.toBeUndefined();
    expect(puerto.actualizarContrasena).toHaveBeenCalled();
  });
});

describe('solicitarCambioCorreo', () => {
  it('pide la confirmación al correo nuevo en minúsculas', async () => {
    const puerto = puertoFalso();
    await solicitarCambioCorreo(puerto, sesion, { contrasenaActual: 'clave-actual-1', correoNuevo: 'Nueva@Correo.com' });
    expect(puerto.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('EMAIL_CHANGE_REQUESTED', 'u-1', { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' });
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    const puerto = puertoFalso({ verificarContrasena: vi.fn().mockResolvedValue(false) });
    await expect(solicitarCambioCorreo(puerto, sesion, { contrasenaActual: 'mala', correoNuevo: 'nueva@correo.com' })).rejects.toBeInstanceOf(ErrorCuenta);
    expect(puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
  });

  it('rechaza un correo inválido o igual al actual', async () => {
    await expect(solicitarCambioCorreo(puertoFalso(), sesion, { contrasenaActual: 'x', correoNuevo: 'sin-arroba' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(solicitarCambioCorreo(puertoFalso(), sesion, { contrasenaActual: 'x', correoNuevo: 'ANA@correo.com' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo de más de 254 caracteres sin consultar al servicio', async () => {
    const puerto = puertoFalso();
    const largo = `${'a'.repeat(250)}@b.co`;
    expect(largo.length).toBeGreaterThan(254);
    await expect(solicitarCambioCorreo(puerto, sesion, { contrasenaActual: 'clave-actual-1', correoNuevo: largo })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.verificarContrasena).not.toHaveBeenCalled();
    expect(puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña actual ausente o vacía', async () => {
    for (const contrasenaActual of [undefined, '']) {
      const puerto = puertoFalso();
      await expect(solicitarCambioCorreo(puerto, sesion, { contrasenaActual, correoNuevo: 'nueva@correo.com' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
      expect(puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
    }
  });

  it('no deshace la solicitud si falla el registro de auditoría', async () => {
    const asincrono = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(solicitarCambioCorreo(asincrono, sesion, { contrasenaActual: 'clave-actual-1', correoNuevo: 'nueva@correo.com' })).resolves.toBeUndefined();
    expect(asincrono.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');

    const sincrono = puertoFalso({ registrarEvento: vi.fn(() => { throw new Error('auditoría'); }) });
    await expect(solicitarCambioCorreo(sincrono, sesion, { contrasenaActual: 'clave-actual-1', correoNuevo: 'nueva@correo.com' })).resolves.toBeUndefined();
    expect(sincrono.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');
  });
});

describe('actualizarNombre', () => {
  it('guarda el nombre sin espacios sobrantes', async () => {
    const puerto = puertoFalso();
    await actualizarNombre(puerto, sesion, { nombre: '  Ana María  ' });
    expect(puerto.actualizarNombre).toHaveBeenCalledWith('u-1', 'Ana María');
  });

  it('rechaza un nombre vacío', async () => {
    await expect(actualizarNombre(puertoFalso(), sesion, { nombre: '   ' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un nombre de más de 160 caracteres y acepta uno de exactamente 160', async () => {
    const puerto = puertoFalso();
    await expect(actualizarNombre(puerto, sesion, { nombre: 'x'.repeat(161) })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.actualizarNombre).not.toHaveBeenCalled();
    await actualizarNombre(puerto, sesion, { nombre: 'x'.repeat(160) });
    expect(puerto.actualizarNombre).toHaveBeenCalledWith('u-1', 'x'.repeat(160));
  });
});
