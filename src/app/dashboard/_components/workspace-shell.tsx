import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@/platform/auth/current-user';
import { LogoutButton } from './logout-button';
import { BackButton } from './back-button';
import { SidebarMenu } from './sidebar-menu';
import { PushNotificationControl } from './push-notification-control';

const roleLabels: Record<CurrentUser['role'], string> = {
  ARKA_ADMIN: 'Administrador',
  ARKA_ATTORNEY: 'Abogado Arka',
  IE_RECTOR: 'Rector / ordenador del gasto',
  IE_SUPPORT: 'Funcionario autorizado de la IE',
  IE_COMMITTEE: 'Comité de evaluación',
};

export type NavigationItem = { href: string; label: string; icon: string; section?: string };

function navFor(user: CurrentUser): NavigationItem[] {
  if (user.role === 'ARKA_ADMIN') return [
    { href: '/dashboard/admin', label: 'Bandeja de trabajo', icon: '▦', section: 'OPERACIÓN CONTRACTUAL' },
    { href: '/dashboard/admin/processes', label: 'Procesos por IE', icon: '□' },
    { href: '/dashboard/admin/assignments', label: 'Asignar responsable jurídico', icon: '+' },
    { href: '/dashboard/admin/alerts', label: 'Alertas y bloqueos', icon: '!' },
    { href: '/dashboard/admin/institutions', label: 'Instituciones Educativas', icon: '⌂', section: 'ADMINISTRACIÓN ARKA' },
    { href: '/dashboard/admin/institutions/new', label: 'Registrar Institución Educativa', icon: '+' },
    { href: '/dashboard/admin/lawyers', label: 'Equipo jurídico', icon: '◌' },
    { href: '/dashboard/admin/lawyers/new', label: 'Registrar abogado Arka', icon: '+' },
    { href: '/dashboard/admin/users', label: 'Usuarios y accesos', icon: '◉' },
    { href: '/dashboard/admin/audit', label: 'Registro de actuaciones', icon: '≡' },
  ];
  if (user.role === 'ARKA_ATTORNEY') return [{ href: '/dashboard/attorney', label: 'Instituciones asignadas', icon: '▦' }];
  if (user.role === 'IE_COMMITTEE') return [];
  return [{ href: '/dashboard/institution', label: 'Procesos', icon: '▦' }, { href: '/dashboard/institution#opening', label: 'Nuevo proceso', icon: '+' }, { href: '/dashboard/regulations', label: 'Manual de contratación IE', icon: '≡' }];
}

export function WorkspaceShell({ user, children, activePath }: { user: CurrentUser; children: ReactNode; activePath: string }) {
  return <main className="workspace">
    <aside className="workspace-sidebar" aria-label="Navegación principal">
      <Link className="wordmark app-wordmark" href="/dashboard"><span className="workspace-seal" aria-hidden="true">L</span><span className="brand-lockup"><span className="brand-title">LEXCON <strong>IAG</strong></span><small>Contratación FSE</small></span></Link>
      <p className="sidebar-context">Contratación FSE · entorno de contratación</p>
      <section className="iag-presence" aria-label="Estado del agente IAG"><span className="iag-orbit" aria-hidden="true"><i /></span><div><small>AGENTE IAG</small><strong>Análisis y trazabilidad activos</strong><span>Las decisiones siguen siendo humanas.</span></div></section>
      {user.role === 'ARKA_ADMIN' && activePath !== '/dashboard/admin' && <BackButton />}
      <SidebarMenu items={navFor(user)} activePath={activePath} />
      <div className="workspace-integrity"><span aria-hidden="true">✓</span><div><strong>Acceso protegido</strong><small>Las actuaciones quedan trazables.</small></div></div>
      <div className="sidebar-user">
        <span className="identity-mark" aria-hidden="true">{user.name.slice(0, 1)}</span>
        <div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small>{user.institutionName && <small>{user.institutionName}</small>}</div>
      </div>
    </aside>
    <section className="workspace-main"><header className="workspace-topbar"><div className="topbar-role"><span className="topbar-beacon" aria-hidden="true" /><span>{roleLabels[user.role]}</span><small>Centro de operaciones</small></div><div className="topbar-actions"><div className="topbar-agent"><i aria-hidden="true" /><span>Agente IAG en línea</span></div><span className="topbar-secure"><i aria-hidden="true" /><small>Entorno protegido</small></span><PushNotificationControl /><LogoutButton className="topbar-logout" /></div></header><section className="workspace-content">{children}</section></section>
  </main>;
}
