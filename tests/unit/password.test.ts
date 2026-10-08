import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/platform/auth/password';

describe('contraseñas locales', () => {
  it('almacena un hash verificable, no el secreto', async () => {
    const password = 'DemostracionLocal2026!';
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('otra-clave-invalida', hash)).resolves.toBe(false);
  });
});
