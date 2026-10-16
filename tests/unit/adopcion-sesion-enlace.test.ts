import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Verifica con la librería real que setSession adopta los tokens de un enlace del servidor aunque el cliente use PKCE
// (como createBrowserClient de @supabase/ssr) y aunque ya exista la sesión de otra persona en el almacenamiento.

function codificar(objeto: object): string {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url');
}

// La expiración se fija una sola vez: si cada llamada la recalculara, el token que se compara en el servidor simulado
// podría diferir en un segundo del que se envió y la prueba fallaría de forma intermitente.
const EXPIRA = Math.floor(Date.now() / 1000) + 3600;

function token(idUsuario: string): string {
  const exp = EXPIRA;
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: idUsuario, aud: 'authenticated', role: 'authenticated', exp, session_id: `ses-${idUsuario}` })}.${Buffer.from('firma-de-ejemplo-1234').toString('base64url')}`;
}

function usuario(id: string) {
  return { id, aud: 'authenticated', role: 'authenticated', email: `${id}@ejemplo.invalid`, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
}

function almacenamiento(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => { datos.set(clave, valor); },
    removeItem: (clave: string) => { datos.delete(clave); },
  };
}

function clienteConServidorSimulado(storage: ReturnType<typeof almacenamiento>) {
  const servidor: typeof fetch = async (entrada, opciones) => {
    const url = String(entrada);
    const autorizacion = new Headers(opciones?.headers).get('authorization') ?? '';
    if (url.includes('/auth/v1/user')) {
      const id = autorizacion.includes(token('abogado-1')) ? 'abogado-1' : 'admin-1';
      return new Response(JSON.stringify(usuario(id)), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  };
  return createClient('https://ejemplo.supabase.co', 'sb_publishable_ejemplo', {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storage, storageKey: 'sb-ejemplo-auth-token' },
    global: { fetch: servidor },
  });
}

describe('adopción de la sesión de un enlace del servidor', () => {
  it('con el cliente en modo PKCE adopta la sesión de la persona del enlace', async () => {
    const supabase = clienteConServidorSimulado(almacenamiento());
    const { data, error } = await supabase.auth.setSession({ access_token: token('abogado-1'), refresh_token: 'refresco-abogado' });
    expect(error).toBeNull();
    expect(data.session?.user.id).toBe('abogado-1');
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe('abogado-1');
  });

  it('reemplaza una sesión ajena que ya estuviera guardada en el navegador', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sesionAdmin = JSON.stringify({ access_token: token('admin-1'), refresh_token: 'refresco-admin', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: usuario('admin-1') });
    const storage = almacenamiento({ 'sb-ejemplo-auth-token': sesionAdmin });
    const supabase = clienteConServidorSimulado(storage);
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe('admin-1');

    const { data, error } = await supabase.auth.setSession({ access_token: token('abogado-1'), refresh_token: 'refresco-abogado' });
    expect(error).toBeNull();
    expect(data.session?.user.id).toBe('abogado-1');
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe('abogado-1');
  });
});
