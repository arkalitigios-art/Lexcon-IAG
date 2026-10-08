import { afterEach, describe, expect, it } from 'vitest';
import { configuracionSupabase, supabaseConfigurado } from '../../src/platform/supabase/server';
import { rutaArchivoPrivado } from '../../src/platform/storage/supabase-private-storage';

const urlOriginal = process.env.LEXCON_SUPABASE_URL;
const claveOriginal = process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (urlOriginal === undefined) delete process.env.LEXCON_SUPABASE_URL; else process.env.LEXCON_SUPABASE_URL = urlOriginal;
  if (claveOriginal === undefined) delete process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY; else process.env.LEXCON_SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
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
