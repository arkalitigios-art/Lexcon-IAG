import type { CurrentUser } from '@/platform/auth/current-user';
import { hasCapability } from '@/modules/access/authorization';

export const estadosServicio = ['ACTIVE', 'SUSPENDED_ARREARS', 'ENDED'] as const;
export type EstadoServicio = typeof estadosServicio[number];

export type CodigoErrorInstitucion = 'NO_AUTORIZADO' | 'DATOS_INVALIDOS' | 'NO_ENCONTRADA' | 'DUPLICADA' | 'FALLO';

export class ErrorInstitucion extends Error {
  constructor(readonly codigo: CodigoErrorInstitucion, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorInstitucion';
  }
}

export interface InstitucionAdministrada {
  id: string;
  nombre: string;
  ciudad: string;
  /** null en modo local: la base SQLite de demostración no guarda departamento, NIT ni código DANE. */
  departamento: string | null;
  nit: string | null;
  codigoDane: string | null;
  estado: EstadoServicio;
  observacion: string | null;
  activa: boolean;
  creadaEn: string;
  /** Personas con asignación de rol activa en la IE. */
  cuentasActivas: number;
  procesos: number;
}

export interface DatosInstitucion {
  nombre: string;
  ciudad: string;
  departamento: string;
  nit: string | null;
  codigoDane: string | null;
  estado: EstadoServicio;
  observacion: string | null;
}

export interface EntradaInstitucion {
  nombre?: unknown;
  ciudad?: unknown;
  departamento?: unknown;
  nit?: unknown;
  codigoDane?: unknown;
  estado?: unknown;
  observacion?: unknown;
}

export interface PuertoInstituciones {
  listar(): Promise<InstitucionAdministrada[]>;
  obtener(id: string): Promise<InstitucionAdministrada | null>;
  /** Crea (id null) o actualiza la IE, su periodo de servicio y la auditoría; devuelve el identificador. */
  guardar(id: string | null, datos: DatosInstitucion, actor: CurrentUser): Promise<string>;
}

function exigirAdministrador(actor: CurrentUser): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new ErrorInstitucion('NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.');
  }
}

function invalido(mensaje: string): ErrorInstitucion {
  return new ErrorInstitucion('DATOS_INVALIDOS', mensaje);
}

function textoEntre(valor: unknown, minimo: number, maximo: number, mensaje: string): string {
  const limpio = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (limpio.length < minimo || limpio.length > maximo) throw invalido(mensaje);
  return limpio;
}

function opcional(valor: unknown, patron: RegExp, mensaje: string): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') throw invalido(mensaje);
  const limpio = valor.trim();
  if (!limpio) return null;
  if (!patron.test(limpio)) throw invalido(mensaje);
  return limpio;
}

/** Mismas reglas y mensajes que la administración local, más departamento, NIT y código DANE. */
export function validarDatosInstitucion(entrada: EntradaInstitucion): DatosInstitucion {
  const nombre = textoEntre(entrada.nombre, 3, 120, 'El nombre de la Institución Educativa debe tener entre 3 y 120 caracteres.');
  const ciudad = textoEntre(entrada.ciudad, 2, 100, 'La ciudad o municipio debe tener entre 2 y 100 caracteres.');
  const departamento = textoEntre(entrada.departamento, 2, 100, 'El departamento debe tener entre 2 y 100 caracteres.');
  // Se guarda sin puntos: 800.123.456-7 y 800123456-7 son el mismo NIT y la restricción de unicidad debe detectarlo.
  const nit = opcional(entrada.nit, /^[0-9][0-9.-]{4,19}$/, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).')?.replace(/\./g, '') ?? null;
  const codigoDane = opcional(entrada.codigoDane, /^\d{5,15}$/, 'El código DANE solo admite números (entre 5 y 15 dígitos).');
  if (typeof entrada.estado !== 'string' || !(estadosServicio as readonly string[]).includes(entrada.estado)) throw invalido('Selecciona un estado de servicio válido.');
  const observacion = typeof entrada.observacion === 'string' ? entrada.observacion.trim() : '';
  if (observacion.length > 500) throw invalido('La observación administrativa no puede superar 500 caracteres.');
  return { nombre, ciudad, departamento, nit, codigoDane, estado: entrada.estado as EstadoServicio, observacion: observacion || null };
}

export async function listarInstituciones(puerto: PuertoInstituciones, actor: CurrentUser): Promise<InstitucionAdministrada[]> {
  exigirAdministrador(actor);
  return puerto.listar();
}

export async function obtenerInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, id: unknown): Promise<InstitucionAdministrada | null> {
  exigirAdministrador(actor);
  if (typeof id !== 'string' || !id.trim()) return null;
  return puerto.obtener(id.trim());
}

export async function crearInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, entrada: EntradaInstitucion): Promise<string> {
  exigirAdministrador(actor);
  return puerto.guardar(null, validarDatosInstitucion(entrada), actor);
}

export async function actualizarInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, id: unknown, entrada: EntradaInstitucion): Promise<string> {
  exigirAdministrador(actor);
  if (typeof id !== 'string' || !id.trim()) throw invalido('Selecciona una Institución Educativa.');
  const datos = validarDatosInstitucion(entrada);
  if (!(await puerto.obtener(id.trim()))) throw new ErrorInstitucion('NO_ENCONTRADA', 'La Institución Educativa no existe.');
  return puerto.guardar(id.trim(), datos, actor);
}
