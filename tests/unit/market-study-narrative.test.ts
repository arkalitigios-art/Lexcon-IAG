import { describe, expect, it } from 'vitest';
import { createMarketStudyClassifications, createMarketStudyNarrative } from '../../src/modules/automation/market-study-narrative';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';

const process = {
  id: 'process-narrative', phase: 'MARKET', status: 'RECEIVED', createdAt: '2026-09-29T12:00:00.000Z', institutionName: 'IE de prueba', institutionCity: 'Bogotá, D. C.', attorneyName: null, responsibleName: 'Rectoría de prueba', blockReason: null,
  quotations: [{ quoteId: 'quote-1', fileId: 'file-1', originalName: 'oferta-a.pdf', supplierName: 'Proveedor A', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-09-29T12:00:00.000Z' }, { quoteId: 'quote-2', fileId: 'file-2', originalName: 'oferta-b.pdf', supplierName: 'Proveedor B', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-09-29T12:00:00.000Z' }],
  quotationTotals: [{ source: 'oferta-a.pdf', supplierName: 'Proveedor A', totalValue: '100000.00', taxRates: ['19%'], taxTreatments: ['INCLUDED_IN_REPORTED_TOTAL'] }, { source: 'oferta-b.pdf', supplierName: 'Proveedor B', totalValue: '120000.00', taxRates: ['19%'], taxTreatments: ['INCLUDED_IN_REPORTED_TOTAL'] }],
  approvalDelivery: null, documents: [], actions: [], drafts: [],
  marketStudy: { regulationName: 'Manual de prueba', regulationVersion: 1, profile: { objectDescription: '', unspscCodes: '', demandAnalysis: '', supplyAnalysis: '', taxBasis: '' }, comparisons: [{ description: 'Resma de papel bond tamaño carta', quantity: '10', values: [{ source: 'oferta-a.pdf', unitValue: '10000.00', totalValue: '100000.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }, { source: 'oferta-b.pdf', unitValue: '12000.00', totalValue: '120000.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }], minimum: '10000.00', maximum: '12000.00', arithmeticMean: '11000.00' }] },
} satisfies ProcessDetail;

describe('redacción automática del estudio de mercado', () => {
  it('redacta las secciones base desde cotizaciones comparables sin exigir datos manuales', () => {
    const narrative = createMarketStudyNarrative(process);
    expect(narrative.objectDescription).toContain('Suministro de papelería');
    expect(narrative.classification).toContain('44120000');
    expect(narrative.demandAnalysis).toContain('1 grupo');
    expect(narrative.supplyAnalysis).toContain('2 cotización');
  });

  it('usa el complemento institucional cuando existe', () => {
    const narrative = createMarketStudyNarrative({ ...process, marketStudy: { ...process.marketStudy, profile: { ...process.marketStudy.profile, objectDescription: 'Objeto institucional exacto' } } });
    expect(narrative.objectDescription).toBe('Objeto institucional exacto');
  });

  it('clasifica cada bien identificado con su código UNSPSC', () => {
    expect(createMarketStudyClassifications(process)).toEqual([{ item: 1, description: 'Resma de papel bond tamaño carta', code: '14111500', classification: 'Papel para imprimir y escribir', unit: 'Unidad' }]);
  });
});
