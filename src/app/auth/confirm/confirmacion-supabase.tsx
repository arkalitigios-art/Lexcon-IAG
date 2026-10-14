'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { destinoAutenticacionSeguro } from '@/platform/auth/destino-autenticacion';
import type { Session } from '@supabase/supabase-js';
import { recordarUsuarioEnlace } from '@/platform/auth/enlace-sesion';
import { leerFragmentoEnlace } from '@/platform/auth/fragmento-enlace';
import { crearClienteSupabaseNavegador } from '@/platform/supabase/browser';

export function ConfirmacionSupabase() {
  const router = useRouter();
  const [error, setError] = useState<{ mensaje: string; href: string; etiqueta: string } | null>(null);

  useEffect(() => {
    let vigente = true;

    async function confirmarEnlace() {
      const parametros = new URLSearchParams(window.location.search);
      const destino = destinoAutenticacionSeguro(parametros.get('next'), '/dashboard');
      const fragmento = leerFragmentoEnlace(window.location.hash);
      if (fragmento.tipo === 'error') throw new Error('El enlace de acceso venció o ya fue utilizado. Solicita uno nuevo.');
      if (fragmento.tipo === 'invalido') throw new Error('El enlace de acceso no es válido. Solicita uno nuevo.');

      const supabase = crearClienteSupabaseNavegador();
      let session: Session | null;
      if (fragmento.tipo === 'sesion') {
        // Enlace emitido por el servidor: el cliente en modo PKCE lo ignora y getSession() devolvería la sesión que ya hubiera
        // en el navegador (p. ej. la de un Administrador). La sesión de la persona del enlace se adopta de forma explícita.
        const { data, error } = await supabase.auth.setSession({ access_token: fragmento.accessToken, refresh_token: fragmento.refreshToken });
        if (error) throw new Error('El enlace de acceso venció o no es válido. Solicita uno nuevo.');
        session = data.session;
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new Error('El enlace de acceso venció o no es válido. Solicita uno nuevo.');
        session = data.session;
      }
      if (!session) throw new Error('El enlace de acceso venció o no es válido. Solicita uno nuevo.');

      // Quién es la persona del enlace: el formulario de contraseña lo comprueba antes de guardar.
      recordarUsuarioEnlace(session.user.id);
      // El fragmento contiene tokens temporales: elimínelo antes de navegar.
      window.history.replaceState(null, '', window.location.pathname);
      router.replace(destino);
      router.refresh();
    }

    confirmarEnlace().catch((causa: unknown) => {
      if (!vigente) return;
      const flujo = new URLSearchParams(window.location.search).get('flujo');
      if (flujo === 'correo') {
        // El cambio de correo ya pudo aplicarse aunque este navegador no abra la sesión: se ofrece iniciar sesión, no recuperar.
        setError({
          mensaje: 'No pudimos abrir su sesión desde este enlace. Si ya confirmó el cambio, inicie sesión con su correo nuevo.',
          href: '/login',
          etiqueta: 'Ir a iniciar sesión',
        });
        return;
      }
      const activacion = flujo === 'activacion';
      setError({
        mensaje: causa instanceof Error ? causa.message : 'No fue posible validar el enlace de acceso.',
        href: activacion ? '/activate-account' : '/forgot-password',
        etiqueta: activacion ? 'Solicitar un enlace de activación' : 'Solicitar un enlace de recuperación',
      });
    });

    return () => { vigente = false; };
  }, [router]);

  return <main className="access access-v2"><section className="access-frame"><section className="access-hero"><p className="eyebrow">Acceso protegido</p><h1>Verificando<br />su enlace.</h1><p>LEXCON está validando su enlace de forma segura.</p></section><section className="login-card"><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>{error ? 'Enlace no disponible' : 'Validando acceso'}</h2><p>{error?.mensaje ?? 'Espere un momento; será dirigido automáticamente.'}</p></div></div>{error && <a className="primary-button" href={error.href}>{error.etiqueta}</a>}</section></section></main>;
}
