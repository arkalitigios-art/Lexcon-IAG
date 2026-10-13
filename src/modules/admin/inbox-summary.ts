export interface ProcesoParaResumen { institutionId?: string | null; institutionName: string; attorneyName: string | null; status: string }

export interface ResumenBandeja {
  total: number;
  instituciones: number;
  sinResponsable: number;
  conResponsable: number;
  bloqueados: number;
  porInstitucion: Array<{ nombre: string; total: number }>;
}

export function esBloqueado(status: string): boolean { return status.startsWith('BLOCKED_'); }

/** Resume los procesos visibles para administración, sin depender del motor de persistencia. Agrupa por identificador de institución; si no viene, por nombre. */
export function resumirBandeja(procesos: readonly ProcesoParaResumen[]): ResumenBandeja {
  const porInstitucion = new Map<string, { nombre: string; total: number }>();
  let sinResponsable = 0;
  let bloqueados = 0;
  for (const proceso of procesos) {
    const clave = proceso.institutionId ?? proceso.institutionName;
    const grupo = porInstitucion.get(clave) ?? { nombre: proceso.institutionName, total: 0 };
    grupo.total += 1;
    porInstitucion.set(clave, grupo);
    if (!proceso.attorneyName) sinResponsable += 1;
    if (esBloqueado(proceso.status)) bloqueados += 1;
  }
  return {
    total: procesos.length,
    instituciones: porInstitucion.size,
    sinResponsable,
    conResponsable: procesos.length - sinResponsable,
    bloqueados,
    porInstitucion: [...porInstitucion.values()]
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')),
  };
}
