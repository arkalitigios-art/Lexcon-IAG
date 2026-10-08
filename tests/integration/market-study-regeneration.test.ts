import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import { addMarketQuotes } from '../../src/modules/processes/market-quote-management';
import { completeWorkflowAction } from '../../src/modules/processes/workflow';
import { processMarketAnalysis } from '../../src/modules/automation/iag-drafts';
import { LocalPrivateStorage } from '../../src/platform/storage/local-storage';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const originalDatabase = process.env.LEXCON_DATABASE_URL;
const originalStorage = process.env.LEXCON_STORAGE_DIR;

type Setup = { directory: string; processId: string; rector: CurrentUser; attorney: CurrentUser };

function fixture(): Setup {
  const directory = mkdtempSync(join(tmpdir(), 'lexcon-market-regeneration-'));
  process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite');
  process.env.LEXCON_STORAGE_DIR = join(directory, 'storage');
  migrate();
  const db = getSqlite(); const now = new Date().toISOString();
  const institutionId = randomUUID(); const rectorId = randomUUID(); const attorneyId = randomUUID(); const processId = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, city, active, created_at) VALUES (?, ?, ?, 1, ?)').run(institutionId, 'IE de prueba', 'Bogotá', now);
  const insertUser = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  insertUser.run(rectorId, 'rector@test.invalid', 'Rector', 'hash', now); insertUser.run(attorneyId, 'abogado@test.invalid', 'Abogado', 'hash', now);
  const membership = db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  membership.run(randomUUID(), rectorId, institutionId, 'IE_RECTOR', now); membership.run(randomUUID(), attorneyId, null, 'ARKA_ATTORNEY', now);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(processId, institutionId, 'MARKET', 'RECEIVED', rectorId, now);
  db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), processId, attorneyId, now);
  return {
    directory, processId,
    rector: { id: rectorId, name: 'Rector', role: 'IE_RECTOR', institutionId, institutionName: 'IE de prueba' },
    attorney: { id: attorneyId, name: 'Abogado', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null },
  };
}

async function quote(name: string, unit: string): Promise<Buffer> {
  return Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph(`Proveedor: ${name}`),
    new Paragraph('Descripción: Resma de papel bond'),
    new Paragraph('Cantidad: 10'),
    new Paragraph(`Valor unitario: ${unit}`),
    new Paragraph(`Valor total: ${Number(unit.replaceAll('.', '')) * 10}`),
    new Paragraph('IVA: 19% incluido'),
  ] }] }));
}

afterEach(() => {
  closeDatabaseForTests();
  if (originalDatabase === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = originalDatabase;
  if (originalStorage === undefined) delete process.env.LEXCON_STORAGE_DIR; else process.env.LEXCON_STORAGE_DIR = originalStorage;
});

describe('regeneración tras ajustes jurídicos', () => {
  it('deja una nueva versión pendiente después de reanalizar las cotizaciones vigentes', async () => {
    const setup = fixture(); const storage = new LocalPrivateStorage();
    const first = await storage.save({ name: 'oferta-a.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: await quote('Proveedor A', '10000') });
    const second = await storage.save({ name: 'oferta-b.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: await quote('Proveedor B', '12000') });
    addMarketQuotes(setup.rector, setup.processId, [first, second]);
    await expect(processMarketAnalysis(setup.processId)).resolves.toMatchObject({ status: 'READY_LEGAL_REVIEW', comparableItems: 1 });
    await completeWorkflowAction(setup.attorney, setup.processId, 'MARKET_STUDY_CORRECTIONS_REQUESTED', [], 'Tipo de corrección: Redacción. Ajuste la descripción del objeto.');
    await expect(processMarketAnalysis(setup.processId)).resolves.toMatchObject({ status: 'READY_LEGAL_REVIEW', comparableItems: 1 });
    const db = getSqlite();
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'MARKET', status: 'RECEIVED' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'MARKET_STUDY'").get(setup.processId)).toEqual({ status: 'PENDING_LEGAL_REVIEW' });
    expect(db.prepare("SELECT COUNT(*) AS count FROM process_stage_actions WHERE process_id = ? AND action = 'MARKET_STUDY_CORRECTIONS_REQUESTED'").get(setup.processId)).toEqual({ count: 1 });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });
});
