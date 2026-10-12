import { validarContrasena } from '@/platform/auth/password-policy';
import { enmascararCorreo } from '@/platform/security/mask-email';

export type CodigoErrorCuenta = 'DATOS_INVALIDOS' | 'CONTRASENA_INCORRECTA' | 'FALLO';

export class ErrorCuenta extends Error {
  constructor(readonly codigo: CodigoErrorCuenta, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCuenta';
  }
}

export interface SesionCuenta { idUsuario: string; correo: string }

export interface PuertoCuenta {
  verificarContrasena(correo: string, contrasena: string): Promise<boolean>;
  actualizarContrasena(nueva: string): Promise<void>;
  solicitarCambioCorreo(nuevo: string): Promise<void>;
  actualizarNombre(idUsuario: string, nombre: string): Promise<void>;
  registrarEvento(accion: 'PASSWORD_CHANGED' | 'EMAIL_CHANGE_REQUESTED', idUsuario: string, datos: Record<string, string>): Promise<void>;
}

function datos<T>(validar: () => T): T {
  try { return validar(); } catch (causa) {
    throw new ErrorCuenta('DATOS_INVALIDOS', causa instanceof Error ? causa.message : 'Los datos no son válidos.');
  }
}

async function exigirContrasenaActual(puerto: PuertoCuenta, sesion: SesionCuenta, actual: unknown): Promise<void> {
  if (typeof actual !== 'string' || !actual) throw new ErrorCuenta('DATOS_INVALIDOS', 'Escriba su contraseña actual.');
  if (!(await puerto.verificarContrasena(sesion.correo, actual))) throw new ErrorCuenta('CONTRASENA_INCORRECTA', 'La contraseña actual no es correcta.');
}

/** La auditoría no debe deshacer un cambio que ya se aplicó. */
async function auditar(puerto: PuertoCuenta, accion: 'PASSWORD_CHANGED' | 'EMAIL_CHANGE_REQUESTED', idUsuario: string, contenido: Record<string, string>): Promise<void> {
  try {
    await puerto.registrarEvento(accion, idUsuario, contenido);
  } catch {
    // Se ignora a propósito, también si el puerto lanza de forma síncrona.
  }
}

export async function cambiarContrasena(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { actual: unknown; nueva: unknown }): Promise<void> {
  const nueva = datos(() => validarContrasena(entrada.nueva));
  if (entrada.actual === nueva) throw new ErrorCuenta('DATOS_INVALIDOS', 'La contraseña nueva debe ser distinta de la actual.');
  await exigirContrasenaActual(puerto, sesion, entrada.actual);
  await puerto.actualizarContrasena(nueva);
  await auditar(puerto, 'PASSWORD_CHANGED', sesion.idUsuario, {});
}

export async function solicitarCambioCorreo(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { contrasenaActual: unknown; correoNuevo: unknown }): Promise<void> {
  const nuevo = datos(() => {
    const limpio = typeof entrada.correoNuevo === 'string' ? entrada.correoNuevo.trim().toLowerCase() : '';
    if (!limpio || limpio.length > 254 || !/^\S+@\S+\.\S+$/.test(limpio)) throw new Error('El correo nuevo no es válido.');
    if (limpio === sesion.correo.toLowerCase()) throw new Error('El correo nuevo debe ser distinto del actual.');
    return limpio;
  });
  await exigirContrasenaActual(puerto, sesion, entrada.contrasenaActual);
  await puerto.solicitarCambioCorreo(nuevo);
  await auditar(puerto, 'EMAIL_CHANGE_REQUESTED', sesion.idUsuario, { correo_anterior: enmascararCorreo(sesion.correo), correo_nuevo: enmascararCorreo(nuevo) });
}

export async function actualizarNombre(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { nombre: unknown }): Promise<void> {
  const nombre = datos(() => {
    const limpio = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
    if (!limpio || limpio.length > 160) throw new Error('El nombre no es válido.');
    return limpio;
  });
  await puerto.actualizarNombre(sesion.idUsuario, nombre);
}
