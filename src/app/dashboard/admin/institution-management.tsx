'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitucionAdministrada } from '@/modules/admin/institutions/institution-service';

/** Registro (sin `institucion`) o edición de una Institución Educativa. */
export function InstitutionManagement({ institucion }: { institucion?: InstitucionAdministrada }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [esError, setEsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const editando = Boolean(institucion);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage(''); setEsError(false);
    try {
      const response = await fetch('/api/admin/institutions', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: institucion?.id,
          nombre: data.get('nombre'),
          ciudad: data.get('ciudad'),
          departamento: data.get('departamento'),
          nit: data.get('nit'),
          codigoDane: data.get('codigoDane'),
          estado: data.get('estado'),
          observacion: data.get('observacion'),
        }),
      });
      const body = await response.json() as { error?: string; id?: string };
      if (!response.ok) { setEsError(true); setMessage(body.error ?? 'No fue posible completar la acción.'); return; }
      if (editando) { setMessage('Institución Educativa actualizada.'); router.refresh(); return; }
      router.push(`/dashboard/admin/institutions/${body.id}`);
    } catch {
      setEsError(true); setMessage('No fue posible conectar con LEXCON. Intente de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="management-layout create-only"><section className="surface management-form">
    <p className="section-kicker">{editando ? 'Editar institución' : 'Nueva institución'}</p>
    <h2>{institucion ? institucion.nombre : 'Registrar Institución Educativa'}</h2>
    <p>Registre la IE, su ubicación, sus códigos de identificación y su estado de servicio.</p>
    <form onSubmit={submit}>
      <label>Nombre de la IE<input required name="nombre" minLength={3} maxLength={120} defaultValue={institucion?.nombre ?? ''} /></label>
      <label>Ciudad o municipio<input required name="ciudad" minLength={2} maxLength={100} defaultValue={institucion?.ciudad ?? ''} placeholder="Ej.: Montería" /></label>
      <label>Departamento<input required name="departamento" minLength={2} maxLength={100} defaultValue={institucion?.departamento ?? ''} placeholder="Ej.: Córdoba" /></label>
      <label>NIT (opcional)<input name="nit" maxLength={20} defaultValue={institucion?.nit ?? ''} placeholder="Ej.: 800123456-7" /></label>
      <label>Código DANE (opcional)<input name="codigoDane" maxLength={15} inputMode="numeric" defaultValue={institucion?.codigoDane ?? ''} /></label>
      <label>Estado del servicio<select name="estado" defaultValue={institucion?.estado ?? 'ACTIVE'}><option value="ACTIVE">Servicio activo</option><option value="SUSPENDED_ARREARS">Suspendida por mora</option><option value="ENDED">Servicio finalizado</option></select></label>
      <label>Observación administrativa<textarea name="observacion" maxLength={500} defaultValue={institucion?.observacion ?? ''} placeholder="Motivo o referencia administrativa" /></label>
      <div className="management-buttons"><button className="primary-button" disabled={busy}>{busy ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar IE'}</button></div>
    </form>
    {message && <p className="form-message" role={esError ? 'alert' : 'status'}>{message}</p>}
  </section></div>;
}
