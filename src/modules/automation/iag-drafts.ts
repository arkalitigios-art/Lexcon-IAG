import { randomUUID } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { getSqlite } from '../../platform/database/client';
import { LocalPrivateStorage } from '../../platform/storage/local-storage';
import { notifyProcessParticipants } from '../notifications/process-notifications';

type TaxTreatment = 'INCLUDED_IN_REPORTED_TOTAL' | 'EXCLUDED_FROM_REPORTED_TOTAL' | 'EXEMPT' | 'UNVERIFIED';
type ExtractedItem = { description: string; normalizedDescription: string; quantity: string; unitValue: string | null; totalValue: string | null; taxRate: string | null; taxTreatment: TaxTreatment };
type QuoteSource = { quoteId: string; versionId: string; storageKey: string; originalName: string; mimeType: string; supplierName: string | null };
type Extraction = { source: QuoteSource; status: 'EXTRACTED' | 'UNSTRUCTURED' | 'UNSUPPORTED' | 'FAILED'; text: string; items: ExtractedItem[]; issues: string[]; supplierName: string | null };
type Comparison = { description: string; quantity: string; values: Array<{ source: string; unitValue: string; totalValue: string | null; taxRate: string | null; taxTreatment: TaxTreatment }>; minimum: string; maximum: string; arithmeticMean: string };

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function moneyToCents(value: string): bigint | null {
  const raw = value.replace(/(?:cop|\$|\s)/gi, '').replace(/[^0-9,.-]/g, '');
  if (!raw || /^[-.,]+$/.test(raw) || raw.startsWith('-')) return null;
  const dotThousands = raw.match(/^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/);
  if (dotThousands) return BigInt(dotThousands[1].replaceAll('.', '')) * 100n + BigInt((dotThousands[2] ?? '').padEnd(2, '0'));
  const commaThousands = raw.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/);
  if (commaThousands) return BigInt(commaThousands[1].replaceAll(',', '')) * 100n + BigInt((commaThousands[2] ?? '').padEnd(2, '0'));
  const lastComma = raw.lastIndexOf(','); const lastDot = raw.lastIndexOf('.');
  let integer = raw; let decimal = '';
  const separator = lastComma > lastDot ? ',' : lastDot >= 0 ? '.' : '';
  if (separator) {
    const position = separator === ',' ? lastComma : lastDot;
    const trailing = raw.slice(position + 1).replace(/\D/g, '');
    const leading = raw.slice(0, position).replace(/\D/g, '');
    const otherSeparator = separator === ',' ? '.' : ',';
    if (!(trailing.length === 3 && !raw.includes(otherSeparator) && raw.indexOf(separator) === position)) {
      integer = leading || '0'; decimal = trailing;
    } else integer = raw.replace(/\D/g, '');
  } else integer = raw.replace(/\D/g, '');
  if (!/^\d+$/.test(integer) || !/^\d*$/.test(decimal)) return null;
  return BigInt(integer) * 100n + BigInt((decimal + '00').slice(0, 2));
}

function centsToMoney(cents: bigint): string {
  const integer = cents / 100n; const fraction = (cents % 100n).toString().padStart(2, '0');
  return `$${integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\,${fraction} COP`;
}

