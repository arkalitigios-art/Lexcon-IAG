import Link from 'next/link';
import { notFound } from 'next/navigation';
import { groupAttorneyInstitutions } from '@/modules/processes/attorney-institutions';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { processConsecutive, processContractType } from '@/modules/processes/process-presentation';
import { phaseLabel, ProcessStatus } from '../../../_components/process-status';
import { WorkspaceShell } from '../../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../../require-workspace-user';

export default async function AttorneyInstitutionProcessesPage({ params }: { params: Promise<{ institutionId: string }> }) {
  const user = await requireWorkspaceUser(['ARKA_ATTORNEY']);
  const institutionId = (await params).institutionId;
  const institution = groupAttorneyInstitutions(listProcessesFor(user)).find((candidate) => candidate.id === institutionId);
  if (!institution) notFound();

  return <WorkspaceShell user={user} activePath="/dashboard/attorney"><div className="page-stack attorney-workspace">
    <header className="page-heading attorney-institution-heading"><div><p className="section-kicker">Institución Educativa asignada</p><h1>{institution.name}</h1><p>Lista de procesos de contratación asignados para acompañamiento jurídico.</p></div><Link className="page-back-link" href="/dashboard/attorney">← Instituciones educativas</Link></header>
    <section className="attorney-process-directory" aria-labelledby="attorney-processes-title"><div className="section-heading"><div><p className="section-kicker">Procesos de contratación</p><h2 id="attorney-processes-title">Procesos de {institution.name}</h2></div><span>{institution.processes.length} {institution.processes.length === 1 ? 'proceso' : 'procesos'}</span></div><ul>{institution.processes.map((process) => <li key={process.id}><Link href={`/dashboard/processes/${process.id}`}><span className="attorney-process-icon" aria-hidden="true">▤</span><div className="process-identity"><strong>Proceso No. {processConsecutive(process)}</strong><span>{processContractType(process.objectDescription)}</span><small>{phaseLabel(process.phase)} · Creado el {new Date(process.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small></div><ProcessStatus status={process.status} /><b aria-hidden="true">→</b></Link></li>)}</ul></section>
  </div></WorkspaceShell>;
}
