import Link from 'next/link';
import { groupProcessesByInstitution } from '@/modules/processes/attorney-institutions';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function ProcessesPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const institutions = groupProcessesByInstitution(listProcessesFor(user));

  return <WorkspaceShell user={user} activePath="/dashboard/admin/processes"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Registro contractual global</p><h1>Procesos por Institución Educativa</h1><p>Seleccione una Institución Educativa para consultar sus procesos de contratación.</p></div></header>
    <section className="process-directory institution-process-directory" aria-labelledby="admin-institutions-processes-title"><div className="directory-heading"><div><p className="section-kicker">Instituciones con procesos</p><h2 id="admin-institutions-processes-title">Consulte los procesos de cada Institución Educativa</h2></div><span>{institutions.length} {institutions.length === 1 ? 'institución' : 'instituciones'}</span></div>{institutions.length ? <div className="assigned-institution-grid">{institutions.map((institution) => <Link className="assigned-institution-card" href={`/dashboard/admin/institutions/${encodeURIComponent(institution.id)}`} key={institution.id}><header><span className="assigned-institution-icon" aria-hidden="true">⌂</span><div><p>Institución Educativa</p><h3>{institution.name}</h3><span>{institution.processes.length} {institution.processes.length === 1 ? 'proceso registrado' : 'procesos registrados'}</span></div></header><footer><span>Consultar procesos de contratación</span><b aria-hidden="true">→</b></footer></Link>)}</div> : <div className="empty-state"><strong>No hay procesos de contratación registrados.</strong></div>}</section>
  </div></WorkspaceShell>;
}
