import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { rutaNoDisponible } from '../../src/platform/features-http';

describe('rutaNoDisponible', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('con Supabase responde 501 sin caché y con el mensaje uniforme', async () => {
    mocks.configurado.mockReturnValue(true);
    const respuesta = rutaNoDisponible('REGLAMENTOS');
    expect(respuesta?.status).toBe(501);
    expect(respuesta?.headers.get('cache-control')).toBe('no-store');
    expect(await respuesta?.json()).toEqual({ error: 'Esta función estará disponible próximamente.' });
  });

  it('en modo local no interviene', () => {
    mocks.configurado.mockReturnValue(false);
    expect(rutaNoDisponible('REGLAMENTOS')).toBeNull();
  });
});
