import { randomUUID } from 'node:crypto';
import { getSqlite } from '@/platform/database/client';
import type { CurrentUser } from '@/platform/auth/current-user';
import type { StoredFile } from '@/platform/storage/local-storage';
import { canAccessProcess } from '@/modules/access/authorization';
import { generatePrecontractualDrafts } from '../automation/iag-drafts';
import { notifyProcessParticipants } from '../notifications/process-notifications';
import { getProcessDetailFor } from './process-queries';
import { analyzeEvaluationOffers } from '../automation/evaluation-act-docx';

type WorkflowEvidence = StoredFile & { documentKind?: string };

export type WorkflowAction = 'MARKET_STUDY_APPROVED' | 'MARKET_STUDY_CORRECTIONS_REQUESTED' | 'MARKET_STUDY_REOPENED' | 'BUDGET_UPLOADED' | 'PRECONTRACTUAL_APPROVED' | 'PUBLICATION_CONFIRMED' | 'OFFERS_UPLOADED' | 'EVALUATION_CORRECTIONS_REQUESTED' | 'EVALUATION_APPROVED' | 'EVALUATION_NO_SELECTION_RECORDED' | 'SELECTION_RECORDED' | 'FORMALIZATION_UPLOADED' | 'CONTRACTUAL_APPROVED' | 'CONTRACTUAL_CORRECTIONS_REQUESTED' | 'CONTRACT_PUBLICATION_RECORDED' | 'EXECUTION_PARTIAL_RECEIPT_UPLOADED' | 'EXECUTION_FINAL_RECEIPT_UPLOADED' | 'LIQUIDATION_APPROVED' | 'LIQUIDATION_CORRECTIONS_REQUESTED' | 'LIQUIDATION_SIGNED_RECORDED' | 'LIQUIDATION_SIGNED_UPLOADED' | 'EXECUTION_RECORDED' | 'CLOSURE_RECORDED';

