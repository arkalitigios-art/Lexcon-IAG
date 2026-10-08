'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProcessSummary } from '@/modules/processes/process-queries';
import { phaseLabel, ProcessStatus } from '../_components/process-status';
import { processConsecutive, processContractType } from '@/modules/processes/process-presentation';

type InstitutionNotification = { id: string; processId: string | null; body: string; createdAt: string };

export function InstitutionWorkspace({ processes, notifications, canOpen }: { processes: ProcessSummary[]; notifications: InstitutionNotification[]; canOpen: boolean }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOpening, setShowOpening] = useState(false);

  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === '#opening') setShowOpening(true); };
    openFromHash(); window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) { setMessage('Selecciona al menos una cotización de mercado.'); return; }
    setSubmitting(true); setMessage('');
    const body = new FormData(); files.forEach((file) => body.append('quotations', file));
    const response = await fetch('/api/processes', { method: 'POST', body });
    const payload = await response.json() as { id?: string; error?: string };
    if (!response.ok || !payload.id) { setMessage(payload.error ?? 'No fue posible crear el proceso.'); setSubmitting(false); return; }
    router.push(`/dashboard/processes/${payload.id}`); router.refresh();
  }

  const blocked = processes.filter((process) => process.status === 'BLOCKED_REGULATION' || process.status === 'BLOCKED_MARKET_DATA').length;
  const attended = processes.filter((process) => process.attorneyName).length;
  return <div className="page-stack app-page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Gestión institucional</p><h1>Procesos de contratación</h1><p>Gestione las actuaciones, evidencia y etapas de contratación de la Institución Educativa.</p></div>{canOpen && <button className="primary-button page-action" type="button" onClick={() => setShowOpening((current) => !current)}>{showOpening ? 'Cerrar registro' : <>Nuevo proceso <span aria-hidden="true">→</span></>}</button>}</header>
    {notifications.length > 0 && <section className="institution-notifications" aria-labelledby="institution-notifications-title"><div><p className="section-kicker">Novedades del proceso</p><h2 id="institution-notifications-title">Requieren su atención</h2></div><div>{notifications.map((notification) => notification.processId ? <Link key={notification.id} href={`/dashboard/processes/${notification.processId}`}><span aria-hidden="true">!</span><p>{notification.body.replace(/expediente/gi, 'proceso')}</p><small>{new Date(notification.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small><b aria-hidden="true">→</b></Link> : <article key={notification.id}><span aria-hidden="true">!</span><p>{notification.body.replace(/expediente/gi, 'proceso')}</p><small>{new Date(notification.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small></article>)}</div></section>}
    <section className="process-metrics" aria-label="Resumen de procesos de contratación"><div><span className="metric-symbol" aria-hidden="true">▦</span><strong>{processes.length}</strong><small>Procesos activos</small></div><div><span className="metric-symbol alert" aria-hidden="true">!</span><strong>{blocked}</strong><small>Con actuación bloqueada</small></div><div><span className="metric-symbol good" aria-hidden="true">✓</span><strong>{attended}</strong><small>Con abogado asignado</small></div><div className="integrity-metric"><span aria-hidden="true">●</span><div><strong>Registro privado</strong><small>La evidencia se conserva en LEXCON.</small></div></div></section>
    <div className={`institution-layout ${showOpening ? 'opening-visible' : 'opening-hidden'}`}>
      {showOpening && <section id="opening" className="surface upload-surface" aria-labelledby="open-process-title">
        <p className="section-kicker">Nueva actuación</p><h2 id="open-process-title">Registrar nuevo proceso</h2>
        <p>Puede cargar una, dos, tres o más cotizaciones en una sola operación. Cada archivo quedará conservado como evidencia privada del proceso.</p>
        <p className="notice">LEXCON lee PDF con texto seleccionable y DOCX. Para calcular comparabilidad, identifique en cada cotización: descripción, cantidad, valor unitario y valor total. Las imágenes o PDF escaneados se conservan, pero quedan pendientes de una versión legible.</p>
        {canOpen ? <form className="upload-form" onSubmit={submit}>
          <label className="file-picker"><span>Seleccionar cotizaciones</span><input name="quotations" type="file" multiple accept="application/pdf,.docx,image/jpeg,image/png" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
          {files.length > 0 && <ul className="selected-files" aria-label="Cotizaciones seleccionadas">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" aria-label={`Retirar ${file.name}`} onClick={() => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Retirar</button></li>)}</ul>}
          <button className="primary-button" disabled={submitting}>{submitting ? 'Creando proceso…' : 'Crear proceso'}</button>
          {message && <p className="form-message" role="alert">{message}</p>}
        </form> : <p className="notice">Tu rol puede consultar procesos, pero no crearlos.</p>}
      </section>}
      <section className="surface process-list" aria-labelledby="processes-title">
        <div className="section-heading"><div><p className="section-kicker">Registro institucional</p><h2 id="processes-title">Procesos de contratación</h2></div><span>{processes.length} {processes.length === 1 ? 'proceso' : 'procesos'}</span></div>
        {processes.length ? <ul>{processes.map((process) => <li key={process.id}><Link href={`/dashboard/processes/${process.id}`}><div className="process-identity"><strong>Proceso No. {processConsecutive(process)}</strong><span>{processContractType(process.objectDescription)}</span><small>{phaseLabel(process.phase)} · Creado el {new Date(process.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</small></div><ProcessStatus status={process.status} /></Link></li>)}</ul> : <div className="empty-state"><strong>Aún no hay procesos de contratación activos.</strong><p>Cree el primer proceso al registrar las cotizaciones de mercado.</p></div>}
      </section>
    </div>
  </div>;
}
