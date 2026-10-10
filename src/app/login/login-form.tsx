'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_CREDENTIALS } from '@/platform/auth/demo-credentials';

type SessionUser = { name: string; role: string; institutionName: string | null } | null;

export function LoginForm({ activeSession, allowDemoCredentials }: { activeSession: SessionUser; allowDemoCredentials: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showProfiles, setShowProfiles] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
    if (!response.ok) { setError('Verifica el usuario y la contraseña asignados.'); setSubmitting(false); return; }
    router.replace('/dashboard'); router.refresh();
  }

  return <main className="access access-v2"><section className="access-frame"><header className="access-topbar"><a className="access-brand" href="/login"><span className="brand-seal" aria-hidden="true">L</span><span className="brand-lockup"><span className="brand-title">LEXCON <strong>IAG</strong></span><small>Contratación FSE</small></span></a></header><section className="access-hero"><p className="eyebrow">Acceso privado</p><h1>Contratación<br />con trazabilidad.</h1><p>Ingrese con su cuenta para consultar exclusivamente las actuaciones que le corresponden dentro del proceso de contratación.</p>{allowDemoCredentials && <button type="button" className="credentials-link" aria-controls="usuarios-demo" aria-expanded={showProfiles} onClick={() => setShowProfiles((visible) => !showProfiles)}>{showProfiles ? 'Ocultar usuarios habilitados' : 'Ver usuarios habilitados'} <span aria-hidden="true">{showProfiles ? '↑' : '↓'}</span></button>}</section><section className="login-card">{activeSession && <section className="active-session" aria-label="Sesión actual"><p className="section-kicker">Sesión activa</p><strong>{activeSession.name}</strong><span>{activeSession.institutionName ?? 'Arka Litigios IAG'}</span><button type="button" className="text-button" onClick={() => router.push('/dashboard')}>Continuar en mi espacio →</button></section>}<form className="login-form" onSubmit={submit}><div className="login-card-heading"><span className="login-glyph" aria-hidden="true">⌁</span><div><h2>Iniciar sesión</h2><p>Su usuario identifica quién realiza cada actuación.</p></div></div><label className="field-label" htmlFor="email">Correo electrónico<input required id="email" value={email} onChange={(event) => setEmail(event.target.value)} name="email" type="email" autoComplete="email" placeholder="nombre@organizacion.com" /></label><label className="field-label" htmlFor="password">Contraseña<input required id="password" value={password} onChange={(event) => setPassword(event.target.value)} name="password" type="password" autoComplete="current-password" placeholder="Su contraseña" /></label>{error && <p className="form-message" role="alert">{error}</p>}<button className="primary-button" disabled={submitting}>{submitting ? 'Verificando acceso…' : <>Entrar a LEXCON <span aria-hidden="true">→</span></>}</button></form><a className="text-button" href="/forgot-password">¿Olvidó su contraseña?</a>{allowDemoCredentials && showProfiles && <section className="demo-profiles" id="usuarios-demo" aria-label="Usuarios habilitados para demostración"><p className="demo-profile-copy">Elija un perfil: LEXCON completa su usuario y contraseña de demostración. Estas credenciales son ficticias y solo funcionan en esta instalación local.</p><div className="profile-list">{DEMO_CREDENTIALS.map((profile) => <button type="button" key={profile.email} className="profile-option" onClick={() => { setEmail(profile.email); setPassword(profile.password); setError(''); document.getElementById('password')?.focus(); }}><strong>{profile.role}</strong><span>Usuario: {profile.email}</span><span>Contraseña: {profile.password}</span><small>{profile.detail}</small></button>)}</div></section>}</section></section></main>;
}
