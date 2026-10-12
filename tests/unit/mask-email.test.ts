import { describe, expect, it } from 'vitest';
import { enmascararCorreo } from '../../src/platform/security/mask-email';

describe('enmascarado de correos', () => {
  it('conserva la primera letra y el dominio', () => {
    expect(enmascararCorreo('persona@dominio.com')).toBe('p******@dominio.com');
  });

  it('usa al menos tres asteriscos en usuarios cortos', () => {
    expect(enmascararCorreo('ab@x.co')).toBe('a***@x.co');
  });

  it('no revela nada si el valor no parece un correo', () => {
    expect(enmascararCorreo('sin-arroba')).toBe('***');
  });
});
