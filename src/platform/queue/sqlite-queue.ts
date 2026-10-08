import { randomUUID } from 'node:crypto';
import { getSqlite } from '../database/client';

export interface QueuedJob { id: string; type: string; payload: string; idempotencyKey: string; attempts: number }

export function enqueue(type: string, payload: object, idempotencyKey: string, now = new Date()): void {
  getSqlite().prepare('INSERT OR IGNORE INTO jobs (id, type, payload, idempotency_key, status, attempts, available_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)').run(randomUUID(), type, JSON.stringify(payload), idempotencyKey, 'PENDING', now.toISOString(), now.toISOString());
}

export function claimNextJob(now = new Date()): QueuedJob | null {
  const db = getSqlite();
  return db.transaction(() => {
    const row = db.prepare("SELECT id, type, payload, idempotency_key AS idempotencyKey, attempts FROM jobs WHERE status = 'PENDING' AND available_at <= ? ORDER BY created_at LIMIT 1").get(now.toISOString()) as QueuedJob | undefined;
    if (!row) return null;
    const changed = db.prepare("UPDATE jobs SET status = 'RUNNING', attempts = attempts + 1 WHERE id = ? AND status = 'PENDING'").run(row.id);
    return changed.changes === 1 ? { ...row, attempts: row.attempts + 1 } : null;
  })();
}

export function finishJob(id: string, result: object, status: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED'): void {
  getSqlite().prepare('UPDATE jobs SET status = ?, result = ? WHERE id = ?').run(status, JSON.stringify(result), id);
}