type Rule = { phase: string; next: string; roles: CurrentUser['role'][]; evidence: boolean; kind: string; label: string };
const rules: Record<WorkflowAction, Rule> = {
  MARKET_STUDY_APPROVED: { phase: 'MARKET', next: 'BUDGET', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'MARKET_STUDY', label: 'Estudio de mercado aprobado por abogado' },
  MARKET_STUDY_CORRECTIONS_REQUESTED: { phase: 'MARKET', next: 'MARKET', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'MARKET_STUDY', label: 'Correcciones solicitadas al estudio de mercado' },
  MARKET_STUDY_REOPENED: { phase: 'BUDGET', next: 'MARKET', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'MARKET_STUDY', label: 'Estudio de mercado reabierto para revisión jurídica' },
  BUDGET_UPLOADED: { phase: 'BUDGET', next: 'PRECONTRACTUAL', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'BUDGET_CERTIFICATE', label: 'CDP cargado' },
  PRECONTRACTUAL_APPROVED: { phase: 'PRECONTRACTUAL', next: 'PUBLICATION', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'PRECONTRACTUAL_PACKAGE', label: 'Paquete precontractual aprobado' },
  PUBLICATION_CONFIRMED: { phase: 'PUBLICATION', next: 'OFFERS', roles: ['IE_RECTOR'], evidence: false, kind: 'PUBLICATION_CONFIRMATION', label: 'Publicación confirmada por Rectoría' },
  OFFERS_UPLOADED: { phase: 'OFFERS', next: 'EVALUATION', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'OFFERS_RECEIVED', label: 'Ofertas y soportes cargados' },
  EVALUATION_CORRECTIONS_REQUESTED: { phase: 'EVALUATION', next: 'EVALUATION', roles: ['IE_RECTOR'], evidence: false, kind: 'EVALUATION_RECORD', label: 'Correcciones solicitadas al acta de evaluación' },
  EVALUATION_APPROVED: { phase: 'EVALUATION', next: 'DECISION', roles: ['IE_RECTOR'], evidence: false, kind: 'EVALUATION_RECORD', label: 'Evaluación aprobada y acta de selección preparada' },
  EVALUATION_NO_SELECTION_RECORDED: { phase: 'EVALUATION', next: 'CLOSED', roles: ['IE_RECTOR'], evidence: false, kind: 'EVALUATION_RECORD', label: 'Proceso cerrado sin oferta habilitada' },
  SELECTION_RECORDED: { phase: 'DECISION', next: 'FORMALIZATION', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'SELECTION_ACT_SIGNED', label: 'Acta de selección firmada incorporada' },
  FORMALIZATION_UPLOADED: { phase: 'FORMALIZATION', next: 'CONTRACTUAL_REVIEW', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'BUDGET_REGISTRATION', label: 'Registro Presupuestal cargado; documentos enviados a revisión jurídica' },
  CONTRACTUAL_APPROVED: { phase: 'CONTRACTUAL_REVIEW', next: 'CONTRACTUAL_PUBLICATION', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'CONTRACTUAL_PACKAGE', label: 'Contrato y Acta de inicio aprobados jurídicamente' },
  CONTRACTUAL_CORRECTIONS_REQUESTED: { phase: 'CONTRACTUAL_REVIEW', next: 'CONTRACTUAL_REVIEW', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'CONTRACTUAL_PACKAGE', label: 'Correcciones solicitadas a los documentos contractuales' },
  CONTRACT_PUBLICATION_RECORDED: { phase: 'CONTRACTUAL_PUBLICATION', next: 'EXECUTION', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: false, kind: 'CONTRACT_SECOP_PUBLICATION', label: 'Contrato y Acta de inicio firmados y publicados en SECOP II' },
  EXECUTION_PARTIAL_RECEIPT_UPLOADED: { phase: 'EXECUTION', next: 'EXECUTION', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'SATISFACTORY_RECEIPT_PARTIAL', label: 'Recibido a satisfacción parcial incorporado' },
  EXECUTION_FINAL_RECEIPT_UPLOADED: { phase: 'EXECUTION', next: 'LIQUIDATION_REVIEW', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'SATISFACTORY_RECEIPT_FINAL', label: 'Recibido a satisfacción final incorporado; Acta de liquidación enviada a revisión jurídica' },
  LIQUIDATION_APPROVED: { phase: 'LIQUIDATION_REVIEW', next: 'POSTCONTRACTUAL', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'LIQUIDATION_ACT', label: 'Acta de liquidación aprobada jurídicamente' },
  LIQUIDATION_CORRECTIONS_REQUESTED: { phase: 'LIQUIDATION_REVIEW', next: 'LIQUIDATION_REVIEW', roles: ['ARKA_ATTORNEY'], evidence: false, kind: 'LIQUIDATION_ACT', label: 'Correcciones solicitadas al Acta de liquidación' },
  LIQUIDATION_SIGNED_RECORDED: { phase: 'POSTCONTRACTUAL', next: 'CLOSED', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: false, kind: 'LIQUIDATION_ACT_SIGNED', label: 'Firma del Acta de liquidación confirmada' },
  LIQUIDATION_SIGNED_UPLOADED: { phase: 'POSTCONTRACTUAL', next: 'CLOSED', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'LIQUIDATION_ACT_SIGNED', label: 'Acta de liquidación firmada incorporada' },
  EXECUTION_RECORDED: { phase: 'EXECUTION', next: 'CLOSURE', roles: ['IE_RECTOR', 'IE_SUPPORT'], evidence: true, kind: 'EXECUTION_SUPPORT', label: 'Soporte de ejecución cargado' },
  CLOSURE_RECORDED: { phase: 'CLOSURE', next: 'CLOSED', roles: ['IE_RECTOR'], evidence: true, kind: 'CLOSURE_SUPPORT', label: 'Soporte de cierre registrado' },
};

export function workflowRule(action: WorkflowAction): Rule { return rules[action]; }

