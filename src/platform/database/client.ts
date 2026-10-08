import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

let sqlite: Database.Database | undefined;

export function databasePath(): string {
  const configured = process.env.LEXCON_DATABASE_URL ?? './data/lexcon.sqlite';
  return configured.startsWith('file:') ? configured.slice(5) : resolve(process.cwd(), configured);
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    const path = databasePath();
    mkdirSync(dirname(path), { recursive: true });
    sqlite = new Database(path);
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('journal_mode = WAL');
  }
  return sqlite;
}

export function getDatabase() { return drizzle(getSqlite(), { schema }); }
export function closeDatabaseForTests(): void { sqlite?.close(); sqlite = undefined; }
