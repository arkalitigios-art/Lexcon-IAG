'use client';

import { FormEvent, useState } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/platform/auth/password-policy';

async function enviar(cuerpo: object): Promise<{ mensaje?: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch {
    throw new Error('No fue posible conectar con LEXCON. Verifique su conexión.');
  }
  // Un proxy o un error de red puede devolver algo que no es JSON; no mostrar el error técnico de análisis.
  const datos = await respuesta.json().catch(() => ({})) as { error?: string; mensaje?: string };
  if (!respuesta.ok) throw new Error(datos.error ?? 'No fue posible completar la operación.');
  return datos;
}

function useAccion() {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true); setMensaje(''); setError('');
    try { setMensaje(await accion()); } catch (causa) { setError(causa instanceof Error ? causa.message : 'No fue posible completar la operación.'); } finally { setOcupado(false); }
  }
  return { mensaje, error, ocupado, ejecutar };
}

export function AccountForms({ nombre, correo }: { nombre: string; correo: string }) {
  const perfil = useAccion();
  const correoForm = useAccion();
  const clave = useAccion();
  const [verClaves, setVerClaves] = useState(false);
  const tipo = verClaves ? 'text' : 'password';

  function guardarNombre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    void perfil.ejecutar(async () => { await enviar({ accion: 'NOMBRE', nombre: datos.get('nombre') }); return 'Nombre actualizado. Verá el cambio al recargar la página.'; });
  }

  function cambiarCorreo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    void correoForm.ejecutar(async () => {
      const respuesta = await enviar({ accion: 'CORREO', correoNuevo: datos.get('correoNuevo'), contrasenaActual: datos.get('contrasenaActual') });
      formulario.reset();
      return respuesta.mensaje ?? 'Enviamos una confirmación al correo nuevo.';
    });
  }

  function cambiarClave(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    if (datos.get('nueva') !== datos.get('confirmar')) { void clave.ejecutar(async () => { throw new Error('Las contraseñas nuevas no coinciden.'); }); return; }
    void clave.ejecutar(async () => { await enviar({ accion: 'CONTRASENA', actual: datos.get('actual'), nueva: datos.get('nueva') }); formulario.reset(); return 'Contraseña actualizada.'; });
  }

  return <div className="management-layout">
    <section className="surface management-form"><p className="section-kicker">Perfil</p><h2>Nombre visible</h2>
      <form onSubmit={guardarNombre}><label htmlFor="nombre">Nombre<input required id="nombre" name="nombre" maxLength={160} defaultValue={nombre} /></label><button className="primary-button" disabled={perfil.ocupado}>{perfil.ocupado ? 'Guardando…' : 'Guardar nombre'}</button></form>
      {perfil.mensaje && <p className="form-message" role="status">{perfil.mensaje}</p>}{perfil.error && <p className="form-message" role="alert">{perfil.error}</p>}
    </section>
    <section className="surface management-form"><p className="section-kicker">Acceso</p><h2>Correo de inicio de sesión</h2>
      <p>Su correo actual es <strong>{correo}</strong>. Enviaremos una confirmación al correo nuevo; hasta que la confirme, seguirá entrando con el actual. Abra el enlace de confirmación desde este mismo navegador.</p>
      <form onSubmit={cambiarCorreo}><label htmlFor="correoNuevo">Correo nuevo<input required id="correoNuevo" name="correoNuevo" type="email" autoComplete="email" /></label><label htmlFor="contrasenaActual">Contraseña actual<input required id="contrasenaActual" name="contrasenaActual" type={tipo} autoComplete="current-password" /></label><button className="primary-button" disabled={correoForm.ocupado}>{correoForm.ocupado ? 'Enviando…' : 'Cambiar correo'}</button></form>
      {correoForm.mensaje && <p className="form-message" role="status">{correoForm.mensaje}</p>}{correoForm.error && <p className="form-message" role="alert">{correoForm.error}</p>}
    </section>
    <section className="surface management-form"><p className="section-kicker">Seguridad</p><h2>Cambiar contraseña</h2>
      <p>Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
      <form onSubmit={cambiarClave}><label htmlFor="actual">Contraseña actual<input required id="actual" name="actual" type={tipo} autoComplete="current-password" /></label><label htmlFor="nueva">Contraseña nueva<input required minLength={MIN_PASSWORD_LENGTH} id="nueva" name="nueva" type={tipo} autoComplete="new-password" /></label><label htmlFor="confirmar">Confirmar contraseña nueva<input required minLength={MIN_PASSWORD_LENGTH} id="confirmar" name="confirmar" type={tipo} autoComplete="new-password" /></label><button type="button" className="text-button" aria-pressed={verClaves} onClick={() => setVerClaves((v) => !v)}>{verClaves ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</button><button className="primary-button" disabled={clave.ocupado}>{clave.ocupado ? 'Actualizando…' : 'Actualizar contraseña'}</button></form>
      {clave.mensaje && <p className="form-message" role="status">{clave.mensaje}</p>}{clave.error && <p className="form-message" role="alert">{clave.error}</p>}
    </section>
  </div>;
}