/** Rounds a positive quotient to the nearest integer, with .5 rounded up. */
function roundedDivision(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

/**
 * The market-study model uses the simple arithmetic mean of comparable unit
 * prices. Amounts are first represented in cents and the resulting unit price
 * is rounded to the nearest Colombian peso for its presentation in the study.
 */
function arithmeticMeanUnitValue(cents: bigint[]): string {
  const meanInCents = roundedDivision(cents.reduce((total, value) => total + value, 0n), BigInt(cents.length));
  return centsToMoney(roundedDivision(meanInCents, 100n) * 100n);
}

export function calculateArithmeticMeanUnitValue(values: string[]): string | null {
  const cents = values.map(moneyToCents).filter((value): value is bigint => value !== null);
  return cents.length === values.length && cents.length >= 2 ? arithmeticMeanUnitValue(cents) : null;
}

function normalizedMoney(value: string): string | null {
  const cents = moneyToCents(value);
  if (cents === null) return null;
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

function normalizedTax(value: string | undefined): string | null {
  if (!value) return null;
  const percent = value.match(/\b(\d+(?:[.,]\d+)?)\s*%/);
  if (percent && /exclu(?:ido|ida)/i.test(value)) return `${percent[1].replace(',', '.')}% excluido`;
  if (percent && /inclu(?:ido|ida)/i.test(value)) return `${percent[1].replace(',', '.')}% incluido`;
  if (percent) return `${percent[1].replace(',', '.')}%`;
  if (/exento/i.test(value)) return 'Exento';
  if (/exclu(?:ido|ida)/i.test(value)) return 'Excluido';
  if (/inclu(?:ido|ida)/i.test(value)) return 'Incluido, sin porcentaje discriminado';
  return null;
}

function taxTreatment(quantity: string, unitValue: string | null, totalValue: string | null, taxRate: string | null): TaxTreatment {
  if (taxRate === 'Exento') return 'EXEMPT';
  if (/exclu(?:ido|ida)/i.test(taxRate ?? '')) return 'EXCLUDED_FROM_REPORTED_TOTAL';
  const quantityValue = Number(quantity);
  const base = unitValue ? moneyToCents(unitValue) : null;
  const total = totalValue ? moneyToCents(totalValue) : null;
  if (!base || !total || !Number.isFinite(quantityValue)) return 'UNVERIFIED';
  const baseTotal = base * BigInt(Math.round(quantityValue));
  const percent = taxRate?.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) {
    const rate = Number(percent[1]);
    const withTax = roundedDivision(baseTotal * BigInt(Math.round((100 + rate) * 100)), 10000n);
    if (total === withTax) return 'INCLUDED_IN_REPORTED_TOTAL';
  }
  // La coincidencia aritmética por sí sola no acredita que el IVA esté excluido.
  // Se requiere una mención expresa de la fuente para no presentar una inferencia
  // tributaria como si fuera un dato de la cotización.
  return 'UNVERIFIED';
}

function labelled(line: string, names: string[]): string | null {
  const match = line.match(new RegExp(`(?:${names.join('|')})\\s*[:\\-]\\s*(.+?)(?=(?:\\s*[|;]\\s*|\\s+)(?:descripcion|descripci[oó]n|item|bien|servicio|cantidad|cant\\.?|valor|precio)\\b|$)`, 'i'));
  return match?.[1]?.trim() || null;
}

function extractPrintedTableItems(lines: string[]): ExtractedItem[] {
  const items: ExtractedItem[] = []; let tableStarted = false; let pending = '';
  const commit = () => {
    const row = pending.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+\$\s*([\d.,]+)\s+((?:\d+(?:[.,]\d+)?%\s*(?:IVA\s*)?(?:inclu(?:ido|ida)|exclu(?:ido|ida))?|excluido|exento))\s+\$\s*([\d.,]+)\s*$/i);
    if (!row) return false;
    const unitValue = normalizedMoney(row[4]); const totalValue = normalizedMoney(row[6]);
    if (unitValue && totalValue) { const quantity = row[2].replace(',', '.'); const taxRate = normalizedTax(row[5]); items.push({ description: row[1].trim(), normalizedDescription: normalized(row[1]), quantity, unitValue, totalValue, taxRate, taxTreatment: taxTreatment(quantity, unitValue, totalValue, taxRate) }); }
    pending = ''; return true;
  };
  for (const line of lines) {
    if (/(?:#\s*)?descripci[oó]n\s+cant\.?\s+unidad\s+(?:vr\.?\s*)?(?:unitario|precio)/i.test(line)) { tableStarted = true; pending = ''; continue; }
    if (!tableStarted) continue;
    if (/^(?:subtotal|iva\s+discriminado|valor\s+total|observaciones)/i.test(line)) { pending = ''; tableStarted = false; continue; }
    const numbered = line.match(/^\d{1,3}\s+(.+)$/);
    if (numbered) { pending = numbered[1]; commit(); continue; }
    if (pending) { pending = `${pending} ${line}`.replace(/\s+/g, ' ').trim(); commit(); }
  }
  return items;
}

/** Deterministic parser for labelled quotations. It deliberately leaves unclear layouts unstructured. */
export function extractQuoteItemsFromText(text: string): { supplierName: string | null; items: ExtractedItem[]; issues: string[] } {
  const items: ExtractedItem[] = []; const issues: string[] = [];
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.replace(/\t/g, '    ').replace(/\u00a0/g, ' ').replace(/ {3,}/g, '  ').trim()).filter(Boolean);
  const supplierLine = lines.find((line) => /(?:proveedor|oferente|cotizante|raz[oó]n social)\s*[:\-]/i.test(line));
  const nitIndex = lines.findIndex((line) => /^nit\s*:/i.test(line));
  const supplierName = supplierLine ? labelled(supplierLine, ['proveedor', 'oferente', 'cotizante', 'raz[oó]n social']) : nitIndex > 0 ? lines[nitIndex - 1] : null;
  let current: { description?: string; quantity?: string; unitValue?: string | null; totalValue?: string | null; taxRate?: string | null } = {};
  const flush = () => {
    if (!current.description) return;
    const description = current.description.replace(/[|;]+$/, '').trim(); const quantity = current.quantity ?? '1';
    const unitValue = current.unitValue ?? (quantity === '1' ? current.totalValue ?? null : null);
    if (!unitValue && !current.totalValue) { issues.push(`No se identificó un valor verificable para “${description}”.`); current = {}; return; }
    const totalValue = current.totalValue ?? null; const taxRate = current.taxRate ?? null;
    items.push({ description, normalizedDescription: normalized(description), quantity, unitValue, totalValue, taxRate, taxTreatment: taxTreatment(quantity, unitValue, totalValue, taxRate) }); current = {};
  };
  for (const line of lines) {
    const description = labelled(line, ['descripci[oó]n', 'item', 'bien', 'servicio']);
    if (description) { if (current.description) flush(); current.description = description; }
    const quantity = labelled(line, ['cantidad', 'cant\\.?']);
    if (quantity?.match(/^\d+(?:[.,]\d+)?$/)) current.quantity = quantity.replace(',', '.');
    const unit = labelled(line, ['valor unitario', 'precio unitario', 'valor por unidad']);
    if (unit) current.unitValue = normalizedMoney(unit);
    const total = labelled(line, ['valor total', 'precio total', 'total']);
    if (total) current.totalValue = normalizedMoney(total);
    const tax = labelled(line, ['iva', 'impuesto al valor agregado']);
    if (tax) current.taxRate = normalizedTax(tax);
    if (!description && !quantity && !unit && !total && !tax) {
      const columns = line.match(/^(.+?)\s{2,}(\d+(?:[.,]\d+)?)\s{2,}(?:COP\s*|\$\s*)?([\d.,]+)(?:\s{2,}(?:COP\s*|\$\s*)?([\d.,]+))?$/i);
      if (columns) { if (current.description) flush(); current = { description: columns[1].trim(), quantity: columns[2].replace(',', '.'), unitValue: normalizedMoney(columns[3]), totalValue: columns[4] ? normalizedMoney(columns[4]) : null, taxRate: null }; flush(); }
    }
  }
  flush();
  items.push(...extractPrintedTableItems(lines));
  const unique = new Map(items.map((item) => [`${item.normalizedDescription}|${item.quantity}|${item.unitValue}|${item.totalValue}|${item.taxRate}`, item]));
  return { supplierName, items: [...unique.values()], issues };
}

async function extractText(source: QuoteSource, storage: LocalPrivateStorage): Promise<{ text: string; status: Extraction['status']; issues: string[] }> {
  if (source.mimeType !== 'application/pdf' && source.mimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return { text: '', status: 'UNSUPPORTED', issues: ['La extracción automática admite PDF con texto o DOCX; este archivo requiere transcripción o una versión legible.'] };
  try {
    const bytes = await storage.read(source.storageKey);
    if (source.mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: bytes });
      try { const result = await parser.getText(); return result.text.trim() ? { text: result.text, status: 'EXTRACTED', issues: [] } : { text: '', status: 'UNSTRUCTURED', issues: ['El PDF no contiene texto seleccionable.'] }; } finally { await parser.destroy(); }
    }
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value.trim() ? { text: result.value, status: 'EXTRACTED', issues: result.messages.map((message) => message.message) } : { text: '', status: 'UNSTRUCTURED', issues: ['El DOCX no contiene texto utilizable.'] };
  } catch (error) {
    return { text: '', status: 'FAILED', issues: [error instanceof Error ? `No fue posible extraer el texto: ${error.message}` : 'No fue posible extraer el texto.'] };
  }
}

