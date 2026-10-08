import type { MarketStudyBudget } from './market-study-financials';

export type EvaluationItem = { number: string; description: string; quantity: string; unit: string; tax: string; total: string };
export type EvaluationOffer = { supplier: string; total: number | null; subtotal: number | null; ivaTotal: number | null; items: EvaluationItem[]; legalDocuments: string[]; hasMissingAnnexes: boolean };
export type ExpectedItem = { description: string; quantity: string };
export type EvaluationResult = 'CUMPLE' | 'NO CUMPLE' | 'NO APLICA' | 'PENDIENTE DE VERIFICACIÓN';
export type EvaluationRow = { requirement: string; evidence: string; result: EvaluationResult };
export type OfferEvaluation<T extends EvaluationOffer = EvaluationOffer> = { offer: T; legal: EvaluationRow[]; technical: EvaluationRow[]; financial: EvaluationRow[]; legalPass: boolean; technicalPass: boolean; financialPass: boolean; pendingVerification: boolean; eligible: boolean };

const legalRequirements = [
  'Carta de presentación',
  'Identificación',
  'Existencia o registro mercantil',
  'RUT',
  'Seguridad social',
  'Inhabilidades',
  'Transparencia',
] as const;

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/unspsc\s*\d+/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function sameItem(expected: ExpectedItem, item: EvaluationItem): boolean {
  if (Number(expected.quantity) !== Number(item.quantity)) return false;
  const expectedWords = normalized(expected.description).split(' ').filter((word) => word.length > 2);
  const offered = normalized(item.description);
  if (!expectedWords.length || !offered) return false;
  const matches = expectedWords.filter((word) => offered.includes(word)).length;
  return matches / expectedWords.length >= 0.8;
}

function legalEvaluation(offer: EvaluationOffer): EvaluationRow[] {
  return legalRequirements.map((requirement) => {
    const listed = offer.legalDocuments.includes(requirement);
    const missingSupport = offer.hasMissingAnnexes && ['Existencia o registro mercantil', 'RUT', 'Seguridad social'].includes(requirement);
    if (!listed && !offer.hasMissingAnnexes) return { requirement, evidence: 'No fue localizado automáticamente en los archivos leídos. Requiere verificación del comité y no constituye por sí solo una conclusión de incumplimiento.', result: 'PENDIENTE DE VERIFICACIÓN' };
    if (!listed) return { requirement, evidence: 'No fue localizado en los archivos de la oferta y el expediente indica que existen anexos no incluidos.', result: 'NO CUMPLE' };
    if (missingSupport) return { requirement, evidence: 'El archivo lo relaciona, pero indica que el soporte no fue incluido.', result: 'NO CUMPLE' };
    return { requirement, evidence: 'Soporte o declaración identificada en el archivo de la oferta.', result: 'CUMPLE' };
  });
}

function technicalEvaluation(offer: EvaluationOffer, expectedItems: ExpectedItem[]): EvaluationRow[] {
  if (!expectedItems.length) return [{ requirement: 'Especificaciones técnicas', evidence: 'No hay matriz de ítems aprobada en el expediente para contrastar la oferta.', result: 'NO CUMPLE' }];
  return expectedItems.map((expected, index) => {
    const offered = offer.items.find((item) => sameItem(expected, item));
    return offered
      ? { requirement: `Ítem ${index + 1}: ${expected.description}`, evidence: `Cantidad ofertada: ${offered.quantity}. Especificación identificada: ${offered.description}.`, result: 'CUMPLE' }
      : { requirement: `Ítem ${index + 1}: ${expected.description}`, evidence: `No se identificó la cantidad ${expected.quantity} y la especificación equivalente en la oferta.`, result: 'NO CUMPLE' };
  });
}

function financialEvaluation(offer: EvaluationOffer, budget: MarketStudyBudget, financialIndicatorsRequired: boolean): EvaluationRow[] {
  const rows: EvaluationRow[] = [];
  const completeValues = offer.total !== null && offer.subtotal !== null && offer.ivaTotal !== null && offer.items.length > 0;
  rows.push({ requirement: 'Oferta económica completa', evidence: completeValues ? 'Se identificaron valores unitarios, IVA, subtotal y total de la oferta.' : 'Faltan valores unitarios, IVA, subtotal o total verificables.', result: completeValues ? 'CUMPLE' : 'NO CUMPLE' });
  const consistent = completeValues && Math.abs((offer.subtotal ?? 0) + (offer.ivaTotal ?? 0) - (offer.total ?? 0)) <= 1;
  rows.push({ requirement: 'Consistencia aritmética', evidence: consistent ? 'El subtotal más el IVA coincide con el total informado.' : 'El subtotal, IVA y total informado no son consistentes.', result: consistent ? 'CUMPLE' : 'NO CUMPLE' });
  const baseWithinBudget = offer.subtotal !== null && offer.subtotal <= budget.baseEstimate;
  rows.push({ requirement: 'Presupuesto oficial de referencia', evidence: offer.subtotal === null ? 'No se identificó el subtotal para contrastarlo con el presupuesto.' : `Subtotal ofertado: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(offer.subtotal)}. Base de referencia: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(budget.baseEstimate)}.`, result: baseWithinBudget ? 'CUMPLE' : 'NO CUMPLE' });
  if (budget.totalEstimate !== null) {
    const totalWithinBudget = offer.total !== null && offer.total <= budget.totalEstimate;
    rows.push({ requirement: 'Total con IVA frente al presupuesto', evidence: offer.total === null ? 'No se identificó el total de la oferta.' : `Total ofertado: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(offer.total)}. Total de referencia: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(budget.totalEstimate)}.`, result: totalWithinBudget ? 'CUMPLE' : 'NO CUMPLE' });
  }
  rows.push({ requirement: 'Indicadores de capacidad financiera', evidence: financialIndicatorsRequired ? 'La invitación exige indicadores financieros específicos; deben estar soportados en la oferta.' : 'La invitación generada para este expediente no exige indicadores financieros adicionales.', result: financialIndicatorsRequired ? 'NO CUMPLE' : 'NO APLICA' });
  return rows;
}

export function evaluateOffers<T extends EvaluationOffer>(offers: T[], expectedItems: ExpectedItem[], budget: MarketStudyBudget, financialIndicatorsRequired: boolean): OfferEvaluation<T>[] {
  return offers.map((offer) => {
    const legal = legalEvaluation(offer); const technical = technicalEvaluation(offer, expectedItems); const financial = financialEvaluation(offer, budget, financialIndicatorsRequired);
    const legalPass = legal.every((row) => row.result !== 'NO CUMPLE');
    const technicalPass = technical.every((row) => row.result === 'CUMPLE');
    const financialPass = financial.every((row) => row.result === 'CUMPLE' || row.result === 'NO APLICA');
    const pendingVerification = [...legal, ...technical, ...financial].some((row) => row.result === 'PENDIENTE DE VERIFICACIÓN');
    return { offer, legal, technical, financial, legalPass, technicalPass, financialPass, pendingVerification, eligible: legalPass && technicalPass && financialPass };
  });
}

export function lowestPricedEligible<T extends EvaluationOffer>(evaluations: OfferEvaluation<T>[]): OfferEvaluation<T> | null {
  return evaluations.filter((evaluation) => evaluation.eligible && evaluation.offer.total !== null).sort((left, right) => (left.offer.total ?? Number.POSITIVE_INFINITY) - (right.offer.total ?? Number.POSITIVE_INFINITY))[0] ?? null;
}
