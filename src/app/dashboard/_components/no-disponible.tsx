import Link from 'next/link';
import type { ReactElement } from 'react';
import type { CurrentUser } from '@/platform/auth/current-user';
import { FUNCIONES, funcionDisponible, MENSAJE_NO_DISPONIBLE, type ClaveFuncion } from '@/platform/features';
import { workspacePath } from '../require-workspace-user';
import { WorkspaceShell } from './workspace-shell';

/** Página uniforme, dentro del marco normal, para una función que todavía no existe en Supabase. */
export function NoDisponible({ user, activePath, etiqueta }: { user: CurrentUser; activePath: string; etiqueta: string }) {
  return <WorkspaceShell user={user} activePath={activePath}><div className="page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Función en preparación</p><h1>{etiqueta}</h1><p>Esta sección todavía se está trasladando al servicio en línea de LEXCON.</p></div></header>
    <section className="surface">
      <div className="empty-state" role="status"><strong>{MENSAJE_NO_DISPONIBLE}</strong><p>Mientras tanto, puede seguir trabajando en las demás secciones del menú.</p></div>
      <div className="management-buttons"><Link className="secondary-button" href={workspacePath(user.role)}>Volver a mi espacio</Link></div>
    </section>
  </div></WorkspaceShell>;
}

/**
 * Guarda de las páginas que dependen de una función: null si está disponible; si no, la página uniforme.
 * Uso en un page.tsx: `const noDisponible = exigirFuncion('X', user, '/ruta'); if (noDisponible) return noDisponible;`
 */
export function exigirFuncion(clave: ClaveFuncion, user: CurrentUser, activePath: string): ReactElement | null {
  if (funcionDisponible(clave)) return null;
  return <NoDisponible user={user} activePath={activePath} etiqueta={FUNCIONES[clave].etiqueta} />;
}