function ensureAccess(user: CurrentUser, processId: string, rule: Rule) {
  const db = getSqlite();
  const process = db.prepare('SELECT institution_id AS institutionId, phase, status FROM processes WHERE id = ?').get(processId) as { institutionId: string; phase: string; status: string } | undefined;
  const assigned = user.role === 'ARKA_ATTORNEY' ? new Set((db.prepare('SELECT process_id AS processId FROM attorney_assignments WHERE user_id = ? AND active = 1').all(user.id) as Array<{ processId: string }>).map((item) => item.processId)) : new Set<string>();
  const committeeAccess = user.role === 'IE_COMMITTEE' && user.institutionId === process?.institutionId;
  if (!process || (!committeeAccess && !canAccessProcess({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: assigned }, processId, process.institutionId))) throw new Error('No tienes acceso a este expediente.');
  if (!rule.roles.includes(user.role)) throw new Error('Tu rol no puede registrar esta actuación.');
  if (process.status === 'BLOCKED_REGULATION') throw new Error('La etapa de mercado permanece bloqueada por falta de reglamento aplicable.');
  if (process.status === 'BLOCKED_MARKET_DATA') throw new Error('La etapa de mercado permanece bloqueada hasta contar con cotizaciones legibles y estructurables.');
  if (process.phase !== rule.phase) throw new Error('La actuación no corresponde a la etapa actual del expediente.');
  return process;
}

