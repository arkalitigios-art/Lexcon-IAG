import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSqlite } from './client';

export function migrate(migrationsDirectory = join(process.cwd(), 'src/platform/database/migrations')): void {
  const db = getSqlite();
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)');
  const applied = new Set((db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>).map((row) => row.name));
  for (const name of readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    const sql = readFileSync(join(migrationsDirectory, name), 'utf8');
    db.transaction(() => { db.exec(sql); db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(name, new Date().toISOString()); })();
  }
}

if (require.main === module) migrate();
