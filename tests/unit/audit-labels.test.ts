import { describe, expect, it } from 'vitest';
import { etiquetaAccion } from '../../src/modules/admin/audit-labels';

describe('etiquetas del Registro de actuaciones', () => {
  it.each<[string, string]>([
    ['ABOGADO_ASIGNADO', 'Abogado asignado'],
    ['EXPEDIENTE_ABIERTO_DESDE_COTIZACIONES', 'Proceso creado desde cotizaciones'],
    ['ACCESS_CREATED', 'Acceso creado por invitación'],
    ['EMAIL_CORRECTED', 'Correo corregido por Administración'],
    ['INSTITUCION_CREADA', 'Institución registrada'],
    ['INSTITUCION_SERVICIO_REACTIVADO', 'Servicio reactivado'],
    ['ATTORNEY_ASSIGNED', 'Abogado asignado'],
    ['INSTITUTION_SERVICE_ENDED', 'Servicio finalizado'],
  ])('%s → %s', (accion, etiqueta) => {
    expect(etiquetaAccion(accion)).toBe(etiqueta);
  });

  it('una acción desconocida se muestra tal cual, también si coincide con una propiedad del prototipo', () => {
    expect(etiquetaAccion('ACCION_NUEVA')).toBe('ACCION_NUEVA');
    expect(etiquetaAccion('constructor')).toBe('constructor');
  });
});
