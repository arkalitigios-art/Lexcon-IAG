import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { claveDeRutaMenu, FUNCIONES, funcionDisponible, rutaMenuDisponible, type ClaveFuncion } from '../../src/platform/features';

const CLAVES = Object.keys(FUNCIONES) as ClaveFuncion[];

describe('funciones disponibles con Supabase', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('en modo local (SQLite) todas las funciones están disponibles', () => {
    mocks.configurado.mockReturnValue(false);
    for (const clave of CLAVES) expect(funcionDisponible(clave)).toBe(true);
  });

  it('con Supabase cada función responde lo declarado en la tabla', () => {
    mocks.configurado.mockReturnValue(true);
    for (const clave of CLAVES) expect(funcionDisponible(clave)).toBe(FUNCIONES[clave].disponibleConSupabase);
  });

  it('las funciones de los subproyectos B y C siguen no disponibles con Supabase', () => {
    mocks.configurado.mockReturnValue(true);
    const pendientes = ['REGLAMENTOS', 'COTIZACIONES', 'ESTUDIO_MERCADO', 'COMITE_EVALUACION', 'FLUJO_TRANSICIONES', 'DOCUMENTOS_GENERADOS', 'NOTIFICACIONES_PUSH'] as const;
    for (const clave of pendientes) expect(funcionDisponible(clave)).toBe(false);
  });

  it('una configuración de Supabase incompleta cuenta como modo Supabase (nunca se cae a SQLite)', () => {
    mocks.configurado.mockImplementation(() => { throw new Error('La configuración de Supabase está incompleta.'); });
    expect(funcionDisponible('REGLAMENTOS')).toBe(false);
  });

  it('relaciona las opciones del menú con su función sin tener en cuenta la consulta ni el ancla', () => {
    expect(claveDeRutaMenu('/dashboard/regulations')).toBe('REGLAMENTOS');
    expect(claveDeRutaMenu('/dashboard/regulations#manual')).toBe('REGLAMENTOS');
    expect(claveDeRutaMenu('/dashboard/admin/users?rol=ABOGADO_ARKA')).toBeNull();
    expect(claveDeRutaMenu('/dashboard/institution#opening')).toBeNull();
  });

  it('solo oculta del menú lo que no está disponible', () => {
    mocks.configurado.mockReturnValue(true);
    expect(rutaMenuDisponible('/dashboard/regulations')).toBe(false);
    expect(rutaMenuDisponible('/dashboard/admin')).toBe(true);
    mocks.configurado.mockReturnValue(false);
    expect(rutaMenuDisponible('/dashboard/regulations')).toBe(true);
  });
});