export async function completeWorkflowAction(user: CurrentUser, processId: string, action: WorkflowAction, files: WorkflowEvidence[], note?: string, secopReference?: string, selectedSupplier?: string): Promise<void> {
  const rule = workflowRule(action); ensureAccess(user, processId, rule);
  const contractualRevisionUploaded = action === 'CONTRACTUAL_CORRECTIONS_REQUESTED' && files.some((file) => ['CONTRACT_LEGAL_REVISED', 'START_ACT_LEGAL_REVISED'].includes(file.documentKind ?? ''));
  const liquidationRevisionUploaded = action === 'LIQUIDATION_CORRECTIONS_REQUESTED' && files.some((file) => file.documentKind === 'LIQUIDATION_LEGAL_REVISED');
  if ((action === 'MARKET_STUDY_CORRECTIONS_REQUESTED' || action === 'MARKET_STUDY_REOPENED' || action === 'EVALUATION_CORRECTIONS_REQUESTED' || action === 'EVALUATION_NO_SELECTION_RECORDED' || (action === 'CONTRACTUAL_CORRECTIONS_REQUESTED' && !contractualRevisionUploaded) || (action === 'LIQUIDATION_CORRECTIONS_REQUESTED' && !liquidationRevisionUploaded) || action === 'LIQUIDATION_SIGNED_RECORDED') && !note?.trim()) {
    throw new Error(action === 'MARKET_STUDY_REOPENED'
      ? 'Registra la razón por la cual se reabre la revisión.'
      : action === 'EVALUATION_CORRECTIONS_REQUESTED'
        ? 'Describe las correcciones concretas que LEXCON IAG debe aplicar al acta de evaluación.'
        : action === 'EVALUATION_NO_SELECTION_RECORDED'
          ? 'Registra la conclusión institucional de cierre sin selección.'
          : action === 'LIQUIDATION_CORRECTIONS_REQUESTED'
            ? 'Describe las correcciones jurídicas requeridas para el Acta de liquidación.'
          : action === 'LIQUIDATION_SIGNED_RECORDED'
            ? 'Confirma que el Acta de liquidación fue firmada para cerrar el expediente.'
          : action === 'CONTRACTUAL_CORRECTIONS_REQUESTED'
            ? 'Describe las correcciones jurídicas requeridas para el contrato y el Acta de inicio.'
          : 'Describe las correcciones que la Institución Educativa debe atender.');
  }
  if (rule.evidence && !files.length) throw new Error('Debes cargar al menos un soporte para esta actuación.');
  if (!rule.evidence && files.length && !['CONTRACTUAL_CORRECTIONS_REQUESTED', 'CONTRACT_PUBLICATION_RECORDED', 'LIQUIDATION_CORRECTIONS_REQUESTED', 'LIQUIDATION_SIGNED_RECORDED'].includes(action)) throw new Error('Esta revisión se registra sobre la evidencia ya conservada en el expediente.');
  if (action === 'CONTRACTUAL_CORRECTIONS_REQUESTED' && files.some((file) => !['CONTRACT_LEGAL_REVISED', 'START_ACT_LEGAL_REVISED'].includes(file.documentKind ?? ''))) throw new Error('Solo se pueden incorporar versiones Word corregidas del contrato o del Acta de inicio en esta revisión.');
  if (action === 'OFFERS_UPLOADED') {
    const kinds = files.map((file) => file.documentKind ?? rule.kind);
    if (!kinds.includes('OFFERS_RECEIVED')) throw new Error('Adjunta al menos una oferta con sus anexos.');
    if (!kinds.includes('OFFERS_RECEIPT')) throw new Error('Adjunta el acta de recibo de las ofertas para continuar a evaluación.');
  }
  if (action === 'CONTRACT_PUBLICATION_RECORDED' && !note?.trim()) throw new Error('Confirma que el contrato y el Acta de inicio fueron firmados y publicados para habilitar la ejecución.');
  if (action === 'EVALUATION_APPROVED' || action === 'EVALUATION_NO_SELECTION_RECORDED') {
    const detail = getProcessDetailFor(user, processId);
    if (!detail) throw new Error('No fue posible cargar la evaluación del expediente.');
    const assessment = await analyzeEvaluationOffers(detail);
    if (action === 'EVALUATION_APPROVED' && !assessment.lowestEligible) throw new Error('No existe una oferta habilitada. Registra el cierre sin selección; no procede carta de aceptación, contrato ni RP.');
    const selected = selectedSupplier?.trim();
    if (action === 'EVALUATION_APPROVED' && !selected) throw new Error('El comité debe identificar expresamente el proponente seleccionado para preparar el acta de selección.');
    if (action === 'EVALUATION_APPROVED' && !assessment.evaluations.some((evaluation) => evaluation.eligible && evaluation.offer.supplier.trim().toLocaleLowerCase('es-CO') === selected!.toLocaleLowerCase('es-CO'))) throw new Error('El proponente seleccionado debe corresponder a una oferta habilitada en el acta de evaluación.');
    if (action === 'EVALUATION_NO_SELECTION_RECORDED' && assessment.lowestEligible) throw new Error('Existe una oferta habilitada de menor precio. Aprueba el acta para continuar a la decisión de selección.');
  }
  const db = getSqlite(); const now = new Date().toISOString();
  if (action === 'SELECTION_RECORDED' && !db.prepare("SELECT id FROM process_selection_decisions WHERE process_id = ? AND status = 'PENDING_SIGNATURE'").get(processId)) throw new Error('Primero registra la decisión del comité y descargue el acta de selección para firma.');
  if (action === 'FORMALIZATION_UPLOADED' && !db.prepare("SELECT id FROM process_selection_decisions WHERE process_id = ? AND status = 'SIGNED_UPLOADED'").get(processId)) throw new Error('Primero incorpora el Acta de selección firmada antes de cargar el Registro Presupuestal.');
  db.transaction(() => {
    let actedVersionId: string | null = null;
    for (const file of files) {
      const documentId = randomUUID(); const versionId = randomUUID(); actedVersionId = versionId;
      db.prepare('INSERT INTO documents (id, process_id, kind, created_at) VALUES (?, ?, ?, ?)').run(documentId, processId, file.documentKind ?? rule.kind, now);
      db.prepare('INSERT INTO document_versions (id, document_id, version_number, author_user_id, origin, created_at) VALUES (?, ?, 1, ?, ?, ?)').run(versionId, documentId, user.id, 'INSTITUTION_UPLOAD', now);
      db.prepare('INSERT INTO files (id, document_version_id, storage_key, original_name, mime_type, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), versionId, file.key, file.originalName, file.mimeType, file.sizeBytes, file.sha256, now);
    }
    if (!actedVersionId) {
      const latest = db.prepare('SELECT dv.id FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE d.process_id = ? ORDER BY dv.created_at DESC LIMIT 1').get(processId) as { id: string } | undefined;
      if (!latest) throw new Error('El expediente no tiene evidencia para registrar la revisión.');
      actedVersionId = latest.id;
    }
    db.prepare('INSERT INTO version_actions (id, document_version_id, actor_user_id, kind, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), actedVersionId, user.id, action, note?.trim() || null, now);
    if (secopReference?.trim()) db.prepare('INSERT INTO secop_evidence (id, document_version_id, reference, created_at) VALUES (?, ?, ?, ?)').run(randomUUID(), actedVersionId, secopReference.trim(), now);
    db.prepare('INSERT INTO process_stage_actions (id, process_id, phase, action, actor_user_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, rule.phase, action, user.id, note?.trim() || null, now);
    if (action === 'MARKET_STUDY_APPROVED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED' WHERE process_id = ? AND kind = 'MARKET_STUDY'").run(processId);
    if (action === 'MARKET_STUDY_CORRECTIONS_REQUESTED') db.prepare("UPDATE generated_drafts SET status = 'CORRECTIONS_REQUESTED' WHERE process_id = ? AND kind = 'MARKET_STUDY'").run(processId);
    if (action === 'MARKET_STUDY_REOPENED') db.prepare("UPDATE generated_drafts SET status = 'PENDING_LEGAL_REVIEW' WHERE process_id = ? AND kind = 'MARKET_STUDY'").run(processId);
    if (action === 'PRECONTRACTUAL_APPROVED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED' WHERE process_id = ? AND kind IN ('PRELIMINARY_STUDY', 'PUBLIC_INVITATION')").run(processId);
    if (action === 'CONTRACTUAL_APPROVED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED' WHERE process_id = ? AND kind IN ('CONTRACT', 'START_ACT')").run(processId);
    if (action === 'CONTRACTUAL_CORRECTIONS_REQUESTED') db.prepare("UPDATE generated_drafts SET status = 'CORRECTIONS_REQUESTED' WHERE process_id = ? AND kind IN ('CONTRACT', 'START_ACT')").run(processId);
    if (action === 'EVALUATION_APPROVED') {
      const supplier = selectedSupplier!.trim(); const rationale = note?.trim() || 'El comité evaluador revisó el acta de evaluación y adoptó la selección expresa del proponente indicado.';
      db.prepare(`INSERT INTO process_selection_decisions (id, process_id, selected_supplier, rationale, status, created_by_user_id, created_at, signed_at) VALUES (?, ?, ?, ?, 'PENDING_SIGNATURE', ?, ?, NULL) ON CONFLICT(process_id) DO UPDATE SET selected_supplier = excluded.selected_supplier, rationale = excluded.rationale, status = 'PENDING_SIGNATURE', created_by_user_id = excluded.created_by_user_id, created_at = excluded.created_at, signed_at = NULL`).run(randomUUID(), processId, supplier, rationale, user.id, now);
      db.prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'SELECTION_ACT', ?, ?, 'PENDING_SIGNATURE', ?) ON CONFLICT(process_id, kind) DO UPDATE SET title = excluded.title, content = excluded.content, status = excluded.status, created_at = excluded.created_at`).run(randomUUID(), processId, 'Acta de selección de oferente', supplier, now);
    }
    if (action === 'SELECTION_RECORDED') {
      db.prepare("UPDATE process_selection_decisions SET status = 'SIGNED_UPLOADED', signed_at = ? WHERE process_id = ?").run(now, processId);
      db.prepare("UPDATE generated_drafts SET status = 'APPROVED', created_at = ? WHERE process_id = ? AND kind = 'SELECTION_ACT'").run(now, processId);
      db.prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'ACCEPTANCE_COMMUNICATION', ?, ?, 'APPROVED', ?) ON CONFLICT(process_id, kind) DO UPDATE SET title = excluded.title, content = excluded.content, status = excluded.status, created_at = excluded.created_at`).run(randomUUID(), processId, 'Comunicación de aceptación de oferta', 'Preparada después de cargar el acta de selección firmada.', now);
    }
    if (action === 'FORMALIZATION_UPLOADED') {
      for (const [kind, title, content] of [['CONTRACT', 'Contrato para revisión jurídica', 'Preparado después de cargar el Registro Presupuestal.' ], ['START_ACT', 'Acta de inicio para revisión jurídica', 'Preparada después de cargar el Registro Presupuestal.']] as const) db.prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING_LEGAL_REVIEW', ?) ON CONFLICT(process_id, kind) DO UPDATE SET title = excluded.title, content = excluded.content, status = excluded.status, created_at = excluded.created_at`).run(randomUUID(), processId, kind, title, content, now);
    }
    if (action === 'EXECUTION_FINAL_RECEIPT_UPLOADED') db.prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'LIQUIDATION_ACT', ?, ?, 'PENDING_LEGAL_REVIEW', ?) ON CONFLICT(process_id, kind) DO UPDATE SET title = excluded.title, content = excluded.content, status = excluded.status, created_at = excluded.created_at`).run(randomUUID(), processId, 'Acta de liquidación para revisión jurídica', 'Preparada después del recibo a satisfacción final.', now);
    if (action === 'LIQUIDATION_APPROVED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED', created_at = ? WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").run(now, processId);
    if (action === 'LIQUIDATION_CORRECTIONS_REQUESTED') db.prepare("UPDATE generated_drafts SET status = 'CORRECTIONS_REQUESTED', created_at = ? WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").run(now, processId);
    if (action === 'LIQUIDATION_SIGNED_RECORDED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED', created_at = ? WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").run(now, processId);
    if (action === 'LIQUIDATION_SIGNED_UPLOADED') db.prepare("UPDATE generated_drafts SET status = 'APPROVED', created_at = ? WHERE process_id = ? AND kind = 'LIQUIDATION_ACT'").run(now, processId);
    if (action === 'EVALUATION_NO_SELECTION_RECORDED') db.prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'CLOSURE_DECLARATION', ?, ?, 'APPROVED', ?) ON CONFLICT(process_id, kind) DO UPDATE SET title = excluded.title, content = excluded.content, status = excluded.status, created_at = excluded.created_at`).run(randomUUID(), processId, 'Acta de cierre y declaratoria de desierto', note!.trim(), now);
    if (user.role === 'ARKA_ATTORNEY') db.prepare("UPDATE alerts SET status = 'READ' WHERE user_id = ? AND process_id = ? AND channel = 'IN_APP' AND status = 'OPEN'").run(user.id, processId);
    const nextStatus = action === 'MARKET_STUDY_CORRECTIONS_REQUESTED' || action === 'CONTRACTUAL_CORRECTIONS_REQUESTED' || action === 'LIQUIDATION_CORRECTIONS_REQUESTED' ? 'CORRECTIONS_REQUESTED' : action === 'MARKET_STUDY_REOPENED' ? 'RECEIVED' : rule.next === 'CLOSED' ? 'COMPLETED' : 'PENDING_ACTION';
    db.prepare('UPDATE processes SET phase = ?, status = ? WHERE id = ?').run(rule.next, nextStatus, processId);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, user.id, action, 'process', processId, now);
  })();
  if (action === 'BUDGET_UPLOADED') generatePrecontractualDrafts(processId);
  const marketMessage = action === 'MARKET_STUDY_APPROVED'
    ? 'El abogado Arka aprobó el estudio de mercado. Cargue el CDP para continuar el proceso.'
    : action === 'MARKET_STUDY_CORRECTIONS_REQUESTED'
      ? `El abogado Arka solicitó correcciones al estudio de mercado: ${note!.trim()}`
      : null;
  notifyProcessParticipants({
    processId,
    actorUserId: user.id,
    nextPhase: rule.next,
    eventKey: `${processId}:${action}:${now}`,
    recipientScope: action === 'MARKET_STUDY_CORRECTIONS_REQUESTED' ? 'INSTITUTION' : undefined,
    subject: action === 'MARKET_STUDY_APPROVED' ? 'Estudio de mercado aprobado' : `LEXCON IAG: ${rule.label}`,
    body: marketMessage ?? `${rule.label}. Ingrese al proceso para revisar la actuación pendiente o los documentos disponibles.`,
  });
}

export const workflowLabels: Record<WorkflowAction, string> = Object.fromEntries(Object.entries(rules).map(([action, rule]) => [action, rule.label])) as Record<WorkflowAction, string>;
