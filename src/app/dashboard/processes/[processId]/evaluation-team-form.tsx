'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { id?: string; name: string; role: string };

export function EvaluationTeamForm({ processId, evaluators, supervisor }: { processId: string; evaluators: Member[]; supervisor: Member | null }) {
  const router = useRouter();
  const [committee, setCommittee] = useState<Member[]>(evaluators.length ? evaluators : [{ name: '', role: 'Miembro del comité evaluador' }]);
  const [lead, setLead] = useState<Member>(supervisor ?? { name: '', role: 'Supervisor(a) del proceso' });
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  const updateCommittee = (index: number, key: keyof Member, value: string) => setCommittee((current) => current.map((member, itemIndex) => itemIndex === index ? { ...member, [key]: value } : member));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch(`/api/processes/${processId}/evaluation-team`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evaluators: committee.map(({ name, role }) => ({ name, role })), supervisor: { name: lead.name, role: lead.role } }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error ?? 'No fue posible guardar los datos.'); setSaving(false); return; }
    setSaving(false); setMessage('Comité evaluador y supervisor guardados para este expediente.'); router.refresh();
  }

  return <section className="surface market-study-data-form" aria-labelledby="evaluation-team-title">
    <div className="section-heading"><div><p className="section-kicker">Evaluación de ofertas</p><h2 id="evaluation-team-title">Comité evaluador y supervisor</h2></div><span>Datos del acta</span></div>
    <p>Registre estos datos antes de descargar el acta. Se incorporarán en el apartado de integrantes y en los espacios de firma del documento.</p>
    <form onSubmit={save}>
      {committee.map((member, index) => <div className="evaluation-member-row" key={member.id ?? index}><label>Nombre del evaluador {index + 1}<input required value={member.name} onChange={(event) => updateCommittee(index, 'name', event.target.value)} /></label><label>Cargo o función<input required value={member.role} onChange={(event) => updateCommittee(index, 'role', event.target.value)} /></label>{committee.length > 1 && <button className="text-button" type="button" onClick={() => setCommittee((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>}</div>)}
      {committee.length < 8 && <button className="secondary-button" type="button" onClick={() => setCommittee((current) => [...current, { name: '', role: 'Miembro del comité evaluador' }])}>Agregar evaluador</button>}
      <div className="evaluation-member-row"><label>Nombre del supervisor(a)<input required value={lead.name} onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))} /></label><label>Cargo o función<input required value={lead.role} onChange={(event) => setLead((current) => ({ ...current, role: event.target.value }))} /></label></div>
      <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar comité y supervisor'}</button>
    </form>
    {message && <p className="form-message" role="status">{message}</p>}
  </section>;
}
