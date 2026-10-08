import type { ProcessSummary } from './process-queries';

export type InstitutionProcessGroup = {
  id: string;
  name: string;
  processes: ProcessSummary[];
};

/**
 * Organiza las asignaciones jurídicas por IE para la navegación. La agrupación
 * no concede acceso: la consulta de origen ya contiene únicamente procesos
 * asignados a la abogada autenticada.
 */
export function groupProcessesByInstitution(processes: ProcessSummary[]): InstitutionProcessGroup[] {
  const groups = processes.reduce((institutions, process) => {
    const id = process.institutionId ?? process.institutionName;
    const institution = institutions.get(id) ?? { id, name: process.institutionName, processes: [] };
    institution.processes.push(process);
    institutions.set(id, institution);
    return institutions;
  }, new Map<string, InstitutionProcessGroup>());

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'es-CO'));
}

/** @deprecated Use groupProcessesByInstitution outside of the legal workspace. */
export const groupAttorneyInstitutions = groupProcessesByInstitution;
