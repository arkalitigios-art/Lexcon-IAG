import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { addMarketQuotes, removeMarketQuote } from '../../src/modules/processes/market-quote-management';
import { processMarketAnalysis } from '../../src/modules/automation/iag-drafts';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const originalDatabase = process.env.LEXCON_DATABASE_URL;

function fixture(): { directory: string; processId: string; user: CurrentUser } {
  const directory = mkdtempSync(join(tmpdir(), 'lexcon-quotes-')); process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite'); migrate();
  const db = getSqlite(); const now = new Date().toISOString(); const institutionId = randomUUID(); const userId = randomUUID(); const processId = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(institutionId, 'IE de prueba', now);
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(userId, 'rector@test.invalid', 'Rector', 'hash', now);
  db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), userId, institutionId, 'IE_RECTOR', now);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(processId, institutionId, 'MARKET', 'RECEIVED', userId, now);
  return { directory, processId, user: { id: userId, name: 'Rector', role: 'IE_RECTOR', institutionId, institutionName: 'IE de prueba' } };
}

afterEach(() => { closeDatabaseForTests(); if (originalDatabase === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = originalDatabase; });

describe('corrección de cotizaciones', () => {
  it('elimina una carga individual, conserva otra y deja una traza', () => {
    const setup = fixture(); const files = [
      { key: 'a', sha256: 'a'.repeat(64), sizeBytes: 10, originalName: 'incorrecta.pdf', mimeType: 'application/pdf' },
      { key: 'b', sha256: 'b'.repeat(64), sizeBytes: 10, originalName: 'correcta.pdf', mimeType: 'application/pdf' },
    ];
    addMarketQuotes(setup.user, setup.processId, files);
    const db = getSqlite(); const quote = db.prepare(`SELECT q.id FROM market_quotes q JOIN document_versions dv ON dv.id = q.document_version_id JOIN files f ON f.document_version_id = dv.id WHERE q.process_id = ? AND f.original_name = ?`).get(setup.processId, 'incorrecta.pdf') as { id: string };
    expect(removeMarketQuote(setup.user, setup.processId, quote.id)).toEqual({ storageKey: 'a', originalName: 'incorrecta.pdf' });
    expect(db.prepare('SELECT COUNT(*) AS count FROM market_quotes WHERE process_id = ?').get(setup.processId)).toEqual({ count: 1 });
    expect(db.prepare('SELECT action FROM audit_events WHERE process_id = ? ORDER BY created_at DESC LIMIT 1').get(setup.processId)).toEqual({ action: 'MARKET_QUOTATION_REMOVED' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('permite retirar temporalmente la última cotización para reemplazarla', async () => {
    const setup = fixture(); addMarketQuotes(setup.user, setup.processId, [{ key: 'a', sha256: 'a'.repeat(64), sizeBytes: 10, originalName: 'unica.pdf', mimeType: 'application/pdf' }]);
    const quoteId = (getSqlite().prepare('SELECT id FROM market_quotes WHERE process_id = ?').get(setup.processId) as { id: string }).id;
    expect(removeMarketQuote(setup.user, setup.processId, quoteId)).toEqual({ storageKey: 'a', originalName: 'unica.pdf' });
    expect(getSqlite().prepare('SELECT COUNT(*) AS count FROM market_quotes WHERE process_id = ?').get(setup.processId)).toEqual({ count: 0 });
    await expect(processMarketAnalysis(setup.processId)).resolves.toMatchObject({ status: 'AWAITING_QUOTES' });
    expect(getSqlite().prepare('SELECT status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ status: 'PENDING_QUOTES' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });
});
