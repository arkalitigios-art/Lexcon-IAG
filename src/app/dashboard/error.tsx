'use client';

import Link from 'next/link';

/**
 * Frontera de error de todo el panel: si una página lanza, la persona ve este mensaje y no «Internal Server Error».
 * Nunca se muestra error.message (puede traer detalles del proveedor): solo el digest, que permite ubicar el error en el registro del servidor.
 * En esta versión de Next.js la función de reintento se llama retry (vuelve a pedir los datos al servidor).
 */
export default function ErrorDelPanel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Algo salió mal</p><h1>No pudimos cargar esta sección</h1><p>Lexcon tuvo un problema al preparar la pantalla. Puede intentarlo de nuevo o volver al inicio de su espacio.</p></div></header>
    <section className="surface">
      <div className="empty-state" role="alert">
        <strong>La sección no está disponible en este momento.</strong>
        <p>Si el problema continúa, comparta el código de referencia con el equipo de soporte de Lexcon.</p>
        {error.digest ? <p>Código de referencia: <strong>{error.digest}</strong></p> : null}
      </div>
      <div className="management-buttons">
        <button type="button" className="primary-button" onClick={() => retry()}>Intentar de nuevo</button>
        <Link className="text-button" href="/dashboard">Volver al inicio</Link>
      </div>
    </section>
  </div>;
}
