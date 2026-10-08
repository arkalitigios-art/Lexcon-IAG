import { randomUUID } from 'node:crypto';
import { getSqlite } from '@/platform/database/client';
import type { CurrentUser } from '@/platform/auth/current-user';
import { canAccessProcess } from '@/modules/access/authorization';

export type EvaluationMemberInput = { name: string; role: string };
export type EvaluationTeamInput = { evaluators: EvaluationMemberInput[]; supervisor: EvaluationMemberInput };

function assertInstitutionCanManageEvaluationTeam(user: CurrentUser, processId: string): void {
  if (!['IE_RECTOR', 'IE_SUPPORT'].includes(user.role) || !user.institutionId) throw new Error('Solo Rectoría o apoyo institucional pueden registrar el comité evaluador.');
  const process = getSqlite().prepare('SELECT institution_id AS institutionId, phase FROM processes WHERE id = ?').get(processId) as { institutionId: string; phase: string } | undefined;
  if (!process || !canAccessProcess({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, processId, process.institutionId)) throw new Error('No tienes acceso a este expediente.');
  if (!['OFFERS', 'EVALUATION'].includes(process.phase)) throw new Error('El comité y el supervisor se registran antes o durante la evaluación de ofertas.');
}

function cleanMember(member: EvaluationMemberInput, label: string): EvaluationMemberInput {
  const name = member.name.trim().replace(/\s+/g, ' ');
  const role = member.role.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 180) throw new Error(`${label}: registra un nombre válido.`);
  if (role.length < 3 || role.length > 180) throw new Error(`${label}: registra el cargo o función.`);
  return { name, role };
}

export function saveEvaluationTeam(user: CurrentUser, processId: string, input: EvaluationTeamInput): void {
  assertInstitutionCanManageEvaluationTeam(user, processId);
  if (!Array.isArray(input.evaluators) || input.evaluators.length < 1 || input.evaluators.length > 8) throw new Error('Registra entre uno y ocho evaluadores para este expediente.');
  const evaluators = input.evaluators.map((member, index) => cleanMember(member, `Evaluador ${index + 1}`));
  const supervisor = cleanMember(input.supervisor, 'Supervisor');
  const now = new Date().toISOString(); const db = getSqlite();
  db.transaction(() => {
    db.prepare('DELETE FROM process_evaluation_members WHERE process_id = ?').run(processId);
    const insert = db.prepare('INSERT INTO process_evaluation_members (id, process_id, member_type, full_name, role_title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const evaluator of evaluators) insert.run(randomUUID(), processId, 'EVALUATOR', evaluator.name, evaluator.role, now, now);
    insert.run(randomUUID(), processId, 'SUPERVISOR', supervisor.name, supervisor.role, now, now);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, user.id, 'EVALUATION_TEAM_UPDATED', 'process', processId, now);
  })();
}
