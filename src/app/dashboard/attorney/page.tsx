import Link from 'next/link';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { groupAttorneyInstitutions } from '@/modules/processes/attorney-institutions';
import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { getSqlite } from '@/platform/database/client';

export default async function AttorneyPage() {
  const user = await requireWorkspaceUser(['ARKA_ATTORNEY']);
  const processes = listProcessesFor(user);
  const institutions = groupAttorneyInstitutions(processes);
  const notifications = getSqlite().prepare("SELECT id, process_id AS processId, body, created_at AS createdAt FROM alerts WHERE user_id = ? AND channel = 'IN_APP' AND status = 'OPEN' ORDER BY created_at DESC LIMIT 6").all(user.id) as Array<{ id: string; processId: string; body: string; createdAt: string }>;

  return <WorkspaceShell user={user} activePath="/dashboard/attorney"><div className="page-stack attorney-workspace">
    <header className="page-heading"><p className="section-kicker">Acompañamiento jurídico</p><h1>Instituciones educativas asignadas</h1><p>Seleccione una Institución Educativa para consultar sus procesos de contratación abiertos o cerrados.</p></header>
    {notifications.length > 0 && <section className="attorney-notifications"><div className="section-heading"><div><p className="section-kicker">Notificaciones IAG</p><h2>Borradores listos para revisión</h2></div><span>{notifications.length} pendientes</span></div>{notifications.map((notification) => <Link href={`/dashboard/processes/${notification.processId}`} key={notification.id}><span aria-hidden="true">✦</span><div><strong>{notification.body.replace(/expediente/gi, 'proceso')}</strong><small>{new Date(notification.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><b aria-hidden="true">→</b></Link>)}</section>}
    <section className="assigned-institutions" aria-labelledby="assigned-institutions-title"><div className="section-heading"><div><p className="section-kicker">Asignaciones vigentes</p><h2 id="assigned-institutions-title">Instituciones educativas asignadas</h2></div><span>{institutions.length} {institutions.length === 1 ? 'institución' : 'instituciones'}</span></div>
      {institutions.length ? <div className="assigned-institution-grid">{institutions.map((institution) => <Link className="assigned-institution-card" href={`/dashboard/attorney/institutions/${encodeURIComponent(institution.id)}`} key={institution.id}><header><span className="assigned-institution-icon" aria-hidden="true">⌂</span><div><p>Institución Educativa</p><h3>{institution.name}</h3><span>{institution.processes.length} {institution.processes.length === 1 ? 'proceso asignado' : 'procesos asignados'}</span></div></header><footer><span>Ver procesos de contratación</span><b aria-hidden="true">→</b></footer></Link>)}</div> : <div className="empty-state"><strong>No tienes Instituciones Educativas asignadas.</strong><p>Las asignaciones jurídicas aparecerán aquí cuando Administración Arka vincule procesos de una IE a tu cuenta.</p></div>}
    </section>
  </div></WorkspaceShell>;
}
