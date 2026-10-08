import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { completeWorkflowAction } from '../../src/modules/processes/workflow';
import { saveEvaluationTeam } from '../../src/modules/processes/evaluation-team';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const originalDatabase = process.env.LEXCON_DATABASE_URL;

function fixture(): { directory: string; processId: string; rector: CurrentUser } {
  const directory = mkdtempSync(join(tmpdir(), 'lexcon-evaluation-')); process.env.LEXCON_DATABASE_URL = join(directory, 'test.sqlite'); migrate();
  const db = getSqlite(); const now = new Date().toISOString(); const institutionId = randomUUID(); const rectorId = randomUUID(); const processId = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, city, active, created_at) VALUES (?, ?, ?, 1, ?)').run(institutionId, 'IE de prueba', 'Bogotá, D. C.', now);
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(rectorId, 'rector@test.invalid', 'Rector', 'hash', now);
  db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), rectorId, institutionId, 'IE_RECTOR', now);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(processId, institutionId, 'EVALUATION', 'PENDING_ACTION', rectorId, now);
  const documentId = randomUUID(); const versionId = randomUUID();
  db.prepare('INSERT INTO documents (id, process_id, kind, created_at) VALUES (?, ?, ?, ?)').run(documentId, processId, 'OFFERS_RECEIVED', now);
  db.prepare('INSERT INTO document_versions (id, document_id, version_number, author_user_id, origin, created_at) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, documentId, rectorId, 'INSTITUTION_UPLOAD', now);
  return { directory, processId, rector: { id: rectorId, name: 'Rector', role: 'IE_RECTOR', institutionId, institutionName: 'IE de prueba' } };
}

