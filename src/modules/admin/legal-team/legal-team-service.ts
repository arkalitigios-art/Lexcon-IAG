import type { CurrentUser } from '@/platform/auth/current-user';
import { hasCapability } from '@/modules/access/authorization';

export interface AbogadoEquipo { id: string; nombre: string; correo: string; procesosAsignados: number }

export interface PuertoEquipoJuridico {
  /** Abogados con rol y perfil activos, con el número de procesos que tienen asignados. */
  listarAbogadosActivos(): Promise<AbogadoEquipo[]>;
}

/** Vista de solo lectura: invitar, corregir el correo o desactivar se hace en Usuarios y accesos. */
export async function listarEquipoJuridico(puerto: PuertoEquipoJuridico, actor: CurrentUser): Promise<AbogadoEquipo[]> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new Error('No tienes autorización para consultar el equipo jurídico.');
  }
  const abogados = await puerto.listarAbogadosActivos();
  return [...abogados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
