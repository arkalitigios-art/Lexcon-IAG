import { describe, expect, it } from 'vitest';
import { createMarketStudyDocx } from '../../src/modules/automation/market-study-docx';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';

const process = {
  id: 'process-docx', phase: 'MARKET', status: 'RECEIVED', createdAt: '2026-09-29T12:00:00.000Z', institutionName: 'IE de prueba', institutionCity: 'Bogotá, D. C.', attorneyName: 'Abogada de prueba', responsibleName: 'Rectoría de prueba', blockReason: null,
  quotations: [{ quoteId: 'quote-1', fileId: 'file-1', originalName: 'oferta-a.pdf', supplierName: 'Proveedor A', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-09-29T12:00:00.000Z' }, { quoteId: 'quote-2', fileId: 'file-2', originalName: 'oferta-b.pdf', supplierName: 'Proveedor B', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-09-29T12:00:00.000Z' }],
  quotationTotals: [{ source: 'oferta-a.pdf', supplierName: 'Proveedor A', totalValue: '100000.00', taxRates: ['19%'], taxTreatments: ['INCLUDED_IN_REPORTED_TOTAL'] }, { source: 'oferta-b.pdf', supplierName: 'Proveedor B', totalValue: '120000.00', taxRates: ['19%'], taxTreatments: ['INCLUDED_IN_REPORTED_TOTAL'] }],
  approvalDelivery: null, documents: [], actions: [], drafts: [],
  marketStudy: { regulationName: 'Manual de prueba', regulationVersion: 1, profile: { objectDescription: 'Suministro de prueba', unspscCodes: '44120000', demandAnalysis: 'Demanda de prueba', supplyAnalysis: 'Oferta de prueba', taxBasis: 'Valores sin inferencias.' }, comparisons: [{ description: 'Resma de papel', quantity: '10', values: [{ source: 'oferta-a.pdf', unitValue: '10000.00', totalValue: '100000.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }, { source: 'oferta-b.pdf', unitValue: '12000.00', totalValue: '120000.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }], minimum: '10000.00', maximum: '12000.00', arithmeticMean: '11000.00' }] },
} satisfies ProcessDetail;

describe('borrador Word del estudio de mercado', () => {
  it('genera un archivo DOCX real a partir de los datos estructurados del expediente', async () => {
    const document = await createMarketStudyDocx(process);
    expect(document.subarray(0, 2).toString()).toBe('PK');
    expect(document.length).toBeGreaterThan(5000);
  });
});
