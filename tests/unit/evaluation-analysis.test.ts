import { describe, expect, it } from 'vitest';
import { evaluateOffers, lowestPricedEligible, type EvaluationOffer } from '../../src/modules/automation/evaluation-analysis';

const budget = { baseEstimate: 100_000, taxEstimate: 19_000, totalEstimate: 119_000, taxNote: '' };
const expected = [{ description: 'Resma de papel bond tamaño carta', quantity: '10' }];

function offer(overrides: Partial<EvaluationOffer> = {}): EvaluationOffer {
  return {
    supplier: 'Proveedor de prueba', total: 95_200, subtotal: 80_000, ivaTotal: 15_200, hasMissingAnnexes: false,
    legalDocuments: ['Carta de presentación', 'Identificación', 'Existencia o registro mercantil', 'RUT', 'Seguridad social', 'Inhabilidades', 'Transparencia'],
    items: [{ number: '1', description: 'Resma de papel bond tamano carta UNSPSC 14111500', quantity: '10', unit: '$ 8.000', tax: '19 % — $ 15.200', total: '$ 95.200' }],
    ...overrides,
  };
}

describe('evaluación automática de ofertas', () => {
  it('identifica la oferta habilitada de menor precio cuando cumple requisitos jurídicos, técnicos y financieros', () => {
    const lower = offer({ supplier: 'Oferta menor', total: 89_250, subtotal: 75_000, ivaTotal: 14_250 });
    const evaluations = evaluateOffers([offer(), lower], expected, budget, false);
    expect(evaluations.map((evaluation) => evaluation.eligible)).toEqual([true, true]);
    expect(lowestPricedEligible(evaluations)?.offer.supplier).toBe('Oferta menor');
  });

  it('descarta una oferta cuando el archivo declara que no adjuntó soportes jurídicos exigidos', () => {
    const evaluations = evaluateOffers([offer({ hasMissingAnnexes: true })], expected, budget, false);
    expect(evaluations[0].legalPass).toBe(false);
    expect(evaluations[0].eligible).toBe(false);
    expect(evaluations[0].legal.find((row) => row.requirement === 'RUT')?.result).toBe('NO CUMPLE');
    expect(lowestPricedEligible(evaluations)).toBeNull();
  });

  it('deja pendiente para el comité un soporte que no logra localizar, sin convertir esa limitación de lectura en un incumplimiento', () => {
    const evaluations = evaluateOffers([offer({ legalDocuments: ['Carta de presentación', 'Identificación', 'Existencia o registro mercantil', 'RUT', 'Seguridad social', 'Inhabilidades'] })], expected, budget, false);
    expect(evaluations[0].legal.find((row) => row.requirement === 'Transparencia')?.result).toBe('PENDIENTE DE VERIFICACIÓN');
    expect(evaluations[0].pendingVerification).toBe(true);
    expect(evaluations[0].eligible).toBe(true);
  });
});
