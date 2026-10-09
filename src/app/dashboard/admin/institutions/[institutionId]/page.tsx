import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getManagedInstitution } from '@/modules/admin/service-administration';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { processConsecutive, processContractType } from '@/modules/processes/process-presentation';
import { WorkspaceShell } from '../../../_components/workspace-shell';
import { phaseLabel, ProcessStatus } from '../../../_components/process-status';
import { requireWorkspaceUser } from '../../../require-workspace-user';

const status: Record<string, string> = { ACTIVE: 'Servicio activo', SUSPENDED_ARREARS: 'Suspendida por mora', ENDED: 'Servicio finalizado' };
export default async function InstitutionDetailPage({ params }: { params: Promise<{ institutionId: string }> }) {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const institution = getManagedInstitution((await params).institutionId);
  if (!institution) notFound();
  const processes = (await listProcessesFor(user)).filter((process) => process.institutionId === institution.id);

  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Ficha de Institución Educativa</p><h1>{institution.name}</h1><p>Información de servicio y procesos de contratación de la Institución Educativa.</p></div></header>
    <section className="institution-detail"><div className="detail-status"><span className={`service-state ${institution.serviceStatus.toLowerCase()}`}>{status[institution.serviceStatus]}</span><strong>{institution.active ? 'Acceso institucional habilitado' : 'Acceso institucional no habilitado'}</strong><small>{institution.serviceNote ?? 'Sin observación administrativa registrada.'}</small></div><div className="detail-count"><strong>{institution.users}</strong><span>Usuarios institucionales activos</span></div><div className="detail-count"><strong>{institution.processes}</strong><span>Procesos registrados</span></div><Link className="detail-back" href="/dashboard/admin/processes">← Procesos por Institución Educativa</Link></section>
    <section className="attorney-process-directory admin-institution-processes" aria-labelledby="institution-processes-title"><div className="section-heading"><div><p className="section-kicker">Procesos de contratación</p><h2 id="institution-processes-title">Procesos de {institution.name}</h2></div><span>{processes.length} {processes.length === 1 ? 'proceso' : 'procesos'}</span></div>{processes.length ? <ul>{processes.map((process) => <li key={process.id}><Link href={`/dashboard/processes/${process.id}`}><span className="attorney-process-icon" aria-hidden="true">▤</span><div className="process-identity"><strong>Proceso No. {processConsecutive(process)}</strong><span>{processContractType(process.objectDescription)}</span><small>{phaseLabel(process.phase)} · Creado el {new Date(process.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small></div><ProcessStatus status={process.status} /><b aria-hidden="true">→</b></Link></li>)}</ul> : <div className="empty-state"><strong>Esta Institución Educativa no tiene procesos registrados.</strong></div>}</section>
  </div></WorkspaceShell>;
}