function saveMarketDraft(processId: string, content: string, status: string): void {
  getSqlite().prepare(`INSERT INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, 'MARKET_STUDY', 'Estudio de mercado', ?, ?, ?)
    ON CONFLICT(process_id, kind) DO UPDATE SET title = CASE WHEN generated_drafts.status = 'APPROVED' THEN generated_drafts.title ELSE excluded.title END, content = CASE WHEN generated_drafts.status = 'APPROVED' THEN generated_drafts.content ELSE excluded.content END, status = CASE WHEN generated_drafts.status = 'APPROVED' THEN generated_drafts.status ELSE excluded.status END`).run(randomUUID(), processId, content, status, new Date().toISOString());
}

function createComparisons(extractions: Extraction[]): Comparison[] {
  const groups = new Map<string, Array<{ source: string; quoteId: string; item: ExtractedItem }>>();
  for (const extraction of extractions) for (const item of extraction.items) {
    if (!item.unitValue) continue;
    const key = `${item.normalizedDescription}|${item.quantity}`;
    groups.set(key, [...(groups.get(key) ?? []), { source: extraction.source.originalName, quoteId: extraction.source.quoteId, item }]);
  }
  return [...groups.values()].flatMap((group) => {
    if (new Set(group.map((entry) => entry.quoteId)).size < 2) return [];
    const cents = group.map((entry) => moneyToCents(entry.item.unitValue ?? '')).filter((value): value is bigint => value !== null);
    if (cents.length < 2) return [];
    return [{ description: group[0].item.description, quantity: group[0].item.quantity, values: group.map((entry) => ({ source: entry.source, unitValue: entry.item.unitValue!, totalValue: entry.item.totalValue, taxRate: entry.item.taxRate, taxTreatment: entry.item.taxTreatment })), minimum: centsToMoney(cents.reduce((minimum, value) => value < minimum ? value : minimum)), maximum: centsToMoney(cents.reduce((maximum, value) => value > maximum ? value : maximum)), arithmeticMean: arithmeticMeanUnitValue(cents) }];
  });
}

