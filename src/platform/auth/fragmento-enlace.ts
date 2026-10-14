export type FragmentoEnlace =
  | { tipo: 'sesion'; accessToken: string; refreshToken: string }
  | { tipo: 'error'; codigo: string }
  | { tipo: 'invalido' }
  | { tipo: 'ninguno' };

/**
 * Lee el fragmento (#...) con el que Supabase redirige desde un enlace de correo emitido por el servidor
 * (invitaciones, reenvíos y recuperaciones del Administrador): lleva los tokens de la sesión en lugar de un `code` PKCE.
 * El cliente de navegador de @supabase/ssr trabaja en modo PKCE y rechaza esos tokens sin avisar; si ya hay otra sesión
 * en el navegador, getSession() devuelve esa sesión ajena. Por eso la página de confirmación los lee y adopta de forma explícita.
 */
export function leerFragmentoEnlace(fragmento: string): FragmentoEnlace {
  const parametros = new URLSearchParams(fragmento.startsWith('#') ? fragmento.slice(1) : fragmento);
  const error = parametros.get('error');
  if (error) return { tipo: 'error', codigo: parametros.get('error_code') ?? error };
  const accessToken = parametros.get('access_token');
  const refreshToken = parametros.get('refresh_token');
  if (accessToken === null && refreshToken === null) return { tipo: 'ninguno' };
  if (!accessToken || !refreshToken) return { tipo: 'invalido' };
  return { tipo: 'sesion', accessToken, refreshToken };
}
