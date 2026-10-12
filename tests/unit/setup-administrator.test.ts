import { describe, expect, it, vi } from 'vitest';
import {
  codigoConfiguracionActivo, codigoCoincide, crearPrimerAdministrador, ErrorConfiguracion,
  estadoConfiguracion, listarAdministradores, recuperarAdministrador, type PuertoConfiguracion,
} from '../../src/modules/access/setup-administrator';

const CODIGO = 'codigo-de-prueba-con-24-caracteres!';

function puertoFalso(parcial: Partial<PuertoConfiguracion> = {}): PuertoConfiguracion {
  return {
    contarAdministradoresActivos: vi.fn().mockResolvedValue(0),
    listarAdministradoresActivos: vi.fn().mockResolvedValue([]),
    crearUsuarioAuth: vi.fn().mockResolvedValue({ id: 'u-1' }),
    registrarAdministrador: vi.fn().mockResolvedValue(undefined),
    eliminarUsuarioAuth: vi.fn().mockResolvedValue(undefined),
    actualizarCredenciales: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

const entradaValida = { codigo: CODIGO, nombre: 'Ana Pérez', correo: 'Ana@Correo.com', contrasena: 'clave-segura-1' };

describe('código de configuración', () => {
  it('solo está activo si tiene al menos 24 caracteres', () => {
    expect(codigoConfiguracionActivo({ LEXCON_SETUP_TOKEN: 'corto' } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(codigoConfiguracionActivo({} as NodeJS.ProcessEnv)).toBeNull();
    expect(codigoConfiguracionActivo({ LEXCON_SETUP_TOKEN: `  ${CODIGO}  ` } as unknown as NodeJS.ProcessEnv)).toBe(CODIGO);
  });

  it('compara en tiempo constante sin lanzar con longitudes distintas', () => {
    expect(codigoCoincide(CODIGO, CODIGO)).toBe(true);
    expect(codigoCoincide(CODIGO, `${CODIGO}x`)).toBe(false);
    expect(codigoCoincide(CODIGO, 'x')).toBe(false);
    expect(codigoCoincide(CODIGO, undefined)).toBe(false);
  });
});

describe('estado de configuración', () => {
  it('es primer administrador cuando no hay administradores activos', async () => {
    await expect(estadoConfiguracion(puertoFalso())).resolves.toBe('PRIMER_ADMINISTRADOR');
  });

  it('es recuperación cuando ya existe uno', async () => {
    const puerto = puertoFalso({ contarAdministradoresActivos: vi.fn().mockResolvedValue(1) });
    await expect(estadoConfiguracion(puerto)).resolves.toBe('RECUPERACION');
  });
});

describe('crearPrimerAdministrador', () => {
  it('crea la cuenta con el correo en minúsculas y registra el rol', async () => {
    const puerto = puertoFalso();
    await crearPrimerAdministrador(puerto, CODIGO, entradaValida);
    expect(puerto.crearUsuarioAuth).toHaveBeenCalledWith({ correo: 'ana@correo.com', contrasena: 'clave-segura-1', nombre: 'Ana Pérez' });
    expect(puerto.registrarAdministrador).toHaveBeenCalledWith({ idUsuario: 'u-1', nombre: 'Ana Pérez', correo: 'ana@correo.com' });
  });

  it('rechaza un código incorrecto sin tocar el puerto', async () => {
    const puerto = puertoFalso();
    await expect(crearPrimerAdministrador(puerto, CODIGO, { ...entradaValida, codigo: 'otro' })).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('responde "no disponible" si el servidor no tiene código', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), null, entradaValida)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
  });

  it('rechaza contraseñas de menos de 8 caracteres', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), CODIGO, { ...entradaValida, contrasena: '1234567' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo inválido', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), CODIGO, { ...entradaValida, correo: 'sin-arroba' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('no permite crear otro administrador si ya existe uno activo', async () => {
    const puerto = puertoFalso({ contarAdministradoresActivos: vi.fn().mockResolvedValue(1) });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('elimina la cuenta de Auth si falla el registro del rol', async () => {
    const puerto = puertoFalso({ registrarAdministrador: vi.fn().mockRejectedValue(new Error('rpc')) });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'FALLO' });
    expect(puerto.eliminarUsuarioAuth).toHaveBeenCalledWith('u-1');
  });
});

describe('recuperación del administrador', () => {
  const admin = { id: 'a-1', nombre: 'Ana', correo: 'ana@correo.com' };
  const conAdmin = () => puertoFalso({
    contarAdministradoresActivos: vi.fn().mockResolvedValue(1),
    listarAdministradoresActivos: vi.fn().mockResolvedValue([admin]),
  });

  it('lista administradores solo con el código correcto', async () => {
    await expect(listarAdministradores(conAdmin(), CODIGO, 'otro')).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    await expect(listarAdministradores(conAdmin(), CODIGO, CODIGO)).resolves.toEqual([admin]);
  });

  it('no lista si todavía no hay administradores', async () => {
    await expect(listarAdministradores(puertoFalso(), CODIGO, CODIGO)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
  });

  it('actualiza correo y contraseña y deja auditoría enmascarada', async () => {
    const puerto = conAdmin();
    await recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: 'Nuevo@Correo.com', contrasena: 'otra-clave-123' });
    expect(puerto.actualizarCredenciales).toHaveBeenCalledWith('a-1', { correo: 'nuevo@correo.com', contrasena: 'otra-clave-123' });
    expect(puerto.registrarEvento).toHaveBeenCalledWith('ADMIN_RECOVERED', 'a-1', { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' });
  });

  it('permite cambiar solo la contraseña', async () => {
    const puerto = conAdmin();
    await recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: '', contrasena: 'otra-clave-123' });
    expect(puerto.actualizarCredenciales).toHaveBeenCalledWith('a-1', { contrasena: 'otra-clave-123' });
  });

  it('rechaza un identificador que no es un administrador activo', async () => {
    await expect(recuperarAdministrador(conAdmin(), CODIGO, { codigo: CODIGO, idUsuario: 'otra', correo: '', contrasena: 'otra-clave-123' }))
      .rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('el error de código incorrecto es una ErrorConfiguracion', async () => {
    await expect(recuperarAdministrador(conAdmin(), CODIGO, { codigo: 'x', idUsuario: 'a-1', correo: '', contrasena: 'otra-clave-123' }))
      .rejects.toBeInstanceOf(ErrorConfiguracion);
  });
});

describe('el código se verifica antes que cualquier otra cosa', () => {
  const conAdmin = () => puertoFalso({
    contarAdministradoresActivos: vi.fn().mockResolvedValue(1),
    listarAdministradoresActivos: vi.fn().mockResolvedValue([{ id: 'a-1', nombre: 'Ana', correo: 'ana@correo.com' }]),
  });

  it('crear: un código incorrecto gana a datos inválidos y a un administrador existente', async () => {
    const puerto = conAdmin();
    await expect(crearPrimerAdministrador(puerto, CODIGO, { ...entradaValida, codigo: 'otro', correo: 'x', contrasena: '1' })).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(puerto.contarAdministradoresActivos).not.toHaveBeenCalled();
    expect(puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('listar: un código incorrecto gana al estado sin administradores', async () => {
    const puerto = puertoFalso();
    await expect(listarAdministradores(puerto, CODIGO, 'otro')).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(puerto.contarAdministradoresActivos).not.toHaveBeenCalled();
  });

  it('recuperar: un código incorrecto gana a datos inválidos y no toca el puerto', async () => {
    const puerto = conAdmin();
    await expect(recuperarAdministrador(puerto, CODIGO, { codigo: 'otro', idUsuario: 'no-existe', correo: 'x', contrasena: '1' })).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(puerto.actualizarCredenciales).not.toHaveBeenCalled();
    expect(puerto.registrarEvento).not.toHaveBeenCalled();
  });

  it('acepta el código aunque llegue con espacios o saltos de línea alrededor', async () => {
    const puerto = puertoFalso();
    await crearPrimerAdministrador(puerto, CODIGO, { ...entradaValida, codigo: `  ${CODIGO}\n` });
    expect(puerto.crearUsuarioAuth).toHaveBeenCalled();
  });
});

describe('casos de error adicionales', () => {
  it('propaga el error de Auth y no registra el rol', async () => {
    const puerto = puertoFalso({ crearUsuarioAuth: vi.fn().mockRejectedValue(new ErrorConfiguracion('DATOS_INVALIDOS', 'Ya existe una cuenta con este correo.')) });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.registrarAdministrador).not.toHaveBeenCalled();
  });

  it('devuelve FALLO aunque la reversión también falle', async () => {
    const puerto = puertoFalso({
      registrarAdministrador: vi.fn().mockRejectedValue(new Error('rpc')),
      eliminarUsuarioAuth: vi.fn().mockRejectedValue(new Error('no se pudo eliminar')),
    });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'FALLO' });
  });

  it('rechaza nombres vacíos, demasiado largos o que no son texto', async () => {
    for (const nombre of ['', '   ', 'a'.repeat(161), 42]) {
      await expect(crearPrimerAdministrador(puertoFalso(), CODIGO, { ...entradaValida, nombre })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    }
  });

  it('recuperar: no actualiza nada con una contraseña corta ni con un correo inválido o que no es texto', async () => {
    const puerto = puertoFalso({
      contarAdministradoresActivos: vi.fn().mockResolvedValue(1),
      listarAdministradoresActivos: vi.fn().mockResolvedValue([{ id: 'a-1', nombre: 'Ana', correo: 'ana@correo.com' }]),
    });
    await expect(recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: '', contrasena: '1234567' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: 'sin-arroba', contrasena: 'otra-clave-123' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: 123, contrasena: 'otra-clave-123' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.actualizarCredenciales).not.toHaveBeenCalled();
    expect(puerto.registrarEvento).not.toHaveBeenCalled();
  });
});
