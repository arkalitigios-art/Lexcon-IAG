import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { getSqlite } from '@/platform/database/client';
import { LocalPrivateStorage } from '@/platform/storage/local-storage';

export type PrecontractualSchedule = Array<{ activity: string; date: Date; legalMinimum: string }>;
export type PrecontractualDocumentContext = { cdpNumber: string | null; cdpOriginalName: string; generatedAt: string; schedule: PrecontractualSchedule };

function atUtc(year: number, month: number, day: number): Date { return new Date(Date.UTC(year, month - 1, day)); }
function addDays(date: Date, days: number): Date { const copy = new Date(date); copy.setUTCDate(copy.getUTCDate() + days); return copy; }
function easterSunday(year: number): Date {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4;
  const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return atUtc(year, month, day);
}
function followingMonday(date: Date): Date { const weekday = date.getUTCDay(); return weekday === 1 ? date : addDays(date, (8 - weekday) % 7); }
function holidayKeys(year: number): Set<string> {
  const key = (date: Date) => date.toISOString().slice(0, 10);
  const fixed = [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]].map(([month, day]) => atUtc(year, month, day));
  const emiliani = [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]].map(([month, day]) => followingMonday(atUtc(year, month, day)));
  const easter = easterSunday(year);
  const moveable = [addDays(easter, -3), addDays(easter, -2), followingMonday(addDays(easter, 39)), followingMonday(addDays(easter, 60)), followingMonday(addDays(easter, 68))];
  return new Set([...fixed, ...emiliani, ...moveable].map(key));
}

export function isColombianBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidayKeys(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));
}

export function addColombianBusinessDays(from: Date, businessDays: number): Date {
  let value = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let added = 0;
  while (added < businessDays) { value = addDays(value, 1); if (isColombianBusinessDay(value)) added += 1; }
  return value;
}

export function buildMinimumQuantitySchedule(generatedAt: string): PrecontractualSchedule {
  const created = new Date(generatedAt);
  const publication = addColombianBusinessDays(created, 1);
  const response = addColombianBusinessDays(publication, 1);
  const offers = addColombianBusinessDays(response, 1);
  const evaluation = addColombianBusinessDays(offers, 1);
  const observations = addColombianBusinessDays(evaluation, 1);
  const acceptance = addColombianBusinessDays(observations, 1);
  return [
    { activity: 'Publicación de documentos; recepción de observaciones y solicitudes de limitación a Mipyme', date: publication, legalMinimum: 'Mínimo un día hábil de publicación.' },
    { activity: 'Respuesta a observaciones, adendas permitidas y aviso sobre limitación a Mipyme', date: response, legalMinimum: 'Debe ocurrir antes del inicio del plazo de ofertas.' },
    { activity: 'Recepción y cierre de ofertas', date: offers, legalMinimum: 'Mínimo un día hábil después del aviso sobre limitación a Mipyme.' },
    { activity: 'Evaluación y publicación del informe de evaluación', date: evaluation, legalMinimum: 'Publicación del informe para traslado.' },
    { activity: 'Traslado del informe y recepción de observaciones', date: observations, legalMinimum: 'Mínimo un día hábil de publicación del informe.' },
    { activity: 'Respuesta a observaciones y aceptación de la oferta, si procede', date: acceptance, legalMinimum: 'Después del traslado del informe y sus observaciones.' },
  ];
}

export function extractCdpNumber(text: string, filename = ''): string | null {
  const usable = (value: string | undefined): string | null => {
    const candidate = value?.replace(/[.,;:]$/, '').trim();
    if (!candidate || /^(?:cdp|no|n[º°]?|n[uú]mero|numero|de)$/iu.test(candidate)) return null;
    return candidate;
  };
  const patterns = [
    /(?:certificado\s+de\s+disponibilidad\s+presupuestal|\bcdp\b)\s*(?:(?:n(?:[úu]mero)|no\.?|n[º°])\s*)?[:#-]?\s*([A-Za-z0-9][A-Za-z0-9./-]{1,40})/iu,
    /(?:(?:n(?:[úu]mero)|no\.?|n[º°])\s*(?:de\s*)?cdp)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9./-]{1,40})/iu,
  ];
  for (const pattern of patterns) {
    const candidate = usable(text.match(pattern)?.[1]);
    if (candidate) return candidate;
  }
  const filenameMatch = filename.match(/\bcdp[_ -]+(\d{2,}(?:[-_]\d{2,})*)(?![-_]\d)/iu);
  return usable(filenameMatch?.[1]);
}

async function readCertificateText(storageKey: string, mimeType: string): Promise<string> {
  const bytes = await new LocalPrivateStorage().read(storageKey);
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: bytes });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  return '';
}

export async function loadPrecontractualDocumentContext(processId: string, generatedAt: string): Promise<PrecontractualDocumentContext> {
  const certificate = getSqlite().prepare(`SELECT f.storage_key AS storageKey, f.original_name AS originalName, f.mime_type AS mimeType
    FROM documents d JOIN document_versions dv ON dv.document_id = d.id JOIN files f ON f.document_version_id = dv.id
    WHERE d.process_id = ? AND d.kind = 'BUDGET_CERTIFICATE' ORDER BY f.created_at DESC LIMIT 1`).get(processId) as { storageKey: string; originalName: string; mimeType: string } | undefined;
  let cdpNumber: string | null = null;
  if (certificate) { try { cdpNumber = extractCdpNumber(await readCertificateText(certificate.storageKey, certificate.mimeType), certificate.originalName); } catch { cdpNumber = extractCdpNumber('', certificate.originalName); } }
  return { cdpNumber, cdpOriginalName: certificate?.originalName ?? 'CDP no disponible', generatedAt, schedule: buildMinimumQuantitySchedule(generatedAt) };
}
