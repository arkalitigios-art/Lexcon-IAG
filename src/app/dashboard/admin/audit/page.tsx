import { etiquetaAccion } from '@/modules/admin/audit-labels';
import { getAdminControlCenter } from '@/modules/admin/control-center';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function AuditPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const control = await getAdminControlCenter(user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/audit"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Registro inmutable</p><h1>Trazabilidad</h1><p>Consulte las últimas actuaciones administrativas, institucionales y jurídicas registradas por LEXCON IAG.</p></div></header><section className="audit-directory"><div className="directory-heading"><div><p className="section-kicker">Eventos registrados</p><h2>Historial de actuaciones</h2></div><span>{control.counts.auditEvents} registradas</span></div>{control.events.length ? <ol className="audit-timeline">{control.events.map((event, index) => <li key={`${event.createdAt}-${index}`}><i aria-hidden="true" /><div><strong>{etiquetaAccion(event.action)}</strong><span>{event.actorName}{event.institutionName ? ` · ${event.institutionName}` : ''}</span></div><time>{new Date(event.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })}</time></li>)}</ol> : <div className="empty-state"><strong>Aún no hay actuaciones registradas.</strong></div>}</section></div></WorkspaceShell>;
}
