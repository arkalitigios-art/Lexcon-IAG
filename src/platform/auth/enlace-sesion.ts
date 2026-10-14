/**
 * Persona a la que pertenece el enlace del correo que se está procesando en esta pestaña.
 * Se guarda en sessionStorage (propio de cada pestaña, a diferencia de la cookie de sesión, que
 * comparten todas las pestañas del navegador) para detectar que otra sesión la reemplazó.
 */
const CLAVE = 'lexcon.enlace.usuario';

export function recordarUsuarioEnlace(idUsuario: string): void {
  try { window.sessionStorage.setItem(CLAVE, idUsuario); } catch { /* sin almacenamiento: el servidor rechazará el cambio */ }
}

export function usuarioEnlaceRecordado(): string {
  try { return window.sessionStorage.getItem(CLAVE) ?? ''; } catch { return ''; }
}

export function olvidarUsuarioEnlace(): void {
  try { window.sessionStorage.removeItem(CLAVE); } catch { /* nada que limpiar */ }
}
