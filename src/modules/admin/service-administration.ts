import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../../platform/auth/current-user';
import { hashPassword } from '../../platform/auth/password';
import { getSqlite } from '../../platform/database/client';
import { hasCapability } from '../access/authorization';

export const institutionServiceStatuses = ['ACTIVE', 'SUSPENDED_ARREARS', 'ENDED'] as const;
export type InstitutionServiceStatus = typeof institutionServiceStatuses[number];

export interface ManagedInstitution { id: string; name: string; city: string; active: boolean; serviceStatus: InstitutionServiceStatus; serviceNote: string | null; createdAt: string; users: number; processes: number }
export interface ManagedAttorney { id: string; membershipId: string; name: string; email: string; active: boolean; assignments: number; createdAt: string }

function assertAdmin(actor: CurrentUser): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) throw new Error('No tienes autorización para administrar el servicio.');
}
function cleanName(value: string, field: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 3 || cleaned.length > 120) throw new Error(`${field} debe tener entre 3 y 120 caracteres.`);
  return cleaned;
}
function cleanCity(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 100) throw new Error('La ciudad o municipio debe tener entre 2 y 100 caracteres.');
  return cleaned;
}
function cleanEmail(value: string): string {
  const cleaned = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) throw new Error('Ingresa un correo electrónico válido.');
  return cleaned;
}
function serviceStatus(value: string): InstitutionServiceStatus {
  if (!institutionServiceStatuses.includes(value as InstitutionServiceStatus)) throw new Error('Selecciona un estado de servicio válido.');
  return value as InstitutionServiceStatus;
}
function addAudit(actor: CurrentUser, action: string, targetType: string, targetId: string): void {
  getSqlite().prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)').run(randomUUID(), actor.id, action, targetType, targetId, new Date().toISOString());
}

export function listManagedInstitutions(): ManagedInstitution[] {
  return getSqlite().prepare(`SELECT institution.id, institution.name, institution.city, institution.active, institution.service_status AS serviceStatus, institution.service_note AS serviceNote, institution.created_at AS createdAt, COUNT(DISTINCT membership.user_id) AS users, COUNT(DISTINCT process.id) AS processes FROM institutions institution LEFT JOIN memberships membership ON membership.institution_id = institution.id AND membership.active = 1 LEFT JOIN processes process ON process.institution_id = institution.id GROUP BY institution.id ORDER BY institution.active DESC, institution.name`).all() as ManagedInstitution[];
}

export function getManagedInstitution(id: string): ManagedInstitution | null {
  return getSqlite().prepare(`SELECT institution.id, institution.name, institution.city, institution.active, institution.service_status AS serviceStatus, institution.service_note AS serviceNote, institution.created_at AS createdAt, COUNT(DISTINCT membership.user_id) AS users, COUNT(DISTINCT process.id) AS processes FROM institutions institution LEFT JOIN memberships membership ON membership.institution_id = institution.id AND membership.active = 1 LEFT JOIN processes process ON process.institution_id = institution.id WHERE institution.id = ? GROUP BY institution.id`).get(id) as ManagedInstitution | undefined ?? null;
}

