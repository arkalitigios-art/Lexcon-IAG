import { getSqlite } from '../../platform/database/client';
import type { CurrentUser } from '../../platform/auth/current-user';
import { canAccessProcess } from '../access/authorization';
import { getMarketStudyProfile, type MarketStudyProfile } from './market-study-profile';

export interface ProcessSummary {
  id: string;
  institutionId?: string;
  institutionSequence?: number | null;
  phase: string;
  status: string;
  createdAt: string;
  institutionName: string;
  attorneyName: string | null;
  objectDescription?: string | null;
}

export interface ProcessDetail extends ProcessSummary {
  institutionCity: string;
  responsibleName: string;
  blockReason: string | null;
  quotations: Array<{ quoteId: string; fileId: string; originalName: string; supplierName: string | null; mimeType: string; sizeBytes: number; createdAt: string }>;
  quotationTotals: Array<{ source: string; supplierName: string | null; totalValue: string | null; taxRates: string[]; taxTreatments: string[] }>;
  approvalDelivery: { recipient: string; status: string; createdAt: string; deliveredAt: string | null } | null;
  documents: Array<{ fileId: string; kind: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string }>;
  evaluationTeam?: { evaluators: Array<{ id: string; name: string; role: string }>; supervisor: { id: string; name: string; role: string } | null };
  selectionDecision?: { selectedSupplier: string; rationale: string; status: 'PENDING_SIGNATURE' | 'SIGNED_UPLOADED'; createdAt: string; signedAt: string | null } | null;
  actions: Array<{ phase: string; action: string; actorName: string; note: string | null; createdAt: string }>;
  drafts: Array<{ kind: string; title: string; content: string; status: string; createdAt: string }>;
  marketStudy: { regulationName: string | null; regulationVersion: number | null; profile: MarketStudyProfile; comparisons: Array<{ description: string; quantity: string; values: Array<{ source: string; unitValue: string; totalValue: string | null; taxRate: string | null; taxTreatment: string }>; minimum: string; maximum: string; arithmeticMean: string }> };
}

const summaryFields = `
  p.id,
  p.institution_id AS institutionId,
  p.institution_sequence AS institutionSequence,
  p.phase,
  p.status,
  p.created_at AS createdAt,
  i.name AS institutionName,
  i.city AS institutionCity,
  attorney.display_name AS attorneyName,
  NULLIF(profile.object_description, '') AS objectDescription
`;

const summaryJoins = `
  FROM processes p
  JOIN institutions i ON i.id = p.institution_id
  LEFT JOIN attorney_assignments assignment ON assignment.process_id = p.id AND assignment.active = 1
  LEFT JOIN users attorney ON attorney.id = assignment.user_id
  LEFT JOIN market_study_profiles profile ON profile.process_id = p.id
`;

function summaries(query: string, parameter?: string): ProcessSummary[] {
  const statement = getSqlite().prepare(query);
  return (parameter === undefined ? statement.all() : statement.all(parameter)) as ProcessSummary[];
}

export function listProcessesFor(user: CurrentUser): ProcessSummary[] {
  if (user.role === 'ARKA_ADMIN') {
    return summaries(`SELECT ${summaryFields} ${summaryJoins} ORDER BY p.created_at DESC`);
  }
  if (user.role === 'ARKA_ATTORNEY') {
    return summaries(`SELECT ${summaryFields} ${summaryJoins} INNER JOIN attorney_assignments mine ON mine.process_id = p.id AND mine.user_id = ? AND mine.active = 1 ORDER BY p.created_at DESC`, user.id);
  }
  if ((user.role === 'IE_RECTOR' || user.role === 'IE_SUPPORT') && user.institutionId) {
    return summaries(`SELECT ${summaryFields} ${summaryJoins} WHERE p.institution_id = ? ORDER BY p.created_at DESC`, user.institutionId);
  }
  if (user.role === 'IE_COMMITTEE' && user.institutionId) {
    return summaries(`SELECT ${summaryFields} ${summaryJoins} WHERE p.institution_id = ? AND p.phase = 'EVALUATION' ORDER BY p.created_at DESC`, user.institutionId);
  }
  return [];
}

