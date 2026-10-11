'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/auth/update-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    const payload = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? 'No fue posible actualizar la contraseña.');
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return <main className="access access-v2"><section className="access-frame"><section className="access-hero"><p className="eyebrow">Acceso protegido</p><h1>Defina su<br />contraseña.</h1><p>Use una contraseña única de al menos doce caracteres.</p></section><section className="login-card"><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>Nueva contraseña</h2><p>Este enlace solo puede utilizarse de forma segura durante su vigencia.</p></div></div><form className="login-form" onSubmit={submit}><label className="field-label" htmlFor="password">Contraseña nueva<span className="password-field"><input required minLength={12} id="password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-visibility" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? 'Ocultar' : 'Mostrar'}</button></span></label><label className="field-label" htmlFor="confirm">Confirmar contraseña<span className="password-field"><input required minLength={12} id="confirm" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /><button className="password-visibility" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? 'Ocultar' : 'Mostrar'}</button></span></label>{message && <p className="form-message" role="alert">{message}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Actualizando…' : 'Guardar y continuar'}</button></form></section></section></main>;
}
