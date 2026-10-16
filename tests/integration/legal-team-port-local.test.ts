import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { crearPuertoEquipoJuridicoLocal } from '../../src/modules/admin/legal-team/legal-team-port-local';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';

const original = process.env.LEXCON_DATABASE_URL;
let directorio = '';

afterEach(() => {
  closeDatabaseForTests();
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = '';
  if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original;
});

function preparar(): { activa: string } {
  directorio = mkdtempSync(join(tmpdir(), 'lexcon-equipo-'));
  process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
  migrate();
  const db = getSqlite();
  const ahora = new Date().toISOString();
  const ie = randomUUID(); const rector = randomUUID(); const activa = randomUUID(); const inactivo = randomUUID(); const proceso = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(ie, 'IE A', ahora);
  const usuario = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  usuario.run(rector, 'rector@test.invalid', 'Rector', 'hash', ahora);
  usuario.run(activa, 'activa@test.invalid', 'Abogada Activa', 'hash', ahora);
  usuario.run(inactivo, 'inactivo@test.invalid', 'Abogado Inactivo', 'hash', ahora);
  const membresia = db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  membresia.run(randomUUID(), rector, ie, 'IE_RECTOR', 1, ahora);
  membresia.run(randomUUID(), activa, null, 'ARKA_ATTORNEY', 1, ahora);
  membresia.run(randomUUID(), inactivo, null, 'ARKA_ATTORNEY', 0, ahora);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(proceso, ie, 'MARKET', 'RECEIVED', rector, ahora);
  db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), proceso, activa, ahora);
  return { activa };
}

describe('puerto local de Equipo jurídico (SQLite)', () => {
  it('lista solo abogados activos con sus procesos asignados', async () => {
    const { activa } = preparar();
    expect(await crearPuertoEquipoJuridicoLocal().listarAbogadosActivos()).toEqual([{ id: activa, nombre: 'Abogada Activa', correo: 'activa@test.invalid', procesosAsignados: 1 }]);
  });
});
