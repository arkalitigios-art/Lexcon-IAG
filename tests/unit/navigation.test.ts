import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { navFor } from '../../src/app/dashboard/_components/navigation';
import { rutaMenuDisponible } from '../../src/platform/features';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };
const COMITE: CurrentUser = { id: 'c-1', name: 'Comité', role: 'IE_COMMITTEE', institutionId: 'ie-1', institutionName: 'IE Uno' };
const SECCIONES = ['OPERACIÓN CONTRACTUAL', 'ADMINISTRACIÓN LEXCON', 'MI ESPACIO'];

describe('menú lateral', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('en modo local muestra todas las opciones del Administrador', () => {
    mocks.configurado.mockReturnValue(false);
    const items = navFor(ADMIN);
    const etiquetas = items.map((item) => item.label);
    for (const etiqueta of ['Bandeja de trabajo', 'Asignar responsable jurídico', 'Alertas y bloqueos', 'Instituciones Educativas', 'Equipo jurídico', 'Usuarios y accesos', 'Registro de actuaciones']) expect(etiquetas).toContain(etiqueta);
    expect(items.flatMap((item) => (item.section ? [item.section] : []))).toEqual(SECCIONES);
    expect(items.at(-1)).toMatchObject({ label: 'Mi cuenta', pinned: true });
  });

  it('con Supabase oculta las funciones no disponibles y conserva los rótulos de sección', () => {
    mocks.configurado.mockReturnValue(true);
    const items = navFor(ADMIN);
    for (const item of items) expect(rutaMenuDisponible(item.href)).toBe(true);
    expect(items.flatMap((item) => (item.section ? [item.section] : []))).toEqual(SECCIONES);
    expect(items[0]).toMatchObject({ label: 'Bandeja de trabajo', section: 'OPERACIÓN CONTRACTUAL' });
    expect(items.map((item) => item.label)).toContain('Usuarios y accesos');
  });

  it('con Supabase la IE no ve el Manual de contratación mientras no esté migrado', () => {
    mocks.configurado.mockReturnValue(true);
    expect(navFor(RECTOR).map((item) => item.href)).not.toContain('/dashboard/regulations');
    mocks.configurado.mockReturnValue(false);
    expect(navFor(RECTOR).map((item) => item.href)).toContain('/dashboard/regulations');
  });

  it('Registrar abogado Lexcon lleva a Usuarios y accesos con el rol Abogado y Equipo jurídico está disponible', () => {
    mocks.configurado.mockReturnValue(true);
    const items = navFor(ADMIN);
    expect(items).toContainEqual(expect.objectContaining({ label: 'Registrar abogado Lexcon', href: '/dashboard/admin/users?rol=ABOGADO_ARKA' }));
    expect(items.map((item) => item.href)).not.toContain('/dashboard/admin/lawyers/new');
    expect(items.map((item) => item.label)).toContain('Equipo jurídico');
  });

  it('el comité no tiene menú ni Mi cuenta', () => {
    mocks.configurado.mockReturnValue(true);
    expect(navFor(COMITE)).toEqual([]);
  });
});
