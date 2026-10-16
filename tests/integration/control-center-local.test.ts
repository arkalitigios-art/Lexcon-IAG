import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { obtenerCentroControl } from '../../src/modules/admin/control-center';
import { crearPuertoCentroControlLocal } from '../../src/modules/admin/control-center-local';
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

describe('centro de control local (SQLite)', () => {
  it('conserva contadores, bloqueos y eventos de la demostración', async () => {
    directorio = mkdtempSync(join(tmpdir(), 'lexcon-control-'));
    process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
    migrate();
    const db = getSqlite();
    const ahora = new Date().toISOString();
    const ie = randomUUID(); const admin = randomUUID(); const rector = randomUUID(); const proceso = randomUUID();
    db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(ie, 'IE A', ahora);
    const usuario = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
    usuario.run(admin, 'admin@test.invalid', 'Admin', 'hash', ahora);
    usuario.run(rector, 'rector@test.invalid', 'Rector', 'hash', ahora);
    db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(proceso, ie, 'MARKET', 'BLOCKED_REGULATION', rector, ahora);
    db.prepare('INSERT INTO workflow_blocks (id, process_id, scope, reason, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), proceso, 'MARKET', 'No existe reglamento institucional aplicable.', ahora);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), proceso, admin, 'PROCESS_OPENED_FROM_QUOTES', 'process', proceso, ahora);
    const actor: CurrentUser = { id: admin, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };

    expect(await obtenerCentroControl(crearPuertoCentroControlLocal(), actor)).toEqual({
      counts: { processes: 1, unassigned: 1, blocked: 1, institutions: 1, auditEvents: 1 },
      blocks: [{ processId: proceso, institutionName: 'IE A', scope: 'MARKET', reason: 'No existe reglamento institucional aplicable.', createdAt: ahora }],
      events: [{ action: 'PROCESS_OPENED_FROM_QUOTES', actorName: 'Admin', institutionName: 'IE A', createdAt: ahora }],
    });
  });
});
