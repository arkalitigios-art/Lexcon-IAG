import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';

describe('migraciones SQLite', () => {
  const original = process.env.LEXCON_DATABASE_URL;
  afterEach(() => { closeDatabaseForTests(); if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original; });
  it('crea la estructura base y registra la migración', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lexcon-')); process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite');
    migrate(); const db = getSqlite();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'processes'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'process_stage_actions'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'generated_drafts'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'document_extractions'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'market_comparisons'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'market_study_profiles'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'email_outbox'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'process_evaluation_members'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'process_selection_decisions'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'processes_institution_sequence_unique'").get()).toBeTruthy();
    expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 17 });
    closeDatabaseForTests(); rmSync(directory, { recursive: true, force: true });
  });
});
