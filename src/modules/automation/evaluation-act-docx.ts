import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import { getSqlite } from '@/platform/database/client';
import { LocalPrivateStorage } from '@/platform/storage/local-storage';
import type { ProcessDetail } from '@/modules/processes/process-queries';
import { createMarketStudyNarrative } from './market-study-narrative';
import { createMarketStudyBudget } from './market-study-financials';
import { evaluateOffers, lowestPricedEligible, type EvaluationOffer } from './evaluation-analysis';
import { formatInstitutionProcessConsecutive } from '@/modules/processes/process-consecutive';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
type OfferItem = { number: string; description: string; quantity: string; unit: string; tax: string; total: string };
type Offer = EvaluationOffer & { originalName: string; taxId: string; representative: string; delivery: string; validity: string };

function money(value: number | null): string { return value === null ? 'No identificable' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value); }
function evaluationSummary(evaluation: { eligible: boolean; pendingVerification: boolean }): string {
  if (!evaluation.eligible) return 'NO CUMPLE';
  return evaluation.pendingVerification ? 'CUMPLE CON VERIFICACIÓN PENDIENTE DEL COMITÉ' : 'CUMPLE';
}
function body(text: string, options: { bold?: boolean; center?: boolean; after?: number } = {}): Paragraph { return new Paragraph({ alignment: options.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, spacing: { after: options.after ?? 100, line: 264 }, children: [new TextRun({ text, font: 'Aptos', size: 22, bold: options.bold })] }); }
function heading(text: string): Paragraph { return new Paragraph({ spacing: { before: 180, after: 80 }, keepNext: true, children: [new TextRun({ text, font: 'Aptos Display', size: 28, bold: true })] }); }
function cell(text: string, header = false): TableCell { return new TableCell({ verticalAlign: VerticalAlign.CENTER, shading: header ? { type: ShadingType.CLEAR, fill: '1F1F1F', color: 'auto' } : undefined, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text, font: 'Aptos', size: header ? 18 : 19, bold: header, color: header ? 'FFFFFF' : '000000' })] })] }); }
function table(headers: string[], rows: string[][]): Table { return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, rows: [new TableRow({ tableHeader: true, children: headers.map((value) => cell(value, true)) }), ...rows.map((row) => new TableRow({ cantSplit: true, children: row.map((value) => cell(value)) }))] }); }
function toMoney(value: string | undefined): number | null { const result = Number((value ?? '').replace(/[^\d]/g, '')); return Number.isFinite(result) && result > 0 ? result : null; }
function cleanLines(text: string): string[] { return text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean); }
function after(lines: string[], label: RegExp): string {
  const index = lines.findIndex((line) => label.test(line));
  if (index < 0) return 'No identificado';
  const inlineValue = lines[index].match(/^[^:]+:\s*(.+)$/u)?.[1]?.trim();
  return inlineValue || lines.slice(index + 1).find(Boolean) || 'No identificado';
}
function extractItems(lines: string[]): OfferItem[] {
  const text = lines.join('\n'); const rows: OfferItem[] = [];
  for (const match of text.matchAll(/(?:^|\n)(\d{1,2})\s+([\s\S]{3,220}?)\s+(\d+)\s+\$\s*([\d.,]+)\s+\$\s*([\d.,]+)\s+\$\s*([\d.,]+)/gu)) {
    const description = match[2].replace(/\s+/gu, ' ').trim();
    if (!/\b(?:caja|resma|papel|marcador|carpeta|cinta|cuaderno|t[oó]ner|servicio|suministro)/iu.test(description)) continue;
    rows.push({ number: match[1], description, quantity: match[3], unit: `$ ${match[4]}`, tax: `$ ${match[5]}`, total: `$ ${match[6]}` });
  }
  if (rows.length) return rows;
  const start = lines.findIndex((line) => /^ítem$/iu.test(line)); if (start < 0) return [];
  const items: OfferItem[] = [];
  for (let index = start + 1; index < lines.length - 5; index++) {
    if (/^(subtotal|iva total|total oferta)/iu.test(lines[index])) break;
    if (!/^\d{1,2}$/.test(lines[index]) || !/\$/.test(lines[index + 3]) || !/\$/.test(lines[index + 5])) continue;
    items.push({ number: lines[index], description: lines[index + 1].replace(/UNSPSC\s*/iu, ' · UNSPSC '), quantity: lines[index + 2], unit: lines[index + 3], tax: lines[index + 4], total: lines[index + 5] }); index += 5;
  }
  return items;
}
function labelledValue(lines: string[], label: RegExp): string {
  const line = lines.find((value) => label.test(value));
  if (!line) return 'No identificado';
  const value = line.replace(label, '').replace(/^\s*[:—–-]?\s*/u, '').trim();
  return value || lines[lines.indexOf(line) + 1] || 'No identificado';
}
export function extractOffer(text: string, originalName: string): Offer {
  const lines = cleanLines(text);
  const supplier = labelledValue(lines, /^Nombre o raz[oó]n social\b/iu) !== 'No identificado' ? labelledValue(lines, /^Nombre o raz[oó]n social\b/iu) : after(lines, /^Proponente\s*:/iu);
  const taxId = labelledValue(lines, /^NIT(?:\s+o\s+documento)?\b/iu);
  const representative = text.match(/\bYo,\s*([^,\n]+),[\s\S]{0,180}?actuando\s+(?:en\s+calidad\s+de\s+)?(?:representante\s+legal|en\s+nombre\s+propio)/iu)?.[1]?.trim() ?? labelledValue(lines, /^Representante legal\b/iu);
  const legalTests: Array<[RegExp, string]> = [[/carta de presentaci[oó]n/iu, 'Carta de presentación'], [/(?:documento de identidad|c[eé]dula)/iu, 'Identificación'], [/(?:certificado de existencia|registro mercantil|matr[ií]cula mercantil)/iu, 'Existencia o registro mercantil'], [/(?:registro [úu]nico tributario|\bRUT\b)/iu, 'RUT'], [/(?:seguridad social|aportes)/iu, 'Seguridad social'], [/(?:inhabilidades|incompatibilidades)/iu, 'Inhabilidades'], [/(?:transparencia|anticorrupci[oó]n)/iu, 'Transparencia'], [/(?:oferta econ[oó]mica|total oferta)/iu, 'Oferta económica']];
  return { originalName, supplier, taxId, representative, total: toMoney(labelledValue(lines, /^TOTAL OFERTA\b/iu)), subtotal: toMoney(labelledValue(lines, /^SUBTOTAL ANTES DE IVA\b/iu)), ivaTotal: toMoney(labelledValue(lines, /^IVA TOTAL\b/iu)), delivery: labelledValue(lines, /^Plazo(?:\s+y\s+lugar)?\s+de entrega(?:\s+ofrecido)?\b/iu), validity: labelledValue(lines, /^Vigencia de la oferta\b/iu), items: extractItems(lines), legalDocuments: legalTests.filter(([pattern]) => pattern.test(text)).map(([, label]) => label), hasMissingAnnexes: /(?:no\s+incluid[oa]s?\s+en\s+este\s+archivo|no\s+adjunt[oa]s?)/iu.test(text) };
}
async function readOfferText(bytes: Uint8Array, mimeType: string): Promise<string | null> {
  if (mimeType.includes('wordprocessingml')) return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  if (mimeType === 'application/pdf') { const parser = new PDFParse({ data: bytes }); try { return (await parser.getText()).text; } finally { await parser.destroy(); } }
  return null;
}
async function offers(processId: string): Promise<Offer[]> {
  const files = getSqlite().prepare(`SELECT f.original_name AS originalName, f.storage_key AS storageKey, f.mime_type AS mimeType FROM documents d JOIN document_versions dv ON dv.document_id = d.id JOIN files f ON f.document_version_id = dv.id WHERE d.process_id = ? AND d.kind = 'OFFERS_RECEIVED' ORDER BY f.created_at ASC`).all(processId) as Array<{ originalName: string; storageKey: string; mimeType: string }>;
  const storage = new LocalPrivateStorage();
  return Promise.all(files.map(async (file) => { const text = await readOfferText(await storage.read(file.storageKey), file.mimeType); return text === null ? { originalName: file.originalName, supplier: 'No identificable', taxId: 'No identificable', representative: 'No identificable', total: null, subtotal: null, ivaTotal: null, delivery: 'Ver archivo original', validity: 'Ver archivo original', items: [], legalDocuments: [], hasMissingAnnexes: true } : extractOffer(text, file.originalName); }));
}
function corrections(processId: string): string[] { return (getSqlite().prepare(`SELECT note FROM process_stage_actions WHERE process_id = ? AND action = 'EVALUATION_CORRECTIONS_REQUESTED' AND note IS NOT NULL ORDER BY created_at ASC`).all(processId) as Array<{ note: string }>).map((item) => item.note); }

