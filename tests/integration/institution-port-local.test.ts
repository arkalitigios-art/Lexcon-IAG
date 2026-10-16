import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { crearPuertoInstitucionesLocal } from '../../src/modules/admin/institutions/institution-port-local';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const original = process.env.LEXCON_DATABASE_URL;
let directorio = '';

afterEach(() => {
  closeDatabaseForTests();
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = '';
  if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original;
});

function prepararAdministrador(): CurrentUser {
  directorio = mkdtempSync(join(tmpdir(), 'lexcon-ie-'));
  process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
  migrate();
  const id = randomUUID();
  const ahora = new Date().toISOString();
  getSqlite().prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(id, 'admin@test.invalid', 'Admin', 'hash', ahora);
  getSqlite().prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, NULL, ?, 1, ?)').run(randomUUID(), id, 'ARKA_ADMIN', ahora);
  return { id, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
}

describe('puerto local de Instituciones Educativas (SQLite)', () => {
  it('crea, consulta y suspende una IE conservando la auditoría local', async () => {
    const admin = prepararAdministrador();
    const puerto = crearPuertoInstitucionesLocal();
    const datos = { nombre: 'IE Local', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE' as const, observacion: null };
    const id = await puerto.guardar(null, datos, admin);
    expect(await puerto.obtener(id)).toMatchObject({ id, nombre: 'IE Local', ciudad: 'Montería', departamento: null, estado: 'ACTIVE', activa: true, cuentasActivas: 0, procesos: 0 });
    expect(await puerto.guardar(id, { ...datos, estado: 'SUSPENDED_ARREARS', observacion: 'Mora' }, admin)).toBe(id);
    expect(await puerto.obtener(id)).toMatchObject({ estado: 'SUSPENDED_ARREARS', activa: false, observacion: 'Mora' });
    expect((await puerto.listar()).map((institucion) => institucion.id)).toContain(id);
    const acciones = (getSqlite().prepare('SELECT action FROM audit_events WHERE target_id = ?').all(id) as Array<{ action: string }>).map((fila) => fila.action).sort();
    expect(acciones).toEqual(['INSTITUTION_CREATED', 'INSTITUTION_SERVICE_SUSPENDED']);
  });

  it('obtener devuelve null si la IE no existe', async () => {
    prepararAdministrador();
    expect(await crearPuertoInstitucionesLocal().obtener(randomUUID())).toBeNull();
  });
});
