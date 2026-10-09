import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { assignAttorney } from '../../src/modules/assignments/attorney-assignment';
import { setAccessActive } from '../../src/modules/admin/access-management';
import { listProcessesFor } from '../../src/modules/processes/process-queries';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const originalDatabase = process.env.LEXCON_DATABASE_URL;

function insertFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'lexcon-access-'));
  process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite');
  migrate();
  const db = getSqlite(); const now = new Date().toISOString();
  const institutionA = randomUUID(); const institutionB = randomUUID();
  const adminId = randomUUID(); const attorneyId = randomUUID(); const rectorId = randomUUID(); const otherRectorId = randomUUID(); const processA = randomUUID(); const processB = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(institutionA, 'IE A', now);
  db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(institutionB, 'IE B', now);
  const user = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  user.run(adminId, 'admin@test.invalid', 'Admin', 'hash', now); user.run(attorneyId, 'attorney@test.invalid', 'Abogado', 'hash', now); user.run(rectorId, 'rector-a@test.invalid', 'Rector A', 'hash', now); user.run(otherRectorId, 'rector-b@test.invalid', 'Rector B', 'hash', now);
  const membership = db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  const adminMembership = randomUUID(); const attorneyMembership = randomUUID();
  membership.run(adminMembership, adminId, null, 'ARKA_ADMIN', now); membership.run(attorneyMembership, attorneyId, null, 'ARKA_ATTORNEY', now); membership.run(randomUUID(), rectorId, institutionA, 'IE_RECTOR', now); membership.run(randomUUID(), otherRectorId, institutionB, 'IE_RECTOR', now);
  const processInsert = db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)');
  processInsert.run(processA, institutionA, 'MARKET', 'RECEIVED', rectorId, now); processInsert.run(processB, institutionB, 'MARKET', 'RECEIVED', otherRectorId, now);
  return { directory, db, institutionA, adminId, attorneyId, rectorId, processA, processB, adminMembership, attorneyMembership };
}

afterEach(() => { closeDatabaseForTests(); if (originalDatabase === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = originalDatabase; });

describe('acceso por rol y asignación jurídica', () => {
  it('aísla los expedientes de la IE y entrega al abogado solo su asignación', async () => {
    const fixture = insertFixture();
    const admin: CurrentUser = { id: fixture.adminId, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
    const rector: CurrentUser = { id: fixture.rectorId, name: 'Rector A', role: 'IE_RECTOR', institutionId: fixture.institutionA, institutionName: 'IE A' };
    const attorney: CurrentUser = { id: fixture.attorneyId, name: 'Abogado', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
    expect((await listProcessesFor(rector)).map((process) => process.id)).toEqual([fixture.processA]);
    expect(await listProcessesFor(attorney)).toEqual([]);
    assignAttorney(admin, fixture.processA, fixture.attorneyId);
    expect((await listProcessesFor(attorney)).map((process) => process.id)).toEqual([fixture.processA]);
    expect((await listProcessesFor(admin)).map((process) => process.id)).toEqual(expect.arrayContaining([fixture.processA, fixture.processB]));
    expect(fixture.db.prepare("SELECT action FROM audit_events WHERE process_id = ?").get(fixture.processA)).toEqual({ action: 'ATTORNEY_ASSIGNED' });
    closeDatabaseForTests(); rmSync(fixture.directory, { recursive: true, force: true });
  });

  it('permite al administrador activar o desactivar otro acceso y protege el propio', () => {
    const fixture = insertFixture();
    const admin: CurrentUser = { id: fixture.adminId, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
    setAccessActive(admin, fixture.attorneyMembership, false);
    expect(fixture.db.prepare('SELECT active FROM memberships WHERE id = ?').get(fixture.attorneyMembership)).toEqual({ active: 0 });
    expect(fixture.db.prepare("SELECT action FROM audit_events WHERE target_id = ?").get(fixture.attorneyMembership)).toEqual({ action: 'ACCESS_DEACTIVATED' });
    expect(() => setAccessActive(admin, fixture.adminMembership, false)).toThrow('No puedes desactivar tu propio acceso administrativo.');
    closeDatabaseForTests(); rmSync(fixture.directory, { recursive: true, force: true });
  });
});
