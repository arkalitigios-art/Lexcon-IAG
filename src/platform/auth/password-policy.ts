export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Política de contraseñas de los flujos web con Supabase (activación, recuperación, /setup y Mi cuenta).
 * El modo local de demostración (SQLite) conserva a propósito su propio mínimo de 12 caracteres en password.ts.
 */
export function validarContrasena(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`);
  }
  return password;
}
