'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedAttorney } from '@/modules/admin/service-administration';

export function AttorneyManagement({ attorneys, createOnly = false }: { attorneys: ManagedAttorney[]; createOnly?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ManagedAttorney | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const showingForm = createOnly || editing !== null;

  async function send(method: 'POST' | 'PATCH' | 'DELETE', payload: unknown) {
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/attorneys', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? 'No fue posible completar la acción.'); setBusy(false); return false; }
    setBusy(false); router.refresh(); return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await send(editing ? 'PATCH' : 'POST', { id: editing?.id, name: data.get('name'), email: data.get('email'), password: data.get('password'), active: editing ? data.get('active') === 'true' : true });
    if (ok) {
      const wasEditing = Boolean(editing);
      setEditing(null); event.currentTarget.reset();
      if (createOnly) router.push('/dashboard/admin/lawyers');
      else setMessage(wasEditing ? 'Abogado actualizado.' : 'Abogado registrado.');
    }
  }

  if (showingForm) return <section className="surface management-form wide-management-form"><p className="section-kicker">{editing ? 'Editar abogado Arka' : 'Nuevo abogado Arka'}</p><h2>{editing ? editing.name : 'Registrar abogado'}</h2><p>La cuenta queda disponible para asignaciones solo cuando su acceso está activo.</p><form onSubmit={submit}><label>Nombre completo<input required name="name" defaultValue={editing?.name ?? ''} /></label><label>Correo electrónico<input required type="email" name="email" defaultValue={editing?.email ?? ''} /></label><label>{editing ? 'Nueva contraseña opcional' : 'Contraseña temporal'}<input required={!editing} minLength={12} type="password" name="password" placeholder={editing ? 'Dejar vacío para conservarla' : 'Mínimo 12 caracteres'} /></label>{editing && <label>Estado del acceso<select name="active" defaultValue={editing.active ? 'true' : 'false'}><option value="true">Activo</option><option value="false">Desactivado</option></select></label>}<div className="management-buttons"><button className="primary-button" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar abogado'}</button>{!createOnly && <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button>}</div></form>{message && <p className="form-message" role="status">{message}</p>}</section>;

  return <section className="attorney-directory"><div className="directory-heading"><div><p className="section-kicker">Equipo jurídico Arka</p><h2>Abogados disponibles para asignación</h2><p>Seleccione una persona para modificar su cuenta o desactivar el acceso.</p></div><Link className="primary-button" href="/dashboard/admin/lawyers/new">Registrar abogado <span aria-hidden="true">→</span></Link></div><div className="attorney-card-grid">{attorneys.map((attorney) => <article className={`attorney-card ${attorney.active ? '' : 'inactive'}`} key={attorney.id}><span className="attorney-card-avatar" aria-hidden="true">{attorney.name.slice(0, 1)}</span><div><strong>{attorney.name}</strong><span className={attorney.active ? 'availability active' : 'availability'}>{attorney.active ? 'Disponible para asignación' : 'Acceso desactivado'}</span><small>{attorney.email}</small><small>{attorney.assignments} asignaciones vigentes</small></div><div className="card-actions"><button type="button" onClick={() => setEditing(attorney)}>Gestionar</button>{attorney.active && <button type="button" className="danger-button" disabled={busy} onClick={() => send('DELETE', { id: attorney.id, name: attorney.name, email: attorney.email })}>Desactivar</button>}</div></article>)}</div>{message && <p className="form-message" role="status">{message}</p>}</section>;
}
