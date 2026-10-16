import { createInstitution, getManagedInstitution, listManagedInstitutions, updateInstitution, type ManagedInstitution } from '@/modules/admin/service-administration';
import type { DatosInstitucion, InstitucionAdministrada, PuertoInstituciones } from './institution-service';

function mapear(fila: ManagedInstitution): InstitucionAdministrada {
  return {
    id: fila.id,
    nombre: fila.name,
    ciudad: fila.city,
    departamento: null,
    nit: null,
    codigoDane: null,
    estado: fila.serviceStatus,
    observacion: fila.serviceNote,
    activa: Boolean(fila.active),
    creadaEn: fila.createdAt,
    cuentasActivas: Number(fila.users),
    procesos: Number(fila.processes),
  };
}

function entradaLocal(datos: DatosInstitucion) {
  return { name: datos.nombre, city: datos.ciudad, serviceStatus: datos.estado, serviceNote: datos.observacion ?? undefined };
}

/** Demostración local: usa la administración SQLite existente; no guarda departamento, NIT ni código DANE. */
export function crearPuertoInstitucionesLocal(): PuertoInstituciones {
  return {
    async listar() {
      return listManagedInstitutions().map(mapear);
    },
    async obtener(id) {
      const fila = getManagedInstitution(id);
      return fila ? mapear(fila) : null;
    },
    async guardar(id, datos, actor) {
      if (id === null) return createInstitution(actor, entradaLocal(datos));
      updateInstitution(actor, { id, ...entradaLocal(datos) });
      return id;
    },
  };
}