type MarketStudyContext = { institutionName: string; openedAt: string; regulationVersion: number | null; regulationName: string | null };

function marketDraft(context: MarketStudyContext, extractions: Extraction[], comparisons: Comparison[], blocked: string[]): string {
  const openedAt = new Date(context.openedAt).toLocaleDateString('es-CO', { dateStyle: 'long' });
  const regulation = context.regulationVersion
    ? `Reglamento de contratación institucional, versión ${context.regulationVersion}${context.regulationName ? ` (${context.regulationName})` : ''}, vinculado al abrir el expediente.`
    : 'No se identificó una versión de reglamento institucional vinculada al expediente.';
  const lines = [
    'ESTUDIO DE MERCADO',
    '',
    'I. IDENTIFICACIÓN DEL DOCUMENTO',
    `Institución Educativa: ${context.institutionName}`,
    `Fecha de apertura del expediente: ${openedAt}`,
    'Objeto del documento: organizar y contrastar la información verificable contenida en las cotizaciones aportadas por la Institución Educativa para soportar la etapa de mercado.',
    '',
    'II. CONTEXTO NORMATIVO Y REGLAMENTARIO',
    '• Ley 715 de 2001, artículos 11 a 14 y, en especial, artículo 13: administración y contratación con recursos del Fondo de Servicios Educativos; principios de igualdad, moralidad, imparcialidad y publicidad, aplicados a las circunstancias concretas.',
    '• Decreto 4791 de 2008 y sus disposiciones compiladas en el Decreto 1075 de 2015: administración del Fondo de Servicios Educativos y aplicación del procedimiento definido por el Consejo Directivo para la contratación que corresponda.',
    `• ${regulation}`,
    'La versión institucional vinculada al expediente orienta las variables de análisis. El estudio no selecciona proveedor ni adopta una decisión institucional.',
    '',
    'III. ANTECEDENTES Y ALCANCE DEL ANÁLISIS',
    'La Institución Educativa aportó las cotizaciones que se relacionan a continuación. Se estructuraron únicamente los campos identificables y se conserva la evidencia original en el expediente.',
    'La comparación se limita a ítems provenientes de cotizaciones distintas que presentan descripción normalizada y cantidad coincidentes. Para cada grupo comparable se calcula el promedio aritmético simple de los valores unitarios: suma de los valores unitarios comparables dividida entre el número de cotizaciones comparables, con redondeo al peso para su presentación. No se selecciona una oferta.',
    '',
    'IV. FUENTES DOCUMENTALES EXAMINADAS'
  ];
  extractions.forEach((extraction, index) => lines.push(`${index + 1}. ${extraction.source.originalName} — ${extraction.supplierName ?? 'Proveedor no identificado automáticamente'} — ${extraction.status === 'EXTRACTED' ? `${extraction.items.length} ítem(s) identificados` : 'requiere verificación humana'}`));
  lines.push('', 'V. MATRIZ DE ÍTEMS Y VALORES IDENTIFICADOS');
  const detected = extractions.flatMap((extraction) => extraction.items.map((item) => `${extraction.source.originalName} | ${item.description} | cantidad: ${item.quantity} | valor unitario: ${item.unitValue ? centsToMoney(moneyToCents(item.unitValue)!) : 'no identificado'}${item.totalValue ? ` | valor total reportado: ${centsToMoney(moneyToCents(item.totalValue)!)} ` : ''}`));
  lines.push(...(detected.length ? detected : ['No se identificaron ítems con valores verificables.']));
  lines.push('', 'VI. ANÁLISIS DE COMPARABILIDAD');
  lines.push(...(comparisons.length ? comparisons.flatMap((comparison) => [`Ítem comparable: ${comparison.description} | cantidad: ${comparison.quantity}`, ...comparison.values.map((value) => `  • ${value.source}: ${centsToMoney(moneyToCents(value.unitValue)!)} por unidad${value.totalValue ? `; total reportado ${centsToMoney(moneyToCents(value.totalValue)!)} ` : ''}`), `  • Promedio aritmético unitario: ${comparison.arithmeticMean}.`, `  • Rango de valores unitarios observados: ${comparison.minimum} a ${comparison.maximum}.`]) : ['No hay dos cotizaciones con el mismo ítem y cantidad identificables para calcular comparabilidad.']));
  lines.push('', 'VII. RESULTADO DEL ANÁLISIS AUTOMATIZADO');
  if (blocked.length) lines.push(...blocked.map((issue) => `• ${issue}`));
  else lines.push('• La automatización identificó los valores indicados en la matriz y calculó el promedio aritmético unitario y el rango por cada ítem comparable.', '• Los ítems que no aparezcan en la sección de comparabilidad no fueron tratados como comparables automáticamente.');
  lines.push('', 'VIII. CONCLUSIÓN', 'Este documento reúne la evidencia estructurada y el análisis reproducible del expediente. No selecciona proveedor ni adopta una decisión institucional.');
  return lines.join('\n');
}

