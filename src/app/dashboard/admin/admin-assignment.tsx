'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AttorneyOption } from '@/modules/assignments/attorney-assignment';
import type { ProcessSummary } from '@/modules/processes/process-queries';

export function AdminAssignment({ processes, attorneys }: { processes: ProcessSummary[]; attorneys: AttorneyOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!processes.length) return <div className="empty-state"><strong>No hay expedientes pendientes de asignación.</strong><p>Los expedientes que abra una IE aparecerán aquí cuando no tengan abogado activo.</p></div>;
  if (!attorneys.length) return <p className="form-message" role="status">No hay abogados Arka disponibles para asignar.</p>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/attorney-assignments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ processId: data.get('processId'), attorneyId: data.get('attorneyId') }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error ?? 'No fue posible registrar la asignación.'); setSubmitting(false); return; }
    setMessage('La asignación jurídica fue registrada.'); setSubmitting(false); router.refresh();
  }

  return <form className="assignment-form" onSubmit={submit}>
    <label>Proceso pendiente<select name="processId" required>{processes.map((process) => <option key={process.id} value={process.id}>{process.institutionName} · {new Date(process.createdAt).toLocaleDateString('es-CO')} · {process.status === 'BLOCKED_REGULATION' ? 'Mercado bloqueado' : 'Cotizaciones recibidas'}</option>)}</select></label>
    <label>Abogado Arka<select name="attorneyId" required>{attorneys.map((attorney) => <option key={attorney.id} value={attorney.id}>{attorney.name}</option>)}</select></label>
    <button className="primary-button" disabled={submitting}>{submitting ? 'Registrando…' : 'Asignar abogado'}</button>
    {message && <p className="form-message" role="status">{message}</p>}
  </form>;
}
