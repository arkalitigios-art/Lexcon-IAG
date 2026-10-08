'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Quote = { quoteId: string; fileId: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string };

export function QuotationManager({ processId, quotations }: { processId: string; quotations: Quote[] }) {
  const router = useRouter(); const [files, setFiles] = useState<File[]>([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [removing, setRemoving] = useState<string | null>(null); const [recalculating, setRecalculating] = useState(false);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!files.length) { setMessage('Selecciona al menos una cotización para agregar.'); return; }
    setBusy(true); setMessage(''); const form = new FormData(); files.forEach((file) => form.append('quotations', file));
    const response = await fetch(`/api/processes/${processId}/quotations`, { method: 'POST', body: form }); const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? 'No fue posible agregar las cotizaciones.'); setBusy(false); return; }
    setFiles([]); setBusy(false); setMessage('Cotizaciones agregadas y estudio de mercado actualizado.'); router.refresh();
  }

  async function remove(quote: Quote) {
    if (!window.confirm(`¿Eliminar “${quote.originalName}” del expediente? El estudio de mercado se recalculará con las cotizaciones restantes.`)) return;
    setRemoving(quote.quoteId); setMessage(''); const response = await fetch(`/api/processes/${processId}/quotations?quoteId=${encodeURIComponent(quote.quoteId)}`, { method: 'DELETE' }); const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? 'No fue posible eliminar la cotización.'); setRemoving(null); return; }
    setRemoving(null); setMessage('Cotización eliminada y estudio de mercado actualizado.'); router.refresh();
  }

  async function recalculate() {
    setRecalculating(true); setMessage(''); const response = await fetch(`/api/processes/${processId}/quotations`, { method: 'PATCH' }); const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? 'No fue posible recalcular el estudio de mercado.'); setRecalculating(false); return; }
    setRecalculating(false); setMessage('Estudio de mercado recalculado con las cotizaciones actuales.'); router.refresh();
  }

  return <section className="surface quotation-manager" aria-labelledby="quotation-manager-title">
    <div className="section-heading"><div><p className="section-kicker">Cotizaciones de mercado</p><h2 id="quotation-manager-title">Ajustar cotizaciones</h2></div><span>{quotations.length} cargadas</span></div>
    <p>Agrega las cotizaciones correctas y elimina individualmente las que se cargaron por error. Puede retirar todas temporalmente para reemplazarlas por nuevas.</p>
    <div className="quotation-card-grid">{quotations.map((quote) => <article className="quotation-card" key={quote.quoteId}><span aria-hidden="true">DOC</span><div><strong>{quote.originalName}</strong><small>{quote.mimeType.includes('pdf') ? 'PDF' : quote.mimeType.includes('wordprocessingml') ? 'DOCX' : 'Imagen'} · cargada el {new Date(quote.createdAt).toLocaleDateString('es-CO')}</small></div><button className="text-danger-button" type="button" disabled={removing === quote.quoteId} onClick={() => remove(quote)}>{removing === quote.quoteId ? 'Eliminando…' : 'Eliminar'}</button></article>)}</div>
    <form className="quote-add-form" onSubmit={add}><label className="file-picker"><span>Agregar cotizaciones</span><input type="file" multiple accept="application/pdf,.docx,image/jpeg,image/png" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>{files.length > 0 && <span className="selected-regulation">{files.length} {files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}</span>}<button className="secondary-button" disabled={busy}>{busy ? 'Actualizando…' : 'Agregar y recalcular'}</button><button className="text-danger-button" type="button" disabled={recalculating} onClick={recalculate}>{recalculating ? 'Recalculando…' : 'Recalcular estudio de mercado'}</button></form>
    {message && <p className="form-message" role="status">{message}</p>}
  </section>;
}