export async function processMarketAnalysis(processId: string): Promise<{ status: 'READY_LEGAL_REVIEW' | 'BLOCKED_DATA' | 'AWAITING_QUOTES' | 'SKIPPED'; extractedDocuments: number; comparableItems: number }> {
  const db = getSqlite();
  const process = db.prepare(`SELECT p.status, p.created_at AS openedAt, i.name AS institutionName, rv.version_number AS regulationVersion,
    rf.original_name AS regulationName
    FROM processes p JOIN institutions i ON i.id = p.institution_id
    LEFT JOIN regulation_versions rv ON rv.id = p.regulation_version_id
    LEFT JOIN regulation_files rf ON rf.regulation_version_id = rv.id
    WHERE p.id = ? LIMIT 1`).get(processId) as ({ status: string } & MarketStudyContext) | undefined;
  if (!process || process.status === 'BLOCKED_REGULATION') return { status: 'SKIPPED', extractedDocuments: 0, comparableItems: 0 };
  const sources = db.prepare(`SELECT q.id AS quoteId, q.document_version_id AS versionId, f.storage_key AS storageKey, f.original_name AS originalName, f.mime_type AS mimeType, q.supplier_name AS supplierName FROM market_quotes q JOIN document_versions dv ON dv.id = q.document_version_id JOIN files f ON f.document_version_id = dv.id WHERE q.process_id = ? ORDER BY f.created_at`).all(processId) as QuoteSource[];
  if (!sources.length) {
    db.transaction(() => {
      db.prepare("UPDATE generated_drafts SET status = 'SUPERSEDED' WHERE process_id = ? AND kind = 'MARKET_STUDY' AND status <> 'APPROVED'").run(processId);
      db.prepare('DELETE FROM market_comparisons WHERE process_id = ?').run(processId);
      db.prepare('DELETE FROM market_analyses WHERE process_id = ?').run(processId);
      db.prepare("UPDATE workflow_blocks SET active = 0 WHERE process_id = ? AND scope = 'MARKET_DATA' AND active = 1").run(processId);
      db.prepare("UPDATE alerts SET status = 'READ' WHERE process_id = ? AND channel = 'IN_APP' AND status = 'OPEN'").run(processId);
      db.prepare("UPDATE processes SET status = 'PENDING_QUOTES' WHERE id = ?").run(processId);
    })();
    return { status: 'AWAITING_QUOTES', extractedDocuments: 0, comparableItems: 0 };
  }
  const storage = new LocalPrivateStorage(); const extractions: Extraction[] = [];
  for (const source of sources) {
    const extracted = await extractText(source, storage);
    const parsed = extracted.status === 'EXTRACTED' ? extractQuoteItemsFromText(extracted.text) : { supplierName: null, items: [], issues: [] };
    const status: Extraction['status'] = extracted.status === 'EXTRACTED' && !parsed.items.length ? 'UNSTRUCTURED' : extracted.status;
    extractions.push({ source, status, text: extracted.text, items: parsed.items, issues: [...extracted.issues, ...parsed.issues], supplierName: parsed.supplierName });
  }
  const comparisons = createComparisons(extractions);
  const blocked = extractions.flatMap((extraction) => extraction.status === 'EXTRACTED' ? [] : [`${extraction.source.originalName}: ${extraction.issues.join(' ') || 'No se identificó una estructura de cotización verificable.'}`]);
  const now = new Date().toISOString();
  db.transaction(() => {
    for (const extraction of extractions) {
      db.prepare(`INSERT INTO document_extractions (id, document_version_id, process_id, parser, status, extracted_text, issues_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(document_version_id) DO UPDATE SET parser = excluded.parser, status = excluded.status, extracted_text = excluded.extracted_text, issues_json = excluded.issues_json, created_at = excluded.created_at`).run(randomUUID(), extraction.source.versionId, processId, extraction.source.mimeType === 'application/pdf' ? 'PDF_TEXT' : extraction.source.mimeType.includes('wordprocessingml') ? 'DOCX_TEXT' : 'UNSUPPORTED', extraction.status, extraction.text, JSON.stringify(extraction.issues), now);
      db.prepare('DELETE FROM market_quote_items WHERE quote_id = ?').run(extraction.source.quoteId);
      for (const item of extraction.items) db.prepare('INSERT INTO market_quote_items (id, quote_id, description, quantity, unit_value, total_value, tax_rate, tax_treatment, exclusion_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)').run(randomUUID(), extraction.source.quoteId, item.description, item.quantity, item.unitValue, item.totalValue, item.taxRate, item.taxTreatment);
      db.prepare('UPDATE market_quotes SET supplier_name = COALESCE(?, supplier_name), status = ? WHERE id = ?').run(extraction.supplierName, extraction.status === 'EXTRACTED' ? 'ANALYZED' : 'REQUIRES_REVIEW', extraction.source.quoteId);
    }
    db.prepare('DELETE FROM market_comparisons WHERE process_id = ?').run(processId);
    for (const comparison of comparisons) db.prepare('INSERT INTO market_comparisons (id, process_id, normalized_description, quantity, values_json, min_unit_value, max_unit_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, normalized(comparison.description), comparison.quantity, JSON.stringify(comparison.values), comparison.minimum, comparison.maximum, now);
    db.prepare('DELETE FROM market_analyses WHERE process_id = ?').run(processId);
    const status = blocked.length ? 'BLOCKED_DATA' : 'READY_LEGAL_REVIEW';
    db.prepare('INSERT INTO market_analyses (id, process_id, document_version_id, status, created_at) VALUES (?, ?, NULL, ?, ?)').run(randomUUID(), processId, status, now);
    saveMarketDraft(processId, marketDraft(process, extractions, comparisons, blocked), status === 'READY_LEGAL_REVIEW' ? 'PENDING_LEGAL_REVIEW' : 'BLOCKED_DATA');
    db.prepare("UPDATE workflow_blocks SET active = 0 WHERE process_id = ? AND scope = 'MARKET_DATA' AND active = 1").run(processId);
    if (blocked.length) {
      const reason = 'No se pudo estructurar automáticamente una o más cotizaciones. Revise los documentos indicados en el borrador y cargue una versión con texto y campos legibles.';
      db.prepare('INSERT INTO workflow_blocks (id, process_id, scope, reason, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), processId, 'MARKET_DATA', reason, now);
      db.prepare("UPDATE processes SET status = 'BLOCKED_MARKET_DATA' WHERE id = ?").run(processId);
      const existing = db.prepare("SELECT id FROM alerts WHERE process_id = ? AND channel = 'IN_APP' AND body = ? AND status = 'OPEN' LIMIT 1").get(processId, reason);
      if (!existing) db.prepare('INSERT INTO alerts (id, user_id, institution_id, process_id, channel, status, body, created_at) SELECT ?, created_by_user_id, institution_id, id, ?, ?, ?, ? FROM processes WHERE id = ?').run(randomUUID(), 'IN_APP', 'OPEN', reason, now, processId);
    } else db.prepare("UPDATE processes SET status = 'RECEIVED' WHERE id = ? AND status IN ('BLOCKED_MARKET_DATA', 'PENDING_QUOTES', 'CORRECTIONS_REQUESTED')").run(processId);
  })();
  if (!blocked.length) notifyAssignedAttorney(processId);
  return { status: blocked.length ? 'BLOCKED_DATA' : 'READY_LEGAL_REVIEW', extractedDocuments: extractions.filter((extraction) => extraction.status === 'EXTRACTED').length, comparableItems: comparisons.length };
}

export function notifyAssignedAttorney(processId: string): void {
  const db = getSqlite();
  const drafts = db.prepare('SELECT title FROM generated_drafts WHERE process_id = ? AND status = ? ORDER BY created_at').all(processId, 'PENDING_LEGAL_REVIEW') as Array<{ title: string }>;
  const process = db.prepare('SELECT created_by_user_id AS createdByUserId, phase FROM processes WHERE id = ?').get(processId) as { createdByUserId: string; phase: string } | undefined;
  if (!process || !drafts.length) return;
  const body = `LEXCON IAG generó ${drafts.map((draft) => draft.title).join(' y ')}. Requiere su revisión jurídica.`;
  notifyProcessParticipants({ processId, actorUserId: process.createdByUserId, nextPhase: process.phase, recipientScope: 'LEGAL', eventKey: `${processId}:LEGAL_REVIEW:${drafts.map((draft) => draft.title).join('|')}`, subject: 'LEXCON IAG: documentos listos para revisión jurídica', body });
}

export function generatePrecontractualDrafts(processId: string): void {
  const db = getSqlite();
  const cdp = db.prepare(`SELECT f.original_name AS name FROM documents d JOIN document_versions dv ON dv.document_id = d.id JOIN files f ON f.document_version_id = dv.id WHERE d.process_id = ? AND d.kind = 'BUDGET_CERTIFICATE' ORDER BY f.created_at DESC LIMIT 1`).get(processId) as { name: string } | undefined;
  if (!cdp) return;
  const base = `Soporte presupuestal recibido: ${cdp.name}. El documento queda disponible para la decisión jurídica de esta etapa antes de cualquier publicación o decisión institucional.`;
  const addDraft = (kind: string, title: string, content: string) => db.prepare('INSERT OR IGNORE INTO generated_drafts (id, process_id, kind, title, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), processId, kind, title, content, 'PENDING_LEGAL_REVIEW', new Date().toISOString()).changes === 1;
  if (addDraft('PRELIMINARY_STUDY', 'Estudio previo o de conveniencia', base)) db.prepare('INSERT INTO precontractual_packages (id, process_id, kind, document_version_id, status, created_at) VALUES (?, ?, ?, NULL, ?, ?)').run(randomUUID(), processId, 'PRELIMINARY_STUDY', 'PENDING_LEGAL_REVIEW', new Date().toISOString());
  if (addDraft('PUBLIC_INVITATION', 'Invitación pública', base)) db.prepare('INSERT INTO precontractual_packages (id, process_id, kind, document_version_id, status, created_at) VALUES (?, ?, ?, NULL, ?, ?)').run(randomUUID(), processId, 'PUBLIC_INVITATION', 'PENDING_LEGAL_REVIEW', new Date().toISOString());
  notifyAssignedAttorney(processId);
}
