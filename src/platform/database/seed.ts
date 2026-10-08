import { randomUUID } from 'node:crypto';
import { getSqlite } from './client';
import { migrate } from './migrate';
import { hashPassword } from '../auth/password';
import { DEMO_CREDENTIALS } from '../auth/demo-credentials';

const now = () => new Date().toISOString();

async function seed(): Promise<void> {
  migrate(); const db = getSqlite();
  const ensureInstitution = (name: string): string => {
    const existing = db.prepare('SELECT id FROM institutions WHERE name = ?').get(name) as { id: string } | undefined;
    if (existing) return existing.id;
    const id = randomUUID(); db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(id, name, now()); return id;
  };
  const ensureUser = async (email: string, displayName: string, password: string): Promise<string> => {
    const passwordHash = await hashPassword(password);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE users SET display_name = ?, password_hash = ?, active = 1 WHERE id = ?').run(displayName, passwordHash, existing.id);
      return existing.id;
    }
    const id = randomUUID(); db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(id, email, displayName, passwordHash, now()); return id;
  };
  const ensureMembership = (userId: string, institutionId: string | null, role: string): void => {
    const existing = db.prepare('SELECT id FROM memberships WHERE user_id = ? AND role = ? AND institution_id IS ?').get(userId, role, institutionId) as { id: string } | undefined;
    if (existing) { db.prepare('UPDATE memberships SET active = 1 WHERE id = ?').run(existing.id); return; }
    db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), userId, institutionId, role, now());
  };
  const institutions = new Map<string, string>([
    ['IE Ficticia Horizonte', ensureInstitution('IE Ficticia Horizonte')],
    ['IE Ficticia Río Claro', ensureInstitution('IE Ficticia Río Claro')],
  ]);
  for (const credential of DEMO_CREDENTIALS) {
    const userId = await ensureUser(credential.email, credential.displayName, credential.password);
    ensureMembership(userId, credential.institution ? institutions.get(credential.institution)! : null, credential.membership);
  }
}

seed().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Error de semilla'); process.exitCode = 1; });
