export type ResultadoSesion = 'seguir' | 'sesion-cerrada' | 'sesion-cambiada';

/**
 * Decide qué hace una pantalla abierta con la respuesta de /api/auth/session.
 * Las pestañas de un mismo navegador comparten la cookie de sesión: si otra persona inicia sesión en una de ellas,
 * las demás seguirían mostrando a la persona anterior pero actuarían con la identidad de la nueva.
 * Solo una respuesta 401 cuenta como sesión cerrada; las fallas pasajeras o incompletas se ignoran.
 */
export function evaluarRespuestaSesion(idPantalla: string, estado: number, cuerpo: { activa?: boolean; id?: string } | null): ResultadoSesion {
  if (estado === 401) return 'sesion-cerrada';
  if (estado !== 200 || !cuerpo || cuerpo.activa !== true || typeof cuerpo.id !== 'string') return 'seguir';
  return cuerpo.id === idPantalla ? 'seguir' : 'sesion-cambiada';
}
