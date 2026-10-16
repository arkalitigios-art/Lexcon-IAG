import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@/platform/auth/current-user';
import { LogoutButton } from './logout-button';
import { BackButton } from './back-button';
import { SidebarMenu } from './sidebar-menu';
import { PushNotificationControl } from './push-notification-control';
import { WorkspaceFrame } from './workspace-frame';
import { navFor } from './navigation';

const roleLabels: Record<CurrentUser['role'], string> = {
  ARKA_ADMIN: 'Administrador',
  ARKA_ATTORNEY: 'Abogado Lexcon',
  IE_RECTOR: 'Rector / ordenador del gasto',
  IE_SUPPORT: 'Funcionario autorizado de la IE',
  IE_COMMITTEE: 'Comité de evaluación',
};

export type { NavigationItem } from './navigation';

export function WorkspaceShell({ user, children, activePath }: { user: CurrentUser; children: ReactNode; activePath: string }) {
  const navItems = navFor(user);
  const sidebar = <>
    <Link className="wordmark app-wordmark" href="/dashboard"><span className="workspace-seal" aria-hidden="true">L</span><span className="brand-lockup"><span className="brand-title">LEXCON <strong>IAG</strong></span><small>Contratación FSE</small></span></Link>
    <section className={navItems.length > 6 ? 'iag-presence iag-presence--long' : 'iag-presence'} aria-label="Estado del agente IAG"><span className="iag-orbit" aria-hidden="true"><i /></span><div><small>AGENTE IAG</small><strong>Análisis y trazabilidad activos</strong><span>Las decisiones siguen siendo humanas.</span></div></section>
    {user.role === 'ARKA_ADMIN' && activePath !== '/dashboard/admin' && <BackButton />}
    <SidebarMenu items={navItems} activePath={activePath} />
    <div className="sidebar-footer">
      <div className="workspace-integrity"><span aria-hidden="true">✓</span><div><strong>Acceso protegido</strong><small>Las actuaciones quedan trazables.</small></div></div>
      <div className="sidebar-user">
        <span className="identity-mark" aria-hidden="true">{user.name.slice(0, 1)}</span>
        <div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small>{user.institutionName && <small>{user.institutionName}</small>}</div>
      </div>
    </div>
  </>;

  const topbar = <>
    <div className="topbar-role"><span className="topbar-beacon" aria-hidden="true" /><span>{roleLabels[user.role]}</span><small>Centro de operaciones</small></div>
    <div className="topbar-actions">
      <div className="topbar-agent"><i aria-hidden="true" /><span>Agente IAG en línea</span></div>
      <span className="topbar-secure"><i aria-hidden="true" /><small>Entorno protegido</small></span>
      <PushNotificationControl />
      <LogoutButton className="topbar-logout" />
    </div>
  </>;

  return <WorkspaceFrame sidebar={sidebar} topbar={topbar} idUsuario={user.id}>{children}</WorkspaceFrame>;
}
