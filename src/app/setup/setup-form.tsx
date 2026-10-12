'use client';

import { FormEvent, useState } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/platform/auth/password-policy';

type Modo = 'PRIMER_ADMINISTRADOR' | 'RECUPERACION';
interface Administrador { id: string; nombre: string; correo: string }

async function enviar(cuerpo: object): Promise<Record<string, unknown>> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Revise su conexión e intente de nuevo.');
  }
  // Un proxy o una caída pueden devolver HTML en lugar de JSON: nunca se toma como éxito.
  let datos: Record<string, unknown> | null = null;
  try {
    const analizado: unknown = await respuesta.json();
    if (typeof analizado === 'object' && analizado !== null && !Array.isArray(analizado)) datos = analizado as Record<string, unknown>;
  } catch { /* la respuesta no es JSON */ }
  if (!respuesta.ok || !datos) throw new Error(typeof datos?.error === 'string' ? datos.error : 'No fue posible completar la operación.');
  return datos;
}

export function SetupForm({ modo }: { modo: Modo }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [administradores, setAdministradores] = useState<Administrador[] | null>(null);
  const [idUsuario, setIdUsuario] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState(false);

  const recuperando = modo === 'RECUPERACION';
  const enPasoDatos = !recuperando || administradores !== null;

  /** El código y las contraseñas no deben quedar en memoria una vez completada la operación. */
  function limpiarSecretos() {
    setCodigo('');
    setContrasena('');
    setConfirmar('');
  }

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje('');
    if (enPasoDatos && contrasena !== confirmar) { setMensaje('Las contraseñas no coinciden.'); return; }
    setOcupado(true);
    try {
      if (!recuperando) {
        await enviar({ accion: 'crear', codigo, nombre, correo, contrasena });
        limpiarSecretos();
        setHecho(true);
      } else if (administradores === null) {
        const datos = await enviar({ accion: 'listar', codigo });
        const lista = Array.isArray(datos.administradores) ? datos.administradores as Administrador[] : [];
        setAdministradores(lista);
        setIdUsuario('');
      } else {
        await enviar({ accion: 'recuperar', codigo, idUsuario, correo, contrasena });
        limpiarSecretos();
        setHecho(true);
      }
    } catch (causa) {
      setMensaje(causa instanceof Error ? causa.message : 'No fue posible completar la operación.');
    } finally {
      setOcupado(false);
    }
  }

  const titulo = recuperando ? 'Recupere el acceso del administrador.' : 'Cree al primer administrador.';
  const descripcion = recuperando
    ? 'Esta pantalla solo está disponible mientras el servidor tenga un código de configuración activo.'
    : 'Esta pantalla solo está disponible mientras el servidor tenga un código de configuración y no exista un administrador activo.';

  return <main className="access access-v2"><section className="access-frame">
    <section className="access-hero"><p className="eyebrow">Configuración inicial</p><h1>{titulo}</h1><p>{descripcion}</p></section>
    <section className="login-card">
      {hecho ? <div>
        <div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>{recuperando ? 'Acceso recuperado' : 'Administrador creado'}</h2><p>Ya puede iniciar sesión con su correo y la contraseña definida.</p></div></div>
        <p className="form-message" role="status">Retire <strong>LEXCON_SETUP_TOKEN</strong> de la configuración de Dokploy y reinicie el servicio. Esta pantalla dejará de estar disponible.</p>
        <a className="primary-button" href="/login">Ir al inicio de sesión</a>
      </div> : <form className="login-form" onSubmit={enviarFormulario}>
        <div className="login-card-heading"><span className="login-glyph" aria-hidden="true">⌁</span><div><h2>{recuperando ? 'Recuperación' : 'Primer administrador'}</h2><p>{recuperando && administradores === null ? 'Escriba el código de configuración del servidor.' : 'Defina su usuario y su contraseña de acceso.'}</p></div></div>
        <label className="field-label" htmlFor="codigo">Código de configuración<input required id="codigo" name="codigo" type="password" autoComplete="off" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={recuperando && administradores !== null} /></label>
        {!recuperando && <>
          <label className="field-label" htmlFor="nombre">Nombre<input required id="nombre" name="nombre" maxLength={160} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label className="field-label" htmlFor="correo">Correo (será su usuario)<input required id="correo" name="correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
        </>}
        {recuperando && administradores !== null && <>
          <label className="field-label" htmlFor="admin">Administrador<select id="admin" required value={idUsuario} onChange={(e) => setIdUsuario(e.target.value)}><option value="" disabled>Seleccione un administrador</option>{administradores.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.correo}</option>)}</select></label>
          <label className="field-label" htmlFor="correo-nuevo">Correo nuevo (opcional)<input id="correo-nuevo" name="correo" type="email" autoComplete="off" value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
        </>}
        {enPasoDatos && <>
          <label className="field-label" htmlFor="contrasena">Contraseña<span className="password-field"><input required minLength={MIN_PASSWORD_LENGTH} id="contrasena" type={ver ? 'text' : 'password'} autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} /><button className="password-visibility" type="button" aria-pressed={ver} onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button></span></label>
          <label className="field-label" htmlFor="confirmar">Confirmar contraseña<span className="password-field"><input required minLength={MIN_PASSWORD_LENGTH} id="confirmar" type={ver ? 'text' : 'password'} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} /></span></label>
        </>}
        {mensaje && <p className="form-message" role="alert">{mensaje}</p>}
        <button className="primary-button" disabled={ocupado || (recuperando && administradores !== null && !idUsuario)}>{ocupado ? 'Procesando…' : recuperando && administradores === null ? 'Continuar' : recuperando ? 'Recuperar acceso' : 'Crear administrador'}</button>
      </form>}
    </section>
  </section></main>;
}
