export interface ProcesoParaResumen { institutionName: string; attorneyName: string | null; status: string }

export interface ResumenBandeja {
  total: number;
  instituciones: number;
  sinResponsable: number;
  conResponsable: number;
  bloqueados: number;
  porInstitucion: Array<{ nombre: string; total: number }>;
}

export function esBloqueado(status: string): boolean { return status.startsWith('BLOCKED_'); }

/** Resume los procesos visibles para administración, sin depender del motor de persistencia. */
export function resumirBandeja(procesos: readonly ProcesoParaResumen[]): ResumenBandeja {
  const porNombre = new Map<string, number>();
  let sinResponsable = 0;
  let bloqueados = 0;
  for (const proceso of procesos) {
    porNombre.set(proceso.institutionName, (porNombre.get(proceso.institutionName) ?? 0) + 1);
    if (!proceso.attorneyName) sinResponsable += 1;
    if (esBloqueado(proceso.status)) bloqueados += 1;
  }
  return {
    total: procesos.length,
    instituciones: porNombre.size,
    sinResponsable,
    conResponsable: procesos.length - sinResponsable,
    bloqueados,
    porInstitucion: [...porNombre.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')),
  };
}
