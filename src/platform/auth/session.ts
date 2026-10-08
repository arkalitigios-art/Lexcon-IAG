import { randomBytes } from 'node:crypto';
import { getSqlite } from '../database/client';

const sessionLifetimeMs = 8 * 60 * 60 * 1000;

export interface LocalSession { id: string; userId: string; expiresAt: string }

export function createSession(userId: string, now = new Date()): LocalSession {
  const session: LocalSession = { id: randomBytes(32).toString('base64url'), userId, expiresAt: new Date(now.getTime() + sessionLifetimeMs).toISOString() };
  getSqlite().prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(session.id, session.userId, session.expiresAt, now.toISOString());
  return session;
}

export function readSession(sessionId: string, now = new Date()): LocalSession | null {
  const row = getSqlite().prepare('SELECT id, user_id AS userId, expires_at AS expiresAt FROM sessions WHERE id = ?').get(sessionId) as LocalSession | undefined;
  if (!row || new Date(row.expiresAt) <= now) { if (row) deleteSession(sessionId); return null; }
  return row;
}

export function deleteSession(sessionId: string): void { getSqlite().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId); }
