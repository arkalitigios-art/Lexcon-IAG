import { describe, expect, it } from 'vitest';
import { evaluarRespuestaSesion } from '../../src/platform/auth/sesion-cambiada';

describe('evaluación de la respuesta de /api/auth/session', () => {
  it('no hace nada mientras la sesión siga siendo la de la pantalla', () => {
    expect(evaluarRespuestaSesion('u-1', 200, { activa: true, id: 'u-1' })).toBe('seguir');
  });

  it('detecta que otra persona inició sesión en este navegador', () => {
    expect(evaluarRespuestaSesion('u-1', 200, { activa: true, id: 'u-2' })).toBe('sesion-cambiada');
  });

  it('lleva al inicio de sesión solo si el servidor dice que la sesión ya no existe', () => {
    expect(evaluarRespuestaSesion('u-1', 401, { activa: false })).toBe('sesion-cerrada');
  });

  it('ignora las fallas pasajeras y las respuestas incompletas', () => {
    expect(evaluarRespuestaSesion('u-1', 503, { activa: false })).toBe('seguir');
    expect(evaluarRespuestaSesion('u-1', 500, null)).toBe('seguir');
    expect(evaluarRespuestaSesion('u-1', 200, null)).toBe('seguir');
    expect(evaluarRespuestaSesion('u-1', 200, { activa: true })).toBe('seguir');
  });
});
