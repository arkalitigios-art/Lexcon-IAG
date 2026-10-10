'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destinoAutenticacionSeguro } from '@/platform/auth/destino-autenticacion';
import { crearClienteSupabaseNavegador } from '@/platform/supabase/browser';

export function ConfirmacionSupabase() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    async function confirmarEnlace() {
      const destino = destinoAutenticacionSeguro(new URLSearchParams(window.location.search).get('next'), '/dashboard');
      const fragmento = new URLSearchParams(window.location.hash.slice(1));
      if (fragmento.get('error')) throw new Error('El enlace de acceso venció o ya fue utilizado. Solicita uno nuevo.');

      const supabase = crearClienteSupabaseNavegador();
      const { data: { session }, error: errorSesion } = await supabase.auth.getSession();
      if (errorSesion || !session) throw new Error('El enlace de acceso venció o no es válido. Solicita uno nuevo.');

      // El fragmento contiene tokens temporales: elimínelo antes de navegar.
      window.history.replaceState(null, '', window.location.pathname);
      router.replace(destino);
      router.refresh();
    }

    confirmarEnlace().catch((causa: unknown) => {
      if (!vigente) return;
      setError(causa instanceof Error ? causa.message : 'No fue posible validar el enlace de acceso.');
    });

    return () => { vigente = false; };
  }, [router]);

  return <main className="access access-v2"><section className="access-frame"><section className="access-hero"><p className="eyebrow">Acceso protegido</p><h1>Verificando<br />su enlace.</h1><p>LEXCON está preparando de forma segura la creación de su contraseña.</p></section><section className="login-card"><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>{error ? 'Enlace no disponible' : 'Validando acceso'}</h2><p>{error ?? 'Espere un momento; será dirigido automáticamente.'}</p></div></div>{error && <a className="primary-button" href="/auth/forgot-password">Solicitar un enlace nuevo</a>}</section></section></main>;
}