afterEach(() => { closeDatabaseForTests(); if (originalDatabase === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = originalDatabase; });

describe('evaluación integrada en el expediente', () => {
  it('registra los evaluadores y el supervisor propios del expediente', () => {
    const setup = fixture();
    saveEvaluationTeam(setup.rector, setup.processId, { evaluators: [{ name: 'Evaluadora uno', role: 'Integrante del comité' }, { name: 'Evaluador dos', role: 'Integrante del comité' }], supervisor: { name: 'Supervisora del proceso', role: 'Supervisor(a)' } });
    const rows = getSqlite().prepare('SELECT member_type AS memberType, full_name AS name, role_title AS role FROM process_evaluation_members WHERE process_id = ? ORDER BY member_type, created_at').all(setup.processId);
    expect(rows).toEqual([{ memberType: 'EVALUATOR', name: 'Evaluadora uno', role: 'Integrante del comité' }, { memberType: 'EVALUATOR', name: 'Evaluador dos', role: 'Integrante del comité' }, { memberType: 'SUPERVISOR', name: 'Supervisora del proceso', role: 'Supervisor(a)' }]);
    expect(getSqlite().prepare("SELECT action FROM audit_events WHERE process_id = ? AND action = 'EVALUATION_TEAM_UPDATED'").get(setup.processId)).toEqual({ action: 'EVALUATION_TEAM_UPDATED' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('conserva la fase al pedir correcciones y cierra sin selección cuando no existe oferta habilitada', async () => {
    const setup = fixture();
    await completeWorkflowAction(setup.rector, setup.processId, 'EVALUATION_CORRECTIONS_REQUESTED', [], 'Aclare la vigencia del RUT de la oferta 2.');
    const db = getSqlite();
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'EVALUATION', status: 'PENDING_ACTION' });
    expect(db.prepare("SELECT action, note FROM process_stage_actions WHERE process_id = ? AND action = 'EVALUATION_CORRECTIONS_REQUESTED'").get(setup.processId)).toEqual({ action: 'EVALUATION_CORRECTIONS_REQUESTED', note: 'Aclare la vigencia del RUT de la oferta 2.' });
    await expect(completeWorkflowAction(setup.rector, setup.processId, 'EVALUATION_APPROVED', [], 'Acta revisada por el comité institucional.')).rejects.toThrow('No existe una oferta habilitada');
    await completeWorkflowAction(setup.rector, setup.processId, 'EVALUATION_NO_SELECTION_RECORDED', [], 'No hay oferta habilitada; se cierra el proceso sin selección.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'CLOSED', status: 'COMPLETED' });
    expect(db.prepare("SELECT kind, title, status, content FROM generated_drafts WHERE process_id = ? AND kind = 'CLOSURE_DECLARATION'").get(setup.processId)).toEqual({ kind: 'CLOSURE_DECLARATION', title: 'Acta de cierre y declaratoria de desierto', status: 'APPROVED', content: 'No hay oferta habilitada; se cierra el proceso sin selección.' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('permite al apoyo institucional incorporar el Acta de selección firmada y habilita el RP', async () => {
    const setup = fixture(); const db = getSqlite(); const now = new Date().toISOString(); const supportId = randomUUID();
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(supportId, 'apoyo@test.invalid', 'Apoyo IE', 'hash', now);
    db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), supportId, setup.rector.institutionId, 'IE_SUPPORT', now);
    db.prepare("UPDATE processes SET phase = 'DECISION', status = 'PENDING_ACTION' WHERE id = ?").run(setup.processId);
    db.prepare("INSERT INTO process_selection_decisions (id, process_id, selected_supplier, rationale, status, created_by_user_id, created_at, signed_at) VALUES (?, ?, ?, ?, 'PENDING_SIGNATURE', ?, ?, NULL)").run(randomUUID(), setup.processId, 'Proveedor habilitado S.A.S.', 'Decisión del comité', setup.rector.id, now);
    const support: CurrentUser = { id: supportId, name: 'Apoyo IE', role: 'IE_SUPPORT', institutionId: setup.rector.institutionId, institutionName: 'IE de prueba' };
    await completeWorkflowAction(support, setup.processId, 'SELECTION_RECORDED', [{ key: 'private/signed-act.docx', originalName: 'Acta_de_seleccion_firmada.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 1, sha256: 'test' }], 'Acta firmada por el comité.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'FORMALIZATION', status: 'PENDING_ACTION' });
    expect(db.prepare('SELECT status FROM process_selection_decisions WHERE process_id = ?').get(setup.processId)).toEqual({ status: 'SIGNED_UPLOADED' });
    expect(db.prepare("SELECT kind FROM documents WHERE process_id = ? AND kind = 'SELECTION_ACT_SIGNED'").get(setup.processId)).toEqual({ kind: 'SELECTION_ACT_SIGNED' });
    await completeWorkflowAction(support, setup.processId, 'FORMALIZATION_UPLOADED', [{ key: 'private/rp.pdf', originalName: 'RP-2026-0001.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'rp-test' }], 'RP incorporado.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'CONTRACTUAL_REVIEW', status: 'PENDING_ACTION' });
    expect(db.prepare("SELECT kind, status FROM generated_drafts WHERE process_id = ? AND kind IN ('CONTRACT', 'START_ACT') ORDER BY kind").all(setup.processId)).toEqual([{ kind: 'CONTRACT', status: 'PENDING_LEGAL_REVIEW' }, { kind: 'START_ACT', status: 'PENDING_LEGAL_REVIEW' }]);
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('permite a la abogada incorporar una versión Word corregida sin exponerla a la IE', async () => {
    const setup = fixture(); const db = getSqlite(); const now = new Date().toISOString(); const attorneyId = randomUUID();
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(attorneyId, 'abogada@test.invalid', 'Abogada Arka', 'hash', now);
    db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, NULL, ?, 1, ?)').run(randomUUID(), attorneyId, 'ARKA_ATTORNEY', now);
    db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), setup.processId, attorneyId, now);
    db.prepare("UPDATE processes SET phase = 'CONTRACTUAL_REVIEW', status = 'PENDING_ACTION' WHERE id = ?").run(setup.processId);
    for (const kind of ['CONTRACT', 'START_ACT']) db.prepare("INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING_LEGAL_REVIEW', ?)").run(randomUUID(), setup.processId, kind, kind, 'Versión inicial', now);
    const attorney: CurrentUser = { id: attorneyId, name: 'Abogada Arka', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
    await completeWorkflowAction(attorney, setup.processId, 'CONTRACTUAL_CORRECTIONS_REQUESTED', [{ key: 'private/contract-corrected.docx', originalName: 'Contrato_corregido.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 1, sha256: 'contract-corrected', documentKind: 'CONTRACT_LEGAL_REVISED' }]);
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'CONTRACTUAL_REVIEW', status: 'CORRECTIONS_REQUESTED' });
    expect(db.prepare("SELECT kind FROM documents WHERE process_id = ? AND kind = 'CONTRACT_LEGAL_REVISED'").get(setup.processId)).toEqual({ kind: 'CONTRACT_LEGAL_REVISED' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'CONTRACT'").get(setup.processId)).toEqual({ status: 'CORRECTIONS_REQUESTED' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });

  it('conserva recibidos parciales y somete el Acta de liquidación a revisión jurídica antes de firmarla', async () => {
    const setup = fixture(); const db = getSqlite(); const now = new Date().toISOString();
    db.prepare("UPDATE processes SET phase = 'CONTRACTUAL_PUBLICATION', status = 'PENDING_ACTION' WHERE id = ?").run(setup.processId);
    await expect(completeWorkflowAction(setup.rector, setup.processId, 'CONTRACT_PUBLICATION_RECORDED', [])).rejects.toThrow('Confirma que el contrato y el Acta de inicio');
    await completeWorkflowAction(setup.rector, setup.processId, 'CONTRACT_PUBLICATION_RECORDED', [
      { key: 'contract.pdf', originalName: 'Contrato_firmado.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'contract', documentKind: 'CONTRACT_SIGNED' },
      { key: 'start.pdf', originalName: 'Acta_inicio_firmada.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'start', documentKind: 'START_ACT_SIGNED' },
      { key: 'publication.pdf', originalName: 'Constancia_SECOP.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'publication', documentKind: 'CONTRACT_SECOP_PUBLICATION' },
    ], 'Publicación contractual confirmada.', 'SECOP II Proceso 2026-0001');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'EXECUTION', status: 'PENDING_ACTION' });
    await completeWorkflowAction(setup.rector, setup.processId, 'EXECUTION_PARTIAL_RECEIPT_UPLOADED', [{ key: 'partial.pdf', originalName: 'Recibido_parcial.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'partial' }], 'Pago parcial 1.');
    expect(db.prepare('SELECT phase FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'EXECUTION' });
    expect(db.prepare("SELECT kind FROM documents WHERE process_id = ? AND kind = 'SATISFACTORY_RECEIPT_PARTIAL'").get(setup.processId)).toEqual({ kind: 'SATISFACTORY_RECEIPT_PARTIAL' });
    await completeWorkflowAction(setup.rector, setup.processId, 'EXECUTION_FINAL_RECEIPT_UPLOADED', [{ key: 'final.pdf', originalName: 'Recibido_final.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'final' }], 'Objeto recibido a satisfacción.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'LIQUIDATION_REVIEW', status: 'PENDING_ACTION' });
    expect(db.prepare("SELECT kind, status FROM generated_drafts WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").get(setup.processId)).toEqual({ kind: 'LIQUIDATION_ACT', status: 'PENDING_LEGAL_REVIEW' });
    const attorneyId = randomUUID();
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(attorneyId, 'liquidacion@test.invalid', 'Abogada de liquidación', 'hash', now);
    db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, NULL, ?, 1, ?)').run(randomUUID(), attorneyId, 'ARKA_ATTORNEY', now);
    db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), setup.processId, attorneyId, now);
    const attorney: CurrentUser = { id: attorneyId, name: 'Abogada de liquidación', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
    await completeWorkflowAction(attorney, setup.processId, 'LIQUIDATION_APPROVED', [], 'Acta revisada y aprobada.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'POSTCONTRACTUAL', status: 'PENDING_ACTION' });
    await completeWorkflowAction(setup.rector, setup.processId, 'LIQUIDATION_SIGNED_RECORDED', [{ key: 'liquidation.pdf', originalName: 'Acta_liquidacion_firmada.pdf', mimeType: 'application/pdf', sizeBytes: 1, sha256: 'liquidation', documentKind: 'LIQUIDATION_ACT_SIGNED' }], 'Declaración institucional: el Acta de liquidación fue firmada por las partes.');
    expect(db.prepare('SELECT phase, status FROM processes WHERE id = ?').get(setup.processId)).toEqual({ phase: 'CLOSED', status: 'COMPLETED' });
    expect(db.prepare("SELECT status FROM generated_drafts WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").get(setup.processId)).toEqual({ status: 'APPROVED' });
    closeDatabaseForTests(); rmSync(setup.directory, { recursive: true, force: true });
  });
});
