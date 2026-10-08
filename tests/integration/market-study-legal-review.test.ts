import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { completeWorkflowAction } from '../../src/modules/processes/workflow';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const originalDatabase = process.env.LEXCON_DATABASE_URL;

function fixture(): { directory: string; processId: string; rectorId: string; attorney: CurrentUser } {
  const directory = mkdtempSync(join(tmpdir(), 'lexcon-market-review-')); process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite'); migrate();
  const db = getSqlite(); const now = new Date().toISOString(); const institutionId = randomUUID(); const rectorId = randomUUID(); const attorneyId = randomUUID(); const processId = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, city, active, created_at) VALUES (?, ?, ?, 1, ?)').run(institutionId, 'IE de prueba', 'Bogotá, D. C.', now);
  const insertUser = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  insertUser.run(rectorId, 'rector@test.invalid', 'Rector', 'hash', now); insertUser.run(attorneyId, 'abogado@test.invalid', 'Abogado', 'hash', now);
  const membership = db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  membership.run(randomUUID(), rectorId, institutionId, 'IE_RECTOR', now); membership.run(randomUUID(), attorneyId, null, 'ARKA_ATTORNEY', now);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(processId, institutionId, 'MARKET', 'RECEIVED', rectorId, now);
  db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), processId, attorneyId, now);
  const documentId = randomUUID(); const versionId = randomUUID();
  db.prepare('INSERT INTO documents (id, process_id, kind, created_at) VALUES (?, ?, ?, ?)').run(documentId, processId, 'MARKET_QUOTATION', now);
  db.prepare('INSERT INTO document_versions (id, document_id, version_number, author_user_id, origin, created_at) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, documentId, rectorId, 'INSTITUTION_UPLOAD', now);
  db.prepare("INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'MARKET_STUDY', ?, ?, 'PENDING_LEGAL_REVIEW', ?)").run(randomUUID(), processId, 'Borrador de estudio de mercado', 'Contenido de prueba', now);
  return { directory, processId, rectorId, attorney: { id: attorneyId, name: 'Abogado', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null } };
}

afterEach(() => { closeDatabaseForTests(); if (originalDatabase === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = originalDatabase; });

describe('revisión jurídica del estudio de mercado', () => {
  it('devuelve correcciones a la IE sin cambiar de etapa y deja la alerta trazable', async () => {
    const setup = fixture();
    await completeWorkflowAction(setup.attorney, setup.processId, 'MARKET_STUDY_CORRECTIONS_REQUESTED', [], 'Tipo de corrección: Valores. Verifique cantidades y soportes.');
    const db = getSqlite();
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'MARKET', status: 'CORRECTIONS_REQUESTED' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'MARKET_STUDY'").get(setup.processId)).toEqual({ status: 'CORRECTIONS_REQUESTED' });
    expect(db.prepare("SELECT body FROM alerts WHERE user_id = ? AND process_id = ? AND status = 'OPEN'").get(setup.rectorId, setup.processId)).toEqual({ body: 'El abogado Arka solicitó correcciones al estudio de mercado: Tipo de corrección: Valores. Verifique cantidades y soportes.' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('aprueba el documento, habilita el CDP y notifica a la IE', async () => {
    const setup = fixture();
    await completeWorkflowAction(setup.attorney, setup.processId, 'MARKET_STUDY_APPROVED', [], 'Cifras verificadas en los soportes.');
    const db = getSqlite();
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'BUDGET', status: 'PENDING_ACTION' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'MARKET_STUDY'").get(setup.processId)).toEqual({ status: 'APPROVED' });
    expect(db.prepare("SELECT body FROM alerts WHERE user_id = ? AND process_id = ? AND status = 'OPEN'").get(setup.rectorId, setup.processId)).toEqual({ body: 'El abogado Arka aprobó el estudio de mercado. Cargue el CDP para continuar el proceso.' });
    expect(db.prepare('SELECT recipient, status FROM email_outbox WHERE process_id = ?').get(setup.processId)).toEqual({ recipient: 'rector@test.invalid', status: 'PENDING_DELIVERY' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('permite al abogado reabrir una aprobación para volver a decidir sin borrar la traza', async () => {
    const setup = fixture();
    await completeWorkflowAction(setup.attorney, setup.processId, 'MARKET_STUDY_APPROVED', [], 'Aprobación inicial.');
    await completeWorkflowAction(setup.attorney, setup.processId, 'MARKET_STUDY_REOPENED', [], 'Se requiere una nueva lectura jurídica antes de solicitar el CDP.');
    const db = getSqlite();
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'MARKET', status: 'RECEIVED' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'MARKET_STUDY'").get(setup.processId)).toEqual({ status: 'PENDING_LEGAL_REVIEW' });
    expect(db.prepare("SELECT COUNT(*) AS count FROM process_stage_actions WHERE process_id = ? AND action IN ('MARKET_STUDY_APPROVED', 'MARKET_STUDY_REOPENED')").get(setup.processId)).toEqual({ count: 2 });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });
});
