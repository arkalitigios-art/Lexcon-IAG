import { describe, expect, it, vi } from 'vitest';
import {
  actualizarInstitucion,
  crearInstitucion,
  ErrorInstitucion,
  listarInstituciones,
  obtenerInstitucion,
  validarDatosInstitucion,
  type InstitucionAdministrada,
  type PuertoInstituciones,
} from '../../src/modules/admin/institutions/institution-service';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
const EXISTENTE: InstitucionAdministrada = {
  id: 'ie-1', nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null,
  estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 2, procesos: 1,
};
const VALIDA = { nombre: '  IE   San José ', ciudad: ' Montería ', departamento: 'Córdoba', nit: '', codigoDane: ' 123456789012 ', estado: 'SUSPENDED_ARREARS', observacion: '   ' };

function crearPuerto() {
  return {
    listar: vi.fn(async () => [EXISTENTE]),
    obtener: vi.fn(async (id: string) => (id === 'ie-1' ? EXISTENTE : null)),
    guardar: vi.fn(async (id: string | null) => id ?? 'ie-nueva'),
  } satisfies PuertoInstituciones;
}

describe('servicio de Instituciones Educativas', () => {
  it('solo el Administrador puede listar', async () => {
    const puerto = crearPuerto();
    await expect(listarInstituciones(puerto, ABOGADO)).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO', message: 'No tienes autorización para administrar el servicio.' });
    expect(puerto.listar).not.toHaveBeenCalled();
    expect(await listarInstituciones(puerto, ADMIN)).toEqual([EXISTENTE]);
  });

  it('crea con los datos normalizados y devuelve el identificador', async () => {
    const puerto = crearPuerto();
    expect(await crearInstitucion(puerto, ADMIN, VALIDA)).toBe('ie-nueva');
    expect(puerto.guardar).toHaveBeenCalledWith(null, {
      nombre: 'IE San José', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: '123456789012', estado: 'SUSPENDED_ARREARS', observacion: null,
    }, ADMIN);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ nombre: 'IE' }, 'El nombre de la Institución Educativa debe tener entre 3 y 120 caracteres.'],
    [{ ciudad: 'M' }, 'La ciudad o municipio debe tener entre 2 y 100 caracteres.'],
    [{ departamento: undefined }, 'El departamento debe tener entre 2 y 100 caracteres.'],
    [{ nit: '80012A' }, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).'],
    [{ nit: 800123 }, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).'],
    [{ codigoDane: '12-34' }, 'El código DANE solo admite números (entre 5 y 15 dígitos).'],
    [{ estado: 'ACTIVO' }, 'Selecciona un estado de servicio válido.'],
    [{ observacion: 'x'.repeat(501) }, 'La observación administrativa no puede superar 500 caracteres.'],
  ])('rechaza datos inválidos (%o)', async (cambio, mensaje) => {
    const puerto = crearPuerto();
    await expect(crearInstitucion(puerto, ADMIN, { ...VALIDA, ...cambio })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: mensaje });
    expect(puerto.guardar).not.toHaveBeenCalled();
  });

  it('acepta un NIT con puntos y guion', () => {
    expect(validarDatosInstitucion({ ...VALIDA, nit: ' 800.123.456-7 ' }).nit).toBe('800123456-7');
    // Con y sin puntos es el mismo NIT: se guarda sin puntos para que la restricción de unicidad lo detecte.
    expect(validarDatosInstitucion({ ...VALIDA, nit: '800123456-7' }).nit).toBe('800123456-7');
  });

  it('actualizar exige una IE indicada y existente', async () => {
    const puerto = crearPuerto();
    await expect(actualizarInstitucion(puerto, ADMIN, '  ', VALIDA)).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'Selecciona una Institución Educativa.' });
    await expect(actualizarInstitucion(puerto, ADMIN, 'ie-9', VALIDA)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADA', message: 'La Institución Educativa no existe.' });
    expect(puerto.guardar).not.toHaveBeenCalled();
    expect(await actualizarInstitucion(puerto, ADMIN, 'ie-1', { ...VALIDA, estado: 'ENDED' })).toBe('ie-1');
    expect(puerto.guardar).toHaveBeenCalledWith('ie-1', expect.objectContaining({ estado: 'ENDED' }), ADMIN);
  });

  it('el abogado no puede crear ni actualizar', async () => {
    const puerto = crearPuerto();
    await expect(crearInstitucion(puerto, ABOGADO, VALIDA)).rejects.toBeInstanceOf(ErrorInstitucion);
    await expect(actualizarInstitucion(puerto, ABOGADO, 'ie-1', VALIDA)).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    expect(puerto.obtener).not.toHaveBeenCalled();
    expect(puerto.guardar).not.toHaveBeenCalled();
  });

  it('obtener ignora identificadores vacíos sin consultar', async () => {
    const puerto = crearPuerto();
    expect(await obtenerInstitucion(puerto, ADMIN, undefined)).toBeNull();
    expect(puerto.obtener).not.toHaveBeenCalled();
    expect(await obtenerInstitucion(puerto, ADMIN, 'ie-1')).toEqual(EXISTENTE);
  });
});
