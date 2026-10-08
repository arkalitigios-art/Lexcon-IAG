'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminControlCenter } from '@/modules/admin/control-center';

const roleLabel: Record<string, string> = { ARKA_ADMIN: 'Administrador Arka', ARKA_ATTORNEY: 'Abogado Arka', IE_RECTOR: 'Rector / ordenador', IE_SUPPORT: 'Funcionario autorizado', IE_COMMITTEE: 'Comité de evaluación' };

export function AdminAccesses({ accesses }: { accesses: AdminControlCenter['accesses'] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function updateAccess(id: string, active: boolean) {
    setUpdating(id); setMessage('');
    const response = await fetch('/api/admin/accesses', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ membershipId: id, active }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error ?? 'No fue posible actualizar el acceso.'); setUpdating(null); return; }
    setMessage(active ? 'Acceso activado.' : 'Acceso desactivado.'); setUpdating(null); router.refresh();
  }
  return <><div className="access-card-grid">{accesses.map((access) => <article key={access.id} className={`access-card ${access.active ? '' : 'access-inactive'}`}><span className="access-card-avatar" aria-hidden="true">{access.name.slice(0, 1)}</span><div><strong>{access.name}</strong><span>{roleLabel[access.role] ?? access.role}</span><small>{access.institutionName ?? 'Arka Litigios IAG'}</small><small>{access.email}</small></div><button type="button" className="access-toggle" disabled={updating === access.id} onClick={() => updateAccess(access.id, !access.active)}>{updating === access.id ? 'Actualizando…' : access.active ? 'Desactivar acceso' : 'Activar acceso'}</button></article>)}</div>{message && <p className="form-message" role="status">{message}</p>}</>;
}
