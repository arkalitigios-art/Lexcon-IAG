import { afterEach, describe, expect, it } from 'vitest';
import { configuracionSupabase, supabaseConfigurado } from '../../src/platform/supabase/server';
import { configuracionSupabasePublica, supabasePublicoConfigurado } from '../../src/platform/supabase/public';
import { rutaArchivoPrivado } from '../../src/platform/storage/supabase-private-storage';

const urlOriginal = process.env.LEXCON_SUPABASE_URL;
const claveOriginal = process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY;
const urlPublicaOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clavePublicableOriginal = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (urlOriginal === undefined) delete process.env.LEXCON_SUPABASE_URL; else process.env.LEXCON_SUPABASE_URL = urlOriginal;
  if (claveOriginal === undefined) delete process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY; else process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
  if (urlPublicaOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = urlPublicaOriginal;
  if (clavePublicableOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = clavePublicableOriginal;
});

describe('configuración pública de Supabase', () => {
  it('no se habilita hasta contar con URL y clave publicable', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(configuracionSupabasePublica()).toBeNull();
    expect(supabasePublicoConfigurado()).toBe(false);
  });

  it('rechaza una configuración pública parcial', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ejemplo.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => configuracionSupabasePublica()).toThrow('incompleta');
  });

  it('acepta URL HTTPS y clave publicable sin requerir la clave de servicio', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ejemplo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prueba';
    expect(configuracionSupabasePublica()).toEqual({ url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' });
    expect(supabasePublicoConfigurado()).toBe(true);
  });
});

describe('configuración privada de Supabase', () => {
  it('mantiene la aplicación en modo local mientras no existan credenciales', () => {
    delete process.env.LEXCON_SUPABASE_URL;
    delete process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY;
    expect(configuracionSupabase()).toBeNull();
    expect(supabaseConfigurado()).toBe(false);
  });

  it('rechaza una configuración parcial para evitar una conexión insegura', () => {
    process.env.LEXCON_SUPABASE_URL = 'https://ejemplo.supabase.co';
    delete process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY;
    expect(() => configuracionSupabase()).toThrow('incompleta');
  });

  it('construye rutas privadas, segmentadas por IE, proceso y versión', () => {
    expect(rutaArchivoPrivado({
      idInstitucion: '11111111-1111-1111-1111-111111111111',
      idProceso: '22222222-2222-2222-2222-222222222222',
      idVersionDocumento: '33333333-3333-3333-3333-333333333333',
    }, 'CDP INEM 2026.pdf')).toMatch(/^instituciones\/11111111-1111-1111-1111-111111111111\/procesos\/22222222-2222-2222-2222-222222222222\/documentos\/33333333-3333-3333-3333-333333333333\/CDP_INEM_2026\.pdf$/);
  });
});
