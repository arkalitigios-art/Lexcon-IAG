'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketStudyProfile } from '@/modules/processes/market-study-profile';

export function MarketStudyDataForm({ processId, profile }: { processId: string; profile: MarketStudyProfile }) {
  const router = useRouter(); const [values, setValues] = useState(profile); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const set = (field: keyof MarketStudyProfile, value: string) => setValues((current) => ({ ...current, [field]: value }));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch(`/api/processes/${processId}/market-study-profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? 'No fue posible guardar los datos.'); setSaving(false); return; }
    setSaving(false); setMessage('Complementos guardados. LEXCON los incorporará en la siguiente descarga del borrador Word.'); router.refresh();
  }
  return <section className="surface market-study-data-form" aria-labelledby="market-study-data-title">
    <div className="section-heading"><div><p className="section-kicker">Complementos institucionales</p><h2 id="market-study-data-title">Información opcional para precisar el borrador</h2></div><span>LEXCON genera la base automáticamente</span></div>
    <p>LEXCON redacta el objeto, la clasificación preliminar y los análisis a partir de las cotizaciones y la matriz comparativa. Usa estos campos solo si deseas precisar información que no está en los documentos cargados.</p>
    <form onSubmit={save}><label>Objeto a contratar (opcional)<textarea value={values.objectDescription} onChange={(event) => set('objectDescription', event.target.value)} placeholder="Solo si debe precisarse el objeto generado por LEXCON" /></label><label>Códigos UNSPSC (opcional)<textarea value={values.unspscCodes} onChange={(event) => set('unspscCodes', event.target.value)} placeholder="Ej.: 44120000 Suministros de oficina" /></label><label>Información adicional sobre la demanda (opcional)<textarea value={values.demandAnalysis} onChange={(event) => set('demandAnalysis', event.target.value)} placeholder="Antecedentes o necesidad institucional no visible en las cotizaciones" /></label><label>Información adicional sobre la oferta (opcional)<textarea value={values.supplyAnalysis} onChange={(event) => set('supplyAnalysis', event.target.value)} placeholder="Condiciones verificadas del sector o del proceso" /></label><label>Base tributaria y condiciones económicas (opcional)<textarea value={values.taxBasis} onChange={(event) => set('taxBasis', event.target.value)} placeholder="IVA, transporte, descuentos u otras condiciones verificadas" /></label><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar complementos opcionales'}</button></form>
    {message && <p className="form-message" role="status">{message}</p>}
  </section>;
}
