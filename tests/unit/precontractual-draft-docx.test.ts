import { describe, expect, it } from 'vitest';
import mammoth from 'mammoth';
import { createPrecontractualDraftDocx } from '../../src/modules/automation/precontractual-draft-docx';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';
import { addColombianBusinessDays, buildMinimumQuantitySchedule, extractCdpNumber } from '../../src/modules/automation/precontractual-context';
import { formatInstitutionProcessConsecutive } from '../../src/modules/processes/process-consecutive';

const process = {
  id: 'process', institutionSequence: 1, phase: 'PRECONTRACTUAL', status: 'PENDING_ACTION', createdAt: '2026-09-30T12:00:00.000Z', institutionName: 'IE Ficticia Horizonte', institutionCity: 'Bogotá', attorneyName: 'Abogada', responsibleName: 'Rectoría Horizonte', blockReason: null,
  quotations: [], quotationTotals: [], approvalDelivery: null, documents: [{ fileId: 'cdp', kind: 'BUDGET_CERTIFICATE', originalName: 'CDP-001.pdf', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-09-30T12:00:00.000Z' }], actions: [], drafts: [],
  marketStudy: { regulationName: 'Manual.pdf', regulationVersion: 1, profile: { objectDescription: 'Suministro de papelería.', unspscCodes: '', demandAnalysis: 'Necesidad institucional.', supplyAnalysis: 'Oferta observada.', taxBasis: 'Sin IVA verificable.' }, comparisons: [{ description: 'resma de papel', quantity: '10', values: [{ source: 'a.pdf', unitValue: '10000', totalValue: '100000', taxRate: null, taxTreatment: 'UNVERIFIED' }], minimum: '10000', maximum: '10000', arithmeticMean: '10000' }] },
} satisfies ProcessDetail;
const context = { cdpNumber: '2026-001', cdpOriginalName: 'CDP-2026-001.pdf', generatedAt: '2026-09-30T12:00:00.000Z', schedule: buildMinimumQuantitySchedule('2026-09-30T12:00:00.000Z') };

describe('documentos precontractuales descargables', () => {
  it('genera un archivo DOCX con el documento de revisión', async () => {
    const document = await createPrecontractualDraftDocx(process, 'PRELIMINARY_STUDY', context);
    expect(document.subarray(0, 2).toString()).toBe('PK');
    const text = (await mammoth.extractRawText({ buffer: document })).value;
    expect(text).toContain('Proceso No. 2026-0001');
    expect(text).toContain('CDP No. 2026-001');
    // A full preliminary study contains its planning chapters, requirements,
    // risk allocation and schedule; this guards against regressing to a
    // one-page market-study summary.
    expect(document.byteLength).toBeGreaterThan(8_000);
  });

  it('genera la invitación pública con los elementos institucionales pendientes', async () => {
    const document = await createPrecontractualDraftDocx(process, 'PUBLIC_INVITATION', context);
    expect(document.subarray(0, 2).toString()).toBe('PK');
    const text = (await mammoth.extractRawText({ buffer: document })).value;
    expect(text).toContain('Proceso No. 2026-0001');
    expect(text).toContain('CDP No. 2026-001');
    // The invitation includes participation rules and the offer annexes.
    expect(document.byteLength).toBeGreaterThan(9_000);
  });

  it('calcula la publicación para el día hábil siguiente y conserva los mínimos de mínima cuantía', () => {
    const schedule = buildMinimumQuantitySchedule('2026-09-30T12:00:00.000Z');
    expect(schedule[0].date.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(schedule[2].date.toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(schedule[4].legalMinimum).toContain('un día hábil');
  });

  it('omite los festivos nacionales al calcular las fechas', () => {
    const nextBusinessDay = addColombianBusinessDays(new Date('2026-12-24T12:00:00.000Z'), 1);
    expect(nextBusinessDay.toISOString().slice(0, 10)).toBe('2026-12-28');
  });

  it('extrae el número del certificado de disponibilidad presupuestal', () => {
    expect(extractCdpNumber('CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL No. 2026-001')).toBe('2026-001');
    expect(extractCdpNumber('CDP No. CDP', 'CDP-2026-0041_IE_Ficticia_Amanecer.pdf')).toBe('2026-0041');
  });

  it('formatea el consecutivo independiente asignado a la institución', () => {
    expect(formatInstitutionProcessConsecutive(1, '2026-09-30T12:00:00.000Z')).toBe('2026-0001');
  });
});
