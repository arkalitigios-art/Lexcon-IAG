import { describe, expect, it } from 'vitest';
import { createMarketStudyBudget } from '../../src/modules/automation/market-study-financials';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';

function processWithTreatments(treatments: string[]): ProcessDetail {
  return {
    id: 'process-financials', phase: 'MARKET', status: 'RECEIVED', createdAt: '2026-09-30T12:00:00.000Z', institutionName: 'IE de prueba', institutionCity: 'Bogotá', attorneyName: null, responsibleName: 'Rectoría', blockReason: null,
    quotations: [], quotationTotals: [], approvalDelivery: null, documents: [], actions: [], drafts: [],
    marketStudy: {
      regulationName: 'Manual de prueba', regulationVersion: 1, profile: { objectDescription: '', unspscCodes: '', demandAnalysis: '', supplyAnalysis: '', taxBasis: '' },
      comparisons: [{
        description: 'Resma de prueba', quantity: '10', minimum: '10000.00', maximum: '12000.00', arithmeticMean: '11000.00',
        values: treatments.map((taxTreatment, index) => ({ source: `oferta-${index}.pdf`, unitValue: index ? '12000.00' : '10000.00', totalValue: index ? '142800.00' : '119000.00', taxRate: '19%', taxTreatment })),
      }],
    },
  };
}

describe('presupuesto del estudio de mercado', () => {
  it('separa la base, el IVA y el total cuando la evidencia acredita una misma tarifa incluida', () => {
    expect(createMarketStudyBudget(processWithTreatments(['INCLUDED_IN_REPORTED_TOTAL', 'INCLUDED_IN_REPORTED_TOTAL']))).toMatchObject({ baseEstimate: 110000, taxEstimate: 20900, totalEstimate: 130900 });
  });

  it('no infiere IVA cuando alguna fuente lo reporta excluido', () => {
    expect(createMarketStudyBudget(processWithTreatments(['INCLUDED_IN_REPORTED_TOTAL', 'EXCLUDED_FROM_REPORTED_TOTAL']))).toMatchObject({ baseEstimate: 110000, taxEstimate: null, totalEstimate: null });
  });
});
