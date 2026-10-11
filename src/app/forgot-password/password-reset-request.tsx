'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { crearClienteSupabaseNavegador } from '@/platform/supabase/browser';

export function PasswordResetRequest() {
  const [sent, setSent] = useState(false); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const retorno = new URL('/auth/confirm', window.location.origin);
      retorno.searchParams.set('next', '/auth/update-password');
      await crearClienteSupabaseNavegador().auth.resetPasswordForEmail(email.trim(), { redirectTo: retorno.toString() });
    } finally {
      // La respuesta no revela si el correo corresponde a una cuenta activa.
      setBusy(false);
      setSent(true);
    }
  }
  return <main className="access access-v2"><section className="access-frame"><section className="access-hero"><p className="eyebrow">Acceso privado</p><h1>Recupere<br />su acceso.</h1><p>Le enviaremos un enlace seguro para crear una nueva contraseña.</p></section><section className="login-card"><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">⌁</span><div><h2>Olvidé mi contraseña</h2><p>Ingrese el correo asociado a su cuenta.</p></div></div>{sent ? <p className="form-message" role="status">Si existe una cuenta activa para este correo, recibirá un enlace para restablecer su contraseña.</p> : <form className="login-form" onSubmit={submit}><label className="field-label" htmlFor="email">Correo electrónico<input required id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button></form>}<Link className="text-button" href="/login">Volver a iniciar sesión</Link></section></section></main>;
}
