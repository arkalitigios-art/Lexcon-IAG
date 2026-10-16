/** Acciones de eventos_auditoria (Supabase, nomenclatura mixta heredada) y de audit_events (demostración local). */
const ETIQUETAS: Readonly<Record<string, string>> = {
  EXPEDIENTE_ABIERTO_DESDE_COTIZACIONES: 'Proceso creado desde cotizaciones',
  ABOGADO_ASIGNADO: 'Abogado asignado',
  ACCESS_CREATED: 'Acceso creado por invitación',
  ACCESS_ACTIVATED: 'Acceso activado',
  ACCESS_DEACTIVATED: 'Acceso desactivado',
  ADMIN_RECOVERED: 'Acceso de Administrador recuperado',
  EMAIL_CORRECTED: 'Correo corregido por Administración',
  EMAIL_CHANGE_REQUESTED: 'Cambio de correo solicitado',
  PASSWORD_CHANGED: 'Contraseña cambiada',
  INSTITUCION_CREADA: 'Institución registrada',
  INSTITUCION_ACTUALIZADA: 'Institución actualizada',
  INSTITUCION_SERVICIO_SUSPENDIDO: 'Servicio suspendido por mora',
  INSTITUCION_SERVICIO_FINALIZADO: 'Servicio finalizado',
  INSTITUCION_SERVICIO_REACTIVADO: 'Servicio reactivado',
  PROCESS_OPENED_FROM_QUOTES: 'Proceso creado desde cotizaciones',
  ATTORNEY_ASSIGNED: 'Abogado asignado',
  INSTITUTION_CREATED: 'Institución registrada',
  INSTITUTION_UPDATED: 'Institución actualizada',
  INSTITUTION_SERVICE_SUSPENDED: 'Servicio suspendido por mora',
  INSTITUTION_SERVICE_ENDED: 'Servicio finalizado',
  ATTORNEY_CREATED: 'Abogado registrado',
  ATTORNEY_UPDATED: 'Abogado actualizado',
  ATTORNEY_DEACTIVATED: 'Abogado desactivado',
  EVALUATION_TEAM_UPDATED: 'Comité evaluador actualizado',
  MARKET_STUDY_PROFILE_UPDATED: 'Estudio de mercado actualizado',
};

export function etiquetaAccion(accion: string): string {
  return Object.hasOwn(ETIQUETAS, accion) ? ETIQUETAS[accion] : accion;
}
