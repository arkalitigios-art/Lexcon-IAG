'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitucionParaAcceso, RolAdministrable, UsuarioAdministrado } from '@/modules/access/supabase-user-administration';

const labels: Record<RolAdministrable, string> = { ADMINISTRADOR_ARKA: 'Administrador', ABOGADO_ARKA: 'Abogado', RECTOR_IE: 'Rector', APOYO_IE: 'Apoyo IE' };

export function UserAccessManagement({ usuarios: initialUsuarios, instituciones, idActor }: { usuarios: UsuarioAdministrado[]; instituciones: InstitucionParaAcceso[]; idActor: string }) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rol, setRol] = useState<RolAdministrable>('ABOGADO_ARKA');
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [mensajeCorreccion, setMensajeCorreccion] = useState('');
  const institucional = rol === 'RECTOR_IE' || rol === 'APOYO_IE';

  async function api(method: 'POST' | 'PATCH', body: object) {
    const response = await fetch('/api/admin/users', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'No fue posible completar la acción.');
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const form = new FormData(formulario);
    setBusy(true); setMessage('');
    try {
      await api('POST', { nombre: form.get('nombre'), correo: form.get('correo'), codigoRol: rol, idInstitucion: institucional ? form.get('idInstitucion') : null });
      setMessage('Invitación enviada. La persona recibirá un enlace para definir su contraseña.');
      formulario.reset(); setRol('ABOGADO_ARKA'); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible invitar a la persona.');
    } finally { setBusy(false); }
  }

  async function action(usuario: UsuarioAdministrado, accion: 'REENVIAR' | 'CAMBIAR_ESTADO', activo?: boolean) {
    setBusy(true); setMessage('');
    try {
      await api('PATCH', { idUsuario: usuario.id, accion, activo });
      if (accion === 'CAMBIAR_ESTADO' && typeof activo === 'boolean') setUsuarios((current) => current.map((item) => item.id === usuario.id ? { ...item, activo } : item));
      setMessage(accion === 'REENVIAR' ? `Se reenvió el enlace a ${usuario.correo}.` : `El acceso fue ${activo ? 'activado' : 'desactivado'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar el acceso.');
    } finally { setBusy(false); }
  }

  function cerrarCorreccion() {
    setCorrigiendo(null); setMensajeCorreccion('');
  }

  function alternarCorreccion(idUsuario: string) {
    setMensajeCorreccion('');
    setCorrigiendo(corrigiendo === idUsuario ? null : idUsuario);
  }

  async function corregir(event: FormEvent<HTMLFormElement>, usuario: UsuarioAdministrado) {
    event.preventDefault();
    const correo = String(new FormData(event.currentTarget).get('correo') ?? '').trim().toLowerCase();
    setBusy(true); setMessage(''); setMensajeCorreccion('');
    try {
      await api('PATCH', { idUsuario: usuario.id, accion: 'CORREGIR_CORREO', correo });
      setUsuarios((current) => current.map((item) => item.id === usuario.id ? { ...item, correo } : item));
      cerrarCorreccion();
      // El enlace solo se puede reenviar a cuentas activas.
      setMessage(usuario.activo ? `El correo de ${usuario.nombre} ahora es ${correo}. Use "Reenviar enlace" para que defina una contraseña nueva.` : `El correo de ${usuario.nombre} ahora es ${correo}.`);
    } catch (error) {
      const texto = error instanceof Error ? error.message : 'No fue posible corregir el correo.';
      // Se muestra también dentro del formulario abierto, que es donde la persona está mirando.
      setMessage(texto); setMensajeCorreccion(texto);
    } finally { setBusy(false); }
  }

  return <div className="management-layout">
    <section className="surface management-form">
      <p className="section-kicker">Nueva cuenta</p><h2>Invitar usuario</h2>
      <p>El comité evaluador no se registra aquí: participa solo como información del proceso y no accede a la aplicación.</p>
      <form onSubmit={invite}>
        <label>Nombre completo<input required name="nombre" maxLength={160} /></label>
        <label>Correo electrónico<input required name="correo" type="email" autoComplete="email" /></label>
        <label>Rol<select value={rol} onChange={(event) => setRol(event.target.value as RolAdministrable)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {institucional && <label>Institución Educativa<select required name="idInstitucion" defaultValue=""><option value="" disabled>Seleccione una institución</option>{instituciones.map((institucion) => <option key={institucion.id} value={institucion.id}>{institucion.nombre}</option>)}</select></label>}
        {institucional && instituciones.length === 0 && <p className="form-message">Primero registre una Institución Educativa activa.</p>}
        <button className="primary-button" disabled={busy || (institucional && instituciones.length === 0)}>{busy ? 'Enviando…' : 'Enviar invitación'}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
    <section className="surface management-list">
      <div className="section-heading"><div><p className="section-kicker">Cuentas autorizadas</p><h2>Usuarios de LEXCON</h2></div><span>{usuarios.filter((usuario) => usuario.activo).length} activos</span></div>
      <ul>{usuarios.map((usuario) => <li key={usuario.id}>
        <div><strong>{usuario.nombre}</strong><span className={`service-state ${usuario.activo ? 'active' : 'ended'}`}>{usuario.activo ? 'Activo' : 'Desactivado'}</span><small>{labels[usuario.rol]}{usuario.institucion ? ` · ${usuario.institucion}` : ''}</small><small>{usuario.correo}</small></div>
        <div className="row-actions">
          {usuario.activo && <button type="button" disabled={busy} onClick={() => action(usuario, 'REENVIAR')}>Reenviar enlace</button>}
          {usuario.id !== idActor && <button type="button" disabled={busy} aria-expanded={corrigiendo === usuario.id} aria-controls={`correccion-${usuario.id}`} onClick={() => alternarCorreccion(usuario.id)}>Corregir correo</button>}
          <button type="button" className={usuario.activo ? 'danger-button' : undefined} disabled={busy} onClick={() => action(usuario, 'CAMBIAR_ESTADO', !usuario.activo)}>{usuario.activo ? 'Desactivar' : 'Reactivar'}</button>
        </div>
        {corrigiendo === usuario.id && <form id={`correccion-${usuario.id}`} className="management-form" onSubmit={(event) => corregir(event, usuario)}>
          <p>¿Corregir el correo de <strong>{usuario.nombre}</strong> (hoy <strong>{usuario.correo}</strong>)? Quedará registrado en la auditoría.</p>
          <label>Correo nuevo<input required autoFocus name="correo" type="email" autoComplete="off" /></label>
          {mensajeCorreccion && <p className="form-message" role="alert">{mensajeCorreccion}</p>}
          <div className="management-buttons">
            <button className="primary-button" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar corrección'}</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={cerrarCorreccion}>Cancelar</button>
          </div>
        </form>}
      </li>)}</ul>
      {usuarios.length === 0 && <p>Aún no hay usuarios invitados.</p>}
    </section>
  </div>;
}
