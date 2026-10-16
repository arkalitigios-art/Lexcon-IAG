import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerInstitucion } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { processConsecutive, processContractType } from '@/modules/processes/process-presentation';
import { WorkspaceShell } from '../../../_components/workspace-shell';
import { phaseLabel, ProcessStatus } from '../../../_components/process-status';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { InstitutionManagement } from '../../institution-management';

const status: Record<string, string> = { ACTIVE: 'Servicio activo', SUSPENDED_ARREARS: 'Suspendida por mora', ENDED: 'Servicio finalizado' };

export default async function InstitutionDetailPage({ params }: { params: Promise<{ institutionId: string }> }) {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const institution = await obtenerInstitucion(puertoInstituciones(), user, (await params).institutionId);
  if (!institution) notFound();
  const processes = (await listProcessesFor(user)).filter((process) => process.institutionId === institution.id);
  const ubicacion = institution.departamento ? `${institution.ciudad}, ${institution.departamento}` : institution.ciudad;
  const codigos = [institution.nit ? `NIT ${institution.nit}` : null, institution.codigoDane ? `Código DANE ${institution.codigoDane}` : null].filter((valor): valor is string => valor !== null).join(' · ');

  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Ficha de Institución Educativa</p><h1>{institution.nombre}</h1><p>Información de servicio y procesos de contratación de la Institución Educativa.</p></div></header>
    <section className="institution-detail"><div className="detail-status"><span className={`service-state ${institution.estado.toLowerCase()}`}>{status[institution.estado]}</span><strong>{institution.activa ? 'Acceso institucional habilitado' : 'Acceso institucional no habilitado'}</strong><small>{ubicacion}</small><small>{codigos || 'NIT y código DANE sin registrar.'}</small><small>{institution.observacion ?? 'Sin observación administrativa registrada.'}</small></div><div className="detail-count"><strong>{institution.cuentasActivas}</strong><span>Cuentas activas de la IE</span></div><div className="detail-count"><strong>{institution.procesos}</strong><span>Procesos registrados</span></div><Link className="detail-back" href="/dashboard/admin/processes">← Procesos por Institución Educativa</Link></section>
    <section className="attorney-process-directory admin-institution-processes" aria-labelledby="institution-processes-title"><div className="section-heading"><div><p className="section-kicker">Procesos de contratación</p><h2 id="institution-processes-title">Procesos de {institution.nombre}</h2></div><span>{processes.length} {processes.length === 1 ? 'proceso' : 'procesos'}</span></div>{processes.length ? <ul>{processes.map((process) => <li key={process.id}><Link href={`/dashboard/processes/${process.id}`}><span className="attorney-process-icon" aria-hidden="true">▤</span><div className="process-identity"><strong>Proceso No. {processConsecutive(process)}</strong><span>{processContractType(process.objectDescription)}</span><small>{phaseLabel(process.phase)} · Creado el {new Date(process.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small></div><ProcessStatus status={process.status} /><b aria-hidden="true">→</b></Link></li>)}</ul> : <div className="empty-state"><strong>Esta Institución Educativa no tiene procesos registrados.</strong></div>}</section>
    <InstitutionManagement institucion={institution} />
  </div></WorkspaceShell>;
}