export async function analyzeEvaluationOffers(process: ProcessDetail) {
  const evaluatedOffers = await offers(process.id);
  const budget = createMarketStudyBudget(process);
  const expectedItems = process.marketStudy.comparisons.map((comparison) => ({ description: comparison.description, quantity: comparison.quantity }));
  const invitation = process.drafts.find((draft) => draft.kind === 'PUBLIC_INVITATION')?.content ?? '';
  const financialIndicatorsRequired = /(indicador(?:es)? financiero(?:s)?|capacidad financiera|liquidez|endeudamiento)/iu.test(invitation);
  const evaluations = evaluateOffers(evaluatedOffers, expectedItems, budget, financialIndicatorsRequired);
  const orderedEvaluations = [...evaluations].sort((left, right) => {
    if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
    return (left.offer.total ?? Number.POSITIVE_INFINITY) - (right.offer.total ?? Number.POSITIVE_INFINITY);
  });
  const lowestEligible = lowestPricedEligible(evaluations);
  return { evaluations, orderedEvaluations, lowestEligible };
}

export async function createEvaluationActDocx(process: ProcessDetail): Promise<Buffer> {
  const observations = corrections(process.id); const generatedAt = new Date(); const city = process.institutionCity.trim() || 'la ciudad de sede principal de la Institución Educativa'; const object = createMarketStudyNarrative(process).objectDescription;
  const { evaluations, orderedEvaluations, lowestEligible } = await analyzeEvaluationOffers(process);
  const definitive = process.actions.some((action) => action.action === 'EVALUATION_APPROVED');
  const evaluators = process.evaluationTeam?.evaluators ?? [];
  const supervisor = process.evaluationTeam?.supervisor ?? null;
  const evaluatorRows = evaluators.length ? evaluators.map((member) => [member.name, member.role, '________________________']) : [['Pendiente de registro institucional', 'Evaluador(a)', '________________________']];
  const supervisorRows = supervisor ? [[supervisor.name, supervisor.role, '________________________']] : [['Pendiente de registro institucional', 'Supervisor(a) del proceso', '________________________']];
  const children: Array<Paragraph | Table> = [
    body(process.institutionName.toLocaleUpperCase('es-CO'), { center: true, bold: true, after: 45 }), body(city, { center: true, after: 45 }), body('FONDO DE SERVICIOS EDUCATIVOS', { center: true, bold: true, after: 260 }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: definitive ? 'ACTA DEFINITIVA DE EVALUACIÓN DE PROPUESTAS' : 'ACTA DE EVALUACIÓN DE PROPUESTAS', font: 'Aptos Display', size: 34, bold: true })] }),
    table(['Proceso', 'Fecha', 'Estado'], [[`Contratación de cuantía inferior a 20 SMLMV · Proceso No. ${formatInstitutionProcessConsecutive(process.institutionSequence, process.createdAt)}`, generatedAt.toLocaleDateString('es-CO', { dateStyle: 'long' }), definitive ? 'Acta definitiva aprobada por el comité' : `Versión para revisión ${observations.length + 1}`]]),
    heading('1. Objeto de la evaluación'), body(`La presente acta documenta la evaluación jurídica, técnica y financiera de las propuestas recibidas en el proceso cuyo objeto es: ${object}. La evaluación se realiza con base en la invitación pública, el estudio previo, el reglamento institucional aplicable y la evidencia original del expediente.`), body('La evaluación identifica las propuestas habilitadas y ordena por menor valor total las que cumplen la totalidad de las condiciones exigidas. La aprobación del acta conserva el control institucional previo a la decisión de selección.'),
    heading('2. Integrantes y metodología'), table(['Integrante del comité', 'Cargo o función', 'Firma'], [...evaluatorRows, ...supervisorRows]), body('Se evalúan los requisitos jurídicos exigidos, las especificaciones y cantidades de la matriz aprobada, y la información financiera y económica de cada propuesta. El resultado se establece después de presentar la evaluación detallada de cada oferta; cuando un soporte exigido no se localiza en el conjunto de archivos de una oferta, el acta deja la evidencia específica para revisión del comité.'),
    heading('3. Ofertas recibidas e identificación'), table(['No.', 'Proponente e identificación', 'Archivo examinado', 'Valor total informado', 'Entrega / vigencia'], evaluations.map((evaluation, index) => [String(index + 1), `${evaluation.offer.supplier}\nNIT o documento: ${evaluation.offer.taxId}\nRepresentante: ${evaluation.offer.representative}`, evaluation.offer.originalName, money(evaluation.offer.total), `${evaluation.offer.delivery}\n${evaluation.offer.validity}`])),
  ];
  for (const [index, evaluation] of orderedEvaluations.entries()) {
    const offer = evaluation.offer;
    const legalRows = evaluation.legal.map((row) => [row.requirement, row.evidence, row.result]);
    const technicalRows = evaluation.technical.map((row) => [row.requirement, row.evidence, row.result]);
    const financialRows = evaluation.financial.map((row) => [row.requirement, row.evidence, row.result]);
    const economicRows = offer.items.length ? [...offer.items.map((item) => [item.number, item.description, item.quantity, item.unit, item.tax, item.total]), ['', 'TOTALES DE LA OFERTA', '', money(offer.subtotal), money(offer.ivaTotal), money(offer.total)]] : [['—', 'Verificar oferta económica original', '—', '—', '—', money(offer.total)]];
    children.push(heading(`4.${index + 1} Evaluación de la propuesta ${index + 1}`), table(['Dato del proponente', 'Información identificada'], [['Proponente', offer.supplier], ['NIT o documento', offer.taxId], ['Representante legal', offer.representative], ['Archivo examinado', offer.originalName], ['Entrega / vigencia', `${offer.delivery}\n${offer.validity}`]]), heading(`4.${index + 1}.1 Evaluación de requisitos jurídicos`), table(['Requisito exigido', 'Evidencia localizada', 'Resultado'], legalRows), heading(`4.${index + 1}.2 Evaluación técnica`), table(['Especificación exigida', 'Evidencia localizada', 'Resultado'], technicalRows), heading(`4.${index + 1}.3 Evaluación financiera y económica`), table(['Requisito', 'Evidencia localizada', 'Resultado'], financialRows), heading(`4.${index + 1}.4 Matriz económica de la propuesta`), table(['Ítem', 'Descripción', 'Cantidad', 'Valor unitario antes de IVA', 'IVA', 'Total ítem'], economicRows), body(`Resultado integral de esta propuesta: ${evaluationSummary(evaluation)}.`));
  }
  children.push(heading('5. Cuadro consolidado y orden de elegibilidad'), table(['Orden de elegibilidad', 'Proponente', 'Jurídica', 'Técnica', 'Financiera', 'Resultado'], orderedEvaluations.map((evaluation, index) => [evaluation.eligible ? String(index + 1) : 'No habilitada', evaluation.offer.supplier, evaluation.legalPass ? (evaluation.pendingVerification ? 'PENDIENTE DE VERIFICACIÓN' : 'CUMPLE') : 'NO CUMPLE', evaluation.technicalPass ? 'CUMPLE' : 'NO CUMPLE', evaluation.financialPass ? 'CUMPLE' : 'NO CUMPLE', evaluationSummary(evaluation)])), heading('6. Conclusión de la evaluación'), ...(lowestEligible ? [body(`Se identifica a ${lowestEligible.offer.supplier} como la oferta de menor valor total informado entre las propuestas evaluables: ${money(lowestEligible.offer.total)}. Esta conclusión expone el resultado del análisis y no designa por sí misma un proponente seleccionado.`), body(lowestEligible.pendingVerification ? 'La oferta de menor valor contiene verificaciones pendientes indicadas expresamente en su evaluación detallada. Corresponde al comité corroborarlas sobre los archivos originales antes de aprobar el acta y adoptar una decisión de selección.' : definitive ? 'El comité evaluador aprobó esta versión definitiva del análisis. El comité debe adoptar, en un Acta de selección de oferente independiente, la decisión expresa sobre el proponente seleccionado e incorporarla firmada al expediente.' : 'Esta identificación aplica la regla objetiva de menor precio entre las ofertas habilitadas. La aprobación institucional del acta y la decisión posterior de selección mediante acta independiente continúan siendo actuaciones obligatorias del expediente.')] : [body('No se identificó una oferta que CUMPLA la totalidad de los requisitos jurídicos, técnicos y financieros exigidos en los archivos recibidos. En consecuencia, no procede selección de oferente, carta de aceptación, contrato ni expedición de RP dentro de este expediente.'), body('Rectoría deberá registrar el cierre sin selección. La Institución Educativa podrá definir una nueva actuación o convocatoria únicamente conforme a su reglamento de contratación y a las reglas de publicidad que correspondan; la falta de anexos no se presume subsanable.')]), heading('7. Observaciones'), ...(observations.length ? observations.map((note, index) => body(`${index + 1}. Observación del comité: ${note}`)) : [body(definitive ? 'No se registran observaciones pendientes en la versión definitiva aprobada por el comité.' : 'No se han registrado observaciones adicionales. El comité puede solicitar correcciones concretas desde el expediente antes de registrar la decisión de selección o el cierre sin selección.')]), body(`Se expide en ${city}, a los ${generatedAt.toLocaleDateString('es-CO', { dateStyle: 'long' })}.`, { after: 170 }), table(['Nombre y cargo', 'Firma'], [...evaluatorRows.map(([name, role, signature]) => [`${name}\n${role}`, signature]), ...supervisorRows.map(([name, role, signature]) => [`${name}\n${role}`, signature]), [`${process.responsibleName}\nRector(a) / Ordenador(a) del gasto`, '________________________']]));
  return Packer.toBuffer(new Document({ creator: process.institutionName, title: 'Acta de evaluación de propuestas', description: 'Acta institucional de evaluación', sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}
