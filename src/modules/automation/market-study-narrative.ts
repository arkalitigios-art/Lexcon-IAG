import type { ProcessDetail } from '@/modules/processes/process-queries';

export type MarketStudyNarrative = {
  objectDescription: string;
  classification: string;
  demandAnalysis: string;
  supplyAnalysis: string;
  taxBasis: string;
};

export type MarketStudyClassification = { item: number; description: string; code: string; classification: string; unit: string };

function itemText(process: ProcessDetail): string {
  return process.marketStudy.comparisons.map((comparison) => comparison.description).join(' ').toLocaleLowerCase('es-CO');
}

function isOfficeSupplyProcess(process: ProcessDetail): boolean {
  return /(papel|resma|lapicero|marcador|carpeta|agenda|tóner|toner|tinta|grapa|cuaderno|cinta|papeler|útil|util|suministro)/iu.test(itemText(process));
}

export function createMarketStudyNarrative(process: ProcessDetail): MarketStudyNarrative {
  const profile = process.marketStudy.profile;
  const comparableItems = process.marketStudy.comparisons.length;
  const quotations = process.quotations.length;
  const officeSupplyProcess = isOfficeSupplyProcess(process);

  return {
    objectDescription: profile.objectDescription || (officeSupplyProcess
      ? `Suministro de papelería, útiles escolares y suministros de oficina requeridos por ${process.institutionName}, conforme a las cantidades y especificaciones identificadas en la matriz comparativa de mercado.`
      : `Suministro de los bienes descritos en la matriz comparativa de mercado para atender la necesidad identificada de ${process.institutionName}, conforme a las cantidades y especificaciones extraídas de las cotizaciones recibidas.`),
    classification: profile.unspscCodes || (officeSupplyProcess
      ? 'Clasificación preliminar: suministros de oficina y papelería (UNSPSC 44120000) y papel para imprimir y escribir (UNSPSC 14111500), según los ítems identificados. La clasificación queda disponible para ajuste institucional si el expediente requiere una categoría más específica.'
      : 'Clasificación preliminar a partir de los bienes identificados en la matriz comparativa. La evidencia disponible no permite determinar con certeza un código UNSPSC específico; el estudio conserva esta observación para que la Institución Educativa la complemente si cuenta con la clasificación aplicable.'),
    demandAnalysis: profile.demandAnalysis || `La demanda institucional se estructura a partir de ${comparableItems} grupo(s) de ítems comparables y las cantidades identificadas en las cotizaciones recibidas. El presente estudio no presupone consumos históricos ni condiciones diferentes de la evidencia incorporada al expediente.`,
    supplyAnalysis: profile.supplyAnalysis || `Se examinaron ${quotations} cotización(es) y se establecieron ${comparableItems} grupo(s) de ítems con información comparable. La oferta observada se presenta mediante valores unitarios, rango de dispersión y promedio aritmético simple, sin seleccionar proveedor ni formular recomendación de adjudicación.`,
    taxBasis: profile.taxBasis || 'La estimación se presenta con los valores unitarios extraídos de las cotizaciones. No se incorporan IVA, descuentos, transporte u otras condiciones económicas cuando no están identificados de forma estructurable en la evidencia del expediente.',
  };
}

function classifyItem(description: string, fallbackCode: string): Pick<MarketStudyClassification, 'code' | 'classification'> {
  const value = description.toLocaleLowerCase('es-CO');
  if (/(gu[ií]a|m[oó]dulo|cuadernillo|publicaci[oó]n|impresi[oó]n)/iu.test(value)) return { code: '55101520', classification: 'Publicaciones impresas' };
  if (/(papel|resma)/iu.test(value)) return { code: '14111500', classification: 'Papel para imprimir y escribir' };
  if (/(t[oó]ner|cartucho)/iu.test(value)) return { code: '44103100', classification: 'Suministros para impresoras' };
  if (/(lapicero|marcador|carpeta|grapa|cuaderno|agenda|cinta|papeler|útil|util)/iu.test(value)) return { code: '44120000', classification: 'Suministros de oficina' };
  return { code: fallbackCode || 'Pendiente de clasificación', classification: 'Bien o servicio identificado en el estudio' };
}

export function createMarketStudyClassifications(process: ProcessDetail): MarketStudyClassification[] {
  const fallbackCode = process.marketStudy.profile.unspscCodes.trim();
  return process.marketStudy.comparisons.map((comparison, index) => ({ item: index + 1, description: comparison.description, ...classifyItem(comparison.description, fallbackCode), unit: 'Unidad' }));
}
