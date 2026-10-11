'use client';

import { FormEvent, useState } from 'react';
import { crearClienteSupabaseNavegador } from '@/platform/supabase/browser';

export function ActivationRequest() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const retorno = new URL('/auth/confirm', window.location.origin);
      retorno.searchParams.set('next', '/auth/update-password?modo=activacion');
      retorno.searchParams.set('flujo', 'activacion');
      const { error: errorEnvio } = await crearClienteSupabaseNavegador().auth.resetPasswordForEmail(email.trim(), { redirectTo: retorno.toString() });
      if (errorEnvio) throw errorEnvio;
      // No revela si el correo fue autorizado para acceder a LEXCON.
      setSent(true);
    } catch {
      setError('No fue posible solicitar el enlace en este momento. Espere un minuto y vuelva a intentarlo.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="access access-v2"><section className="access-frame"><section className="access-hero"><p className="eyebrow">Acceso privado</p><h1>Cree su<br />contraseña inicial.</h1><p>Use su propio correo electrónico para activar el acceso a LEXCON por primera vez.</p></section><section className="login-card"><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>Active su cuenta</h2><p>Ingrese su correo electrónico para crear su contraseña inicial.</p></div></div>{sent ? <section className="form-message" role="status"><p>Si este correo tiene un acceso autorizado, recibirá un enlace para crear la contraseña.</p><p>Abra el correo más reciente desde este mismo navegador. El enlace mostrará la pantalla para definir y confirmar su contraseña.</p></section> : <form className="login-form" onSubmit={submit}><label className="field-label" htmlFor="email">Correo electrónico<input required id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="form-message" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace para crear contraseña'}</button></form>}</section></section></main>;
}