export function listUnassignedProcesses(): ProcessSummary[] {
  return summaries(`SELECT ${summaryFields} ${summaryJoins} WHERE assignment.id IS NULL ORDER BY p.created_at DESC`);
}

export function getProcessDetailFor(user: CurrentUser, processId: string): ProcessDetail | null {
  const db = getSqlite();
  const row = db.prepare(`
    SELECT ${summaryFields}, p.institution_id AS institutionId, responsible.display_name AS responsibleName,
      block.reason AS blockReason
    ${summaryJoins}
    JOIN users responsible ON responsible.id = p.created_by_user_id
    LEFT JOIN workflow_blocks block ON block.process_id = p.id AND block.active = 1
    WHERE p.id = ?
  `).get(processId) as (ProcessDetail & { institutionId: string }) | undefined;
  if (!row) return null;

  const assignments = user.role === 'ARKA_ATTORNEY'
    ? new Set((db.prepare('SELECT process_id AS processId FROM attorney_assignments WHERE user_id = ? AND active = 1').all(user.id) as Array<{ processId: string }>).map((item) => item.processId))
    : new Set<string>();
  const committeeAccess = user.role === 'IE_COMMITTEE' && user.institutionId === row.institutionId && row.phase === 'EVALUATION';
  if (!committeeAccess && !canAccessProcess({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: assignments }, processId, row.institutionId)) return null;

  const quotations = db.prepare(`
    SELECT quote.id AS quoteId, f.id AS fileId, f.original_name AS originalName, quote.supplier_name AS supplierName, f.mime_type AS mimeType, f.size_bytes AS sizeBytes, f.created_at AS createdAt
    FROM market_quotes quote
    JOIN document_versions version ON version.id = quote.document_version_id
    JOIN files f ON f.document_version_id = version.id
    WHERE quote.process_id = ?
    ORDER BY f.created_at ASC
  `).all(processId) as ProcessDetail['quotations'];
  const documents = db.prepare(`SELECT f.id AS fileId, d.kind, f.original_name AS originalName, f.mime_type AS mimeType, f.size_bytes AS sizeBytes, f.created_at AS createdAt FROM documents d JOIN document_versions dv ON dv.document_id = d.id JOIN files f ON f.document_version_id = dv.id WHERE d.process_id = ? ORDER BY f.created_at ASC`).all(processId) as ProcessDetail['documents'];
  const evaluationMemberRows = db.prepare(`SELECT id, member_type AS memberType, full_name AS name, role_title AS role FROM process_evaluation_members WHERE process_id = ? ORDER BY CASE member_type WHEN 'EVALUATOR' THEN 0 ELSE 1 END, created_at ASC`).all(processId) as Array<{ id: string; memberType: 'EVALUATOR' | 'SUPERVISOR'; name: string; role: string }>;
  const evaluationTeam: ProcessDetail['evaluationTeam'] = {
    evaluators: evaluationMemberRows.filter((member) => member.memberType === 'EVALUATOR').map(({ id, name, role }) => ({ id, name, role })),
    supervisor: evaluationMemberRows.find((member) => member.memberType === 'SUPERVISOR') ?? null,
  };
  const selectionDecision = db.prepare(`SELECT selected_supplier AS selectedSupplier, rationale, status, created_at AS createdAt, signed_at AS signedAt FROM process_selection_decisions WHERE process_id = ?`).get(processId) as ProcessDetail['selectionDecision'];
  const actions = db.prepare(`SELECT action.phase, action.action, actor.display_name AS actorName, action.note, action.created_at AS createdAt FROM process_stage_actions action JOIN users actor ON actor.id = action.actor_user_id WHERE action.process_id = ? ORDER BY action.created_at ASC`).all(processId) as ProcessDetail['actions'];
  const drafts = db.prepare("SELECT kind, title, content, status, created_at AS createdAt FROM generated_drafts WHERE process_id = ? AND status <> 'SUPERSEDED' ORDER BY created_at ASC").all(processId) as ProcessDetail['drafts'];
  const regulation = db.prepare(`SELECT rv.version_number AS regulationVersion, rf.original_name AS regulationName
    FROM processes p LEFT JOIN regulation_versions rv ON rv.id = p.regulation_version_id
    LEFT JOIN regulation_files rf ON rf.regulation_version_id = rv.id WHERE p.id = ? LIMIT 1`).get(processId) as { regulationVersion: number | null; regulationName: string | null } | undefined;
  const comparisons = (db.prepare(`SELECT normalized_description AS description, quantity, values_json AS valuesJson, min_unit_value AS minimum, max_unit_value AS maximum
    FROM market_comparisons WHERE process_id = ? ORDER BY normalized_description`).all(processId) as Array<{ description: string; quantity: string; valuesJson: string; minimum: string; maximum: string }>).map((comparison) => {
    let values: Array<{ source: string; unitValue: string; totalValue: string | null; taxRate?: string | null; taxTreatment?: string }> = [];
    try { values = JSON.parse(comparison.valuesJson) as typeof values; } catch { values = []; }
    const cents = values.map((value) => Math.round(Number(value.unitValue) * 100)).filter(Number.isFinite);
    const arithmeticMean = cents.length
      ? `${Math.round((cents.reduce((total, value) => total + value, 0) / cents.length) / 100).toFixed(2)}`
      : comparison.minimum;
    return { description: comparison.description, quantity: comparison.quantity, values: values.map((value) => ({ ...value, taxRate: value.taxRate ?? null, taxTreatment: value.taxTreatment ?? 'UNVERIFIED' })), minimum: comparison.minimum, maximum: comparison.maximum, arithmeticMean };
  });
  const quoteItemRows = db.prepare(`SELECT f.original_name AS source, q.supplier_name AS supplierName, item.total_value AS totalValue, item.tax_rate AS taxRate, item.tax_treatment AS taxTreatment
    FROM market_quotes q
    JOIN document_versions version ON version.id = q.document_version_id
    JOIN files f ON f.document_version_id = version.id
    LEFT JOIN market_quote_items item ON item.quote_id = q.id
    WHERE q.process_id = ?`).all(processId) as Array<{ source: string; supplierName: string | null; totalValue: string | null; taxRate: string | null; taxTreatment: string | null }>;
  const quotationTotals = quotations.map((quote) => {
    const rows = quoteItemRows.filter((item) => item.source === quote.originalName);
    const totals = rows.map((item) => item.totalValue === null ? Number.NaN : Number(item.totalValue)).filter(Number.isFinite);
    const fallback = comparisons.flatMap((comparison) => comparison.values.filter((value) => value.source === quote.originalName).map((value) => value.totalValue === null ? Number.NaN : Number(value.totalValue))).filter(Number.isFinite);
    const sum = totals.length ? totals.reduce((total, value) => total + value, 0) : fallback.length ? fallback.reduce((total, value) => total + value, 0) : null;
    return { source: quote.originalName, supplierName: quote.supplierName, totalValue: sum === null ? null : sum.toFixed(2), taxRates: [...new Set(rows.map((item) => item.taxRate).filter((value): value is string => Boolean(value)))], taxTreatments: [...new Set(rows.map((item) => item.taxTreatment).filter((value): value is string => Boolean(value)))] };
  });
  const approvalDelivery = db.prepare(`SELECT recipient, status, created_at AS createdAt, delivered_at AS deliveredAt
    FROM email_outbox WHERE process_id = ? AND subject = 'Estudio de mercado aprobado'
    ORDER BY created_at DESC LIMIT 1`).get(processId) as ProcessDetail['approvalDelivery'];
  const { ...detail } = row;
  return { ...detail, quotations, quotationTotals, approvalDelivery: approvalDelivery ?? null, documents, evaluationTeam, selectionDecision: selectionDecision ?? null, actions, drafts, marketStudy: { regulationName: regulation?.regulationName ?? null, regulationVersion: regulation?.regulationVersion ?? null, profile: getMarketStudyProfile(processId), comparisons } };
}
