import { describe, expect, it } from 'vitest';
import { destinoAutenticacionSeguro } from '../../src/platform/auth/destino-autenticacion';

describe('destino de confirmación de acceso', () => {
  it('acepta rutas internas y conserva sus parámetros', () => {
    expect(destinoAutenticacionSeguro('/auth/update-password?modo=recuperacion')).toBe('/auth/update-password?modo=recuperacion');
  });

  it('rechaza destinos externos o ambiguos', () => {
    expect(destinoAutenticacionSeguro('https://sitio-ajeno.test')).toBe('/dashboard');
    expect(destinoAutenticacionSeguro('//sitio-ajeno.test')).toBe('/dashboard');
    expect(destinoAutenticacionSeguro('/\\sitio-ajeno.test')).toBe('/dashboard');
  });
});