export function createInstitution(actor: CurrentUser, input: { name: string; city: string; serviceStatus: string; serviceNote?: string }): void {
  assertAdmin(actor); const status = serviceStatus(input.serviceStatus); const id = randomUUID(); const now = new Date().toISOString();
  getSqlite().prepare('INSERT INTO institutions (id, name, city, active, service_status, service_note, service_status_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, cleanName(input.name, 'El nombre de la Institución Educativa'), cleanCity(input.city), status === 'ACTIVE' ? 1 : 0, status, input.serviceNote?.trim() || null, now, now);
  addAudit(actor, 'INSTITUTION_CREATED', 'institution', id);
}

export function updateInstitution(actor: CurrentUser, input: { id: string; name: string; city: string; serviceStatus: string; serviceNote?: string }): void {
  assertAdmin(actor); const status = serviceStatus(input.serviceStatus); const db = getSqlite();
  const existing = db.prepare('SELECT id FROM institutions WHERE id = ?').get(input.id) as { id: string } | undefined;
  if (!existing) throw new Error('La Institución Educativa no existe.');
  const now = new Date().toISOString();
  db.prepare('UPDATE institutions SET name = ?, city = ?, active = ?, service_status = ?, service_note = ?, service_status_changed_at = ? WHERE id = ?').run(cleanName(input.name, 'El nombre de la Institución Educativa'), cleanCity(input.city), status === 'ACTIVE' ? 1 : 0, status, input.serviceNote?.trim() || null, now, input.id);
  addAudit(actor, status === 'ENDED' ? 'INSTITUTION_SERVICE_ENDED' : status === 'SUSPENDED_ARREARS' ? 'INSTITUTION_SERVICE_SUSPENDED' : 'INSTITUTION_UPDATED', 'institution', input.id);
}

export function listManagedAttorneys(): ManagedAttorney[] {
  return getSqlite().prepare(`SELECT user.id, membership.id AS membershipId, user.display_name AS name, user.email, CASE WHEN user.active = 1 AND membership.active = 1 THEN 1 ELSE 0 END AS active, user.created_at AS createdAt, COUNT(DISTINCT assignment.process_id) AS assignments FROM users user JOIN memberships membership ON membership.user_id = user.id AND membership.role = 'ARKA_ATTORNEY' LEFT JOIN attorney_assignments assignment ON assignment.user_id = user.id AND assignment.active = 1 GROUP BY user.id, membership.id ORDER BY active DESC, user.display_name`).all() as ManagedAttorney[];
}

export async function createAttorney(actor: CurrentUser, input: { name: string; email: string; password: string }): Promise<void> {
  assertAdmin(actor); if (input.password.length < 12) throw new Error('La contraseña temporal debe tener al menos 12 caracteres.');
  const db = getSqlite(); const id = randomUUID(); const now = new Date().toISOString(); const passwordHash = await hashPassword(input.password);
  try {
    db.transaction(() => {
      db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(id, cleanEmail(input.email), cleanName(input.name, 'El nombre del abogado'), passwordHash, now);
      db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, NULL, ?, 1, ?)').run(randomUUID(), id, 'ARKA_ATTORNEY', now);
    })();
  } catch (error) { throw new Error(error instanceof Error && error.message.includes('UNIQUE') ? 'Ya existe una cuenta con ese correo electrónico.' : 'No fue posible crear el abogado.'); }
  addAudit(actor, 'ATTORNEY_CREATED', 'user', id);
}

export async function updateAttorney(actor: CurrentUser, input: { id: string; name: string; email: string; password?: string; active: boolean }): Promise<void> {
  assertAdmin(actor); const db = getSqlite(); const attorney = db.prepare(`SELECT user.id FROM users user JOIN memberships membership ON membership.user_id = user.id AND membership.role = 'ARKA_ATTORNEY' WHERE user.id = ?`).get(input.id) as { id: string } | undefined;
  if (!attorney) throw new Error('El abogado seleccionado no existe.');
  if (input.password && input.password.length < 12) throw new Error('La nueva contraseña debe tener al menos 12 caracteres.');
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  try {
    db.transaction(() => {
      if (passwordHash) db.prepare('UPDATE users SET email = ?, display_name = ?, password_hash = ?, active = ? WHERE id = ?').run(cleanEmail(input.email), cleanName(input.name, 'El nombre del abogado'), passwordHash, input.active ? 1 : 0, input.id);
      else db.prepare('UPDATE users SET email = ?, display_name = ?, active = ? WHERE id = ?').run(cleanEmail(input.email), cleanName(input.name, 'El nombre del abogado'), input.active ? 1 : 0, input.id);
      db.prepare("UPDATE memberships SET active = ? WHERE user_id = ? AND role = 'ARKA_ATTORNEY'").run(input.active ? 1 : 0, input.id);
    })();
  } catch (error) { throw new Error(error instanceof Error && error.message.includes('UNIQUE') ? 'Ya existe una cuenta con ese correo electrónico.' : 'No fue posible actualizar el abogado.'); }
  addAudit(actor, input.active ? 'ATTORNEY_UPDATED' : 'ATTORNEY_DEACTIVATED', 'user', input.id);
}
