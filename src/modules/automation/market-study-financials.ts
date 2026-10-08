import type { ProcessDetail } from '@/modules/processes/process-queries';

export function taxTreatmentLabel(treatment: string): string {
  if (treatment === 'INCLUDED_IN_REPORTED_TOTAL') return 'incluido en el total reportado';
  if (treatment === 'EXCLUDED_FROM_REPORTED_TOTAL') return 'no incluido en el total reportado';
  if (treatment === 'EXEMPT') return 'exento según la fuente';
  return 'tratamiento no verificable';
}

function taxRate(tax: string | null): number | null {
  const match = tax?.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value / 100 : null;
}

export type MarketStudyBudget = {
  baseEstimate: number;
  taxEstimate: number | null;
  totalEstimate: number | null;
  taxNote: string;
};

/**
 * Computes the tax only when all comparable sources for every item disclose
 * the same numeric VAT rate and confirm that the reported total includes it.
 * Any excluded, exempt, missing, or inconsistent treatment keeps the study at
 * the documented base value instead of inferring a fiscal condition.
 */
export function createMarketStudyBudget(process: ProcessDetail): MarketStudyBudget {
  let baseEstimate = 0;
  let taxEstimate = 0;
  let canEstimateTax = true;

  for (const comparison of process.marketStudy.comparisons) {
    const unitValue = Number(comparison.arithmeticMean);
    const quantity = Number(comparison.quantity);
    if (!Number.isFinite(unitValue) || !Number.isFinite(quantity)) continue;
    const base = Math.round(unitValue * quantity);
    baseEstimate += base;
    const rates = [...new Set(comparison.values.map((value) => taxRate(value.taxRate)))];
    const treatments = [...new Set(comparison.values.map((value) => value.taxTreatment))];
    if (rates.length !== 1 || rates[0] === null || treatments.length !== 1 || treatments[0] !== 'INCLUDED_IN_REPORTED_TOTAL') {
      canEstimateTax = false;
      continue;
    }
    taxEstimate += Math.round(base * rates[0]);
  }

  return canEstimateTax
    ? { baseEstimate, taxEstimate, totalEstimate: baseEstimate + taxEstimate, taxNote: 'El IVA se estimó únicamente con las tarifas y los tratamientos informados en las filas de la matriz comparativa. En todos los grupos comparables, las fuentes confirman que sus totales reportados incluyen IVA.' }
    : { baseEstimate, taxEstimate: null, totalEstimate: null, taxNote: 'El IVA no se calcula en el presupuesto porque al menos un ítem comparable no permite verificar una tarifa y tratamiento homogéneos en todas las fuentes.' };
}
