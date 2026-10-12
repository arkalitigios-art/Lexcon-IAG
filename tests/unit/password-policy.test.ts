import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, validarContrasena } from '../../src/platform/auth/password-policy';

describe('política de contraseñas web', () => {
  it('exige al menos 8 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(() => validarContrasena('1234567')).toThrow('al menos 8 caracteres');
    expect(validarContrasena('12345678')).toBe('12345678');
  });

  it('rechaza valores que no son texto', () => {
    expect(() => validarContrasena(undefined)).toThrow('al menos 8 caracteres');
    expect(() => validarContrasena(12345678)).toThrow('al menos 8 caracteres');
    expect(() => validarContrasena(null)).toThrow('al menos 8 caracteres');
    expect(() => validarContrasena('')).toThrow('al menos 8 caracteres');
  });

  it('rechaza contraseñas excesivamente largas', () => {
    expect(() => validarContrasena('a'.repeat(129))).toThrow('no puede superar 128');
    expect(validarContrasena('a'.repeat(128))).toHaveLength(128);
  });
});
