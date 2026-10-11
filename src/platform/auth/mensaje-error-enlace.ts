interface ErrorDeAutenticacion {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

export function mensajeErrorSolicitudEnlace(error: unknown): string {
  const detalle = (error && typeof error === 'object' ? error : {}) as ErrorDeAutenticacion;
  const codigo = typeof detalle.code === 'string' ? detalle.code.toLowerCase() : '';
  const mensaje = typeof detalle.message === 'string' ? detalle.message.toLowerCase() : '';
  const estado = typeof detalle.status === 'number' ? detalle.status : 0;

  if (estado === 429 || codigo.includes('rate') || mensaje.includes('rate limit')) {
    return 'Se alcanzó el límite temporal de correos. Espere cinco minutos y solicite un solo enlace nuevo.';
  }
  if (estado === 401 || estado === 403 || codigo.includes('api key') || mensaje.includes('api key')) {
    return 'LEXCON no pudo validar la conexión con Supabase. Un administrador debe revisar la configuración de acceso.';
  }
  if (mensaje.includes('fetch') || mensaje.includes('network') || mensaje.includes('networkerror')) {
    return 'No fue posible conectarse con Supabase. Verifique su conexión a internet e inténtelo nuevamente.';
  }
  return 'Supabase no aceptó la solicitud del enlace. Espere cinco minutos e inténtelo nuevamente.';
}
