import { formatInstitutionProcessConsecutive } from './process-consecutive';
import type { ProcessSummary } from './process-queries';

export function processConsecutive(process: Pick<ProcessSummary, 'institutionSequence' | 'createdAt'>): string {
  return formatInstitutionProcessConsecutive(process.institutionSequence, process.createdAt);
}

export function processContractType(objectDescription: string | null | undefined): string {
  const object = objectDescription?.toLocaleLowerCase('es-CO').trim() ?? '';
  if (!object) return 'Tipo contractual por definir';
  if (/(mantenimiento|reparaci[oó]n|adecuaci[oó]n)/.test(object)) return 'Contrato de mantenimiento';
  if (/(servicio|prestaci[oó]n|consultor[ií]a|capacitaci[oó]n|asesor[ií]a|vigilancia|aseo)/.test(object)) return 'Contrato de prestación de servicios';
  return 'Contrato de suministro';
}
