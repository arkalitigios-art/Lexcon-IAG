import { describe, expect, it } from 'vitest';
import { mensajeErrorSolicitudEnlace } from '../../src/platform/auth/mensaje-error-enlace';

describe('mensaje de fallo al solicitar enlaces de autenticación', () => {
  it('explica un límite temporal de envío', () => {
    expect(mensajeErrorSolicitudEnlace({ status: 429, code: 'over_email_send_rate_limit' })).toContain('límite temporal');
  });

  it('explica una falla de conexión sin mostrar datos internos', () => {
    expect(mensajeErrorSolicitudEnlace(new Error('Failed to fetch'))).toContain('conectarse con Supabase');
  });

  it('explica una clave inválida sin exponer valores', () => {
    expect(mensajeErrorSolicitudEnlace({ status: 401, message: 'Invalid API key' })).toContain('configuración de acceso');
  });
});
