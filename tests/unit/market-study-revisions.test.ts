import { describe, expect, it } from 'vitest';
import { marketStudyRevisionDirectives } from '../../src/modules/automation/market-study-revisions';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';

function processWithCorrection(note: string): ProcessDetail {
  return {
    id: 'revision-process', phase: 'MARKET', status: 'RECEIVED', createdAt: '2026-09-30T12:00:00.000Z', institutionName: 'IE de prueba', institutionCity: 'Bogotá', attorneyName: 'Abogado', responsibleName: 'Rectoría', blockReason: null,
    quotations: [], quotationTotals: [], approvalDelivery: null, documents: [], drafts: [],
    actions: [{ phase: 'MARKET', action: 'MARKET_STUDY_CORRECTIONS_REQUESTED', actorName: 'Abogado', note, createdAt: '2026-09-30T12:00:00.000Z' }],
    marketStudy: { regulationName: null, regulationVersion: null, profile: { objectDescription: '', unspscCodes: '', demandAnalysis: '', supplyAnalysis: '', taxBasis: '' }, comparisons: [] },
  };
}

describe('directivas de presentación de ajustes jurídicos', () => {
  it('convierte una instrucción inequívoca sobre cotizaciones en una tabla de fuentes', () => {
    expect(marketStudyRevisionDirectives(processWithCorrection('Organizar en una tabla el listado de las cotizaciones comparadas.')).sourcesAsTable).toBe(true);
  });

  it('no transforma instrucciones que no definen una presentación verificable', () => {
    expect(marketStudyRevisionDirectives(processWithCorrection('Revisar nuevamente la conveniencia del proceso.')).sourcesAsTable).toBe(false);
  });
});
