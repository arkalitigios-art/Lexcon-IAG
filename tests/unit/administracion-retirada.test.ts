import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');
const leer = (relativa: string): string => readFileSync(join(SRC, relativa), 'utf8');

const RETIRADOS = [
  'app/api/admin/attorneys/route.ts',
  'app/api/admin/accesses/route.ts',
  'modules/admin/access-management.ts',
  'app/dashboard/admin/attorney-management.tsx',
  'app/dashboard/admin/admin-accesses.tsx',
];

describe('administración unificada en Usuarios y accesos', () => {
  it.each(RETIRADOS)('%s ya no existe', (ruta) => {
    expect(existsSync(join(SRC, ruta))).toBe(false);
  });

  it('service-administration ya no crea ni edita abogados', () => {
    expect(leer('modules/admin/service-administration.ts')).not.toMatch(/createAttorney|updateAttorney|listManagedAttorneys|hashPassword/);
  });

  it('las pantallas retiradas redirigen a Usuarios y accesos', () => {
    expect(leer('app/dashboard/admin/lawyers/new/page.tsx')).toContain("redirect('/dashboard/admin/users?rol=ABOGADO_ARKA')");
    expect(leer('app/dashboard/admin/accesses/page.tsx')).toContain("redirect('/dashboard/admin/users')");
  });

  it('Equipo jurídico enlaza con Usuarios y accesos para invitar', () => {
    expect(leer('app/dashboard/admin/lawyers/page.tsx')).toContain('href="/dashboard/admin/users?rol=ABOGADO_ARKA"');
  });
});
