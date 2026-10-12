import { createHash, timingSafeEqual } from 'node:crypto';
import { validarContrasena } from '@/platform/auth/password-policy';
import { enmascararCorreo } from '@/platform/security/mask-email';

export const LONGITUD_MINIMA_CODIGO = 24;
export const MENSAJE_CODIGO = 'No fue posible validar el código; verifique e intente más tarde.';

export type EstadoConfiguracion = 'PRIMER_ADMINISTRADOR' | 'RECUPERACION';
export type CodigoErrorConfiguracion = 'CODIGO_INVALIDO' | 'NO_DISPONIBLE' | 'DATOS_INVALIDOS' | 'FALLO';

export class ErrorConfiguracion extends Error {
  constructor(readonly codigo: CodigoErrorConfiguracion, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConfiguracion';
  }
}

export interface AdministradorResumen { id: string; nombre: string; correo: string }

export interface PuertoConfiguracion {
  contarAdministradoresActivos(): Promise<number>;
  listarAdministradoresActivos(): Promise<AdministradorResumen[]>;
  crearUsuarioAuth(entrada: { correo: string; contrasena: string; nombre: string }): Promise<{ id: string }>;
  registrarAdministrador(entrada: { idUsuario: string; nombre: string; correo: string }): Promise<void>;
  eliminarUsuarioAuth(idUsuario: string): Promise<void>;
  actualizarCredenciales(idUsuario: string, cambios: { correo?: string; contrasena?: string }): Promise<void>;
  registrarEvento(accion: 'ADMIN_RECOVERED', idUsuario: string, datos: Record<string, string>): Promise<void>;
}

/** Devuelve el código del servidor o null si no está definido o es demasiado corto. */
export function codigoConfiguracionActivo(entorno: NodeJS.ProcessEnv = process.env): string | null {
  const valor = entorno.LEXCON_SETUP_TOKEN?.trim();
  return valor && valor.length >= LONGITUD_MINIMA_CODIGO ? valor : null;
}

/** Comparación en tiempo constante: se comparan resúmenes SHA-256 de igual longitud. */
export function codigoCoincide(esperado: string, recibido: unknown): boolean {
  if (typeof recibido !== 'string') return false;
  const a = createHash('sha256').update(esperado).digest();
  const b = createHash('sha256').update(recibido).digest();
  return timingSafeEqual(a, b);
}

export async function estadoConfiguracion(puerto: PuertoConfiguracion): Promise<EstadoConfiguracion> {
  return (await puerto.contarAdministradoresActivos()) > 0 ? 'RECUPERACION' : 'PRIMER_ADMINISTRADOR';
}

function exigirCodigo(esperado: string | null, recibido: unknown): void {
  if (!esperado) throw new ErrorConfiguracion('NO_DISPONIBLE', 'No encontrada.');
  // Al pegar el código desde Dokploy suele llegar un espacio o salto de línea sobrante.
  const limpio = typeof recibido === 'string' ? recibido.trim() : recibido;
  if (!codigoCoincide(esperado, limpio)) throw new ErrorConfiguracion('CODIGO_INVALIDO', MENSAJE_CODIGO);
}

function datos<T>(validar: () => T): T {
  try { return validar(); } catch (causa) {
    throw new ErrorConfiguracion('DATOS_INVALIDOS', causa instanceof Error ? causa.message : 'Los datos no son válidos.');
  }
}

function texto(valor: unknown, etiqueta: string, maximo: number): string {
  const limpio = typeof valor === 'string' ? valor.trim() : '';
  if (!limpio || limpio.length > maximo) throw new Error(`${etiqueta} no es válido.`);
  return limpio;
}

function correoValido(valor: unknown): string {
  const limpio = texto(valor, 'El correo', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(limpio)) throw new Error('El correo no es válido.');
  return limpio;
}

export async function crearPrimerAdministrador(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  entrada: { codigo: unknown; nombre: unknown; correo: unknown; contrasena: unknown },
): Promise<void> {
  exigirCodigo(esperado, entrada.codigo);
  const nombre = datos(() => texto(entrada.nombre, 'El nombre', 160));
  const correo = datos(() => correoValido(entrada.correo));
  const contrasena = datos(() => validarContrasena(entrada.contrasena));
  if ((await puerto.contarAdministradoresActivos()) > 0) {
    throw new ErrorConfiguracion('NO_DISPONIBLE', 'Ya existe un Administrador activo; use la recuperación.');
  }
  const { id } = await puerto.crearUsuarioAuth({ correo, contrasena, nombre });
  try {
    await puerto.registrarAdministrador({ idUsuario: id, nombre, correo });
  } catch {
    await puerto.eliminarUsuarioAuth(id).catch(() => undefined);
    throw new ErrorConfiguracion('FALLO', 'No fue posible registrar el Administrador. La cuenta fue cancelada.');
  }
}

export async function listarAdministradores(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  codigo: unknown,
): Promise<AdministradorResumen[]> {
  exigirCodigo(esperado, codigo);
  if ((await puerto.contarAdministradoresActivos()) === 0) {
    throw new ErrorConfiguracion('NO_DISPONIBLE', 'Todavía no existe un Administrador que recuperar.');
  }
  return puerto.listarAdministradoresActivos();
}

export async function recuperarAdministrador(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  entrada: { codigo: unknown; idUsuario: unknown; correo: unknown; contrasena: unknown },
): Promise<void> {
  exigirCodigo(esperado, entrada.codigo);
  const contrasena = datos(() => validarContrasena(entrada.contrasena));
  // Solo se considera "no indicado" un correo ausente o vacío; cualquier otro valor se valida.
  const sinCorreo = entrada.correo === undefined || entrada.correo === null || (typeof entrada.correo === 'string' && !entrada.correo.trim());
  const correoNuevo = sinCorreo ? null : datos(() => correoValido(entrada.correo));
  const administradores = await listarAdministradores(puerto, esperado, entrada.codigo);
  const destino = administradores.find((administrador) => administrador.id === entrada.idUsuario);
  if (!destino) throw new ErrorConfiguracion('DATOS_INVALIDOS', 'Seleccione un Administrador activo.');
  await puerto.actualizarCredenciales(destino.id, correoNuevo ? { correo: correoNuevo, contrasena } : { contrasena });
  await puerto.registrarEvento('ADMIN_RECOVERED', destino.id, {
    correo_anterior: enmascararCorreo(destino.correo),
    correo_nuevo: correoNuevo ? enmascararCorreo(correoNuevo) : enmascararCorreo(destino.correo),
  });
}
