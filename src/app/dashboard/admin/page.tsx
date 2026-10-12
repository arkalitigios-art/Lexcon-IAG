import Link from 'next/link';
import { resumirBandeja } from '@/modules/admin/inbox-summary';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../_components/workspace-shell';
import { phaseLabel, ProcessStatus } from '../_components/process-status';
import { BarList } from '../_components/bar-list';
import { Donut } from '../_components/donut';
import { Icon } from '../_components/icons';
import { KpiCard } from '../_components/kpi-card';
import { requireWorkspaceUser } from '../require-workspace-user';

export default async function AdminPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const processes = await listProcessesFor(user);
  const resumen = resumirBandeja(processes);
  const workQueue = processes.filter((process) => !process.attorneyName || process.status === 'BLOCKED_REGULATION' || process.status === 'BLOCKED_MARKET_DATA');

  return <WorkspaceShell user={user} activePath="/dashboard/admin"><div className="page-stack inbox">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Gestión documental</p><h1>Bandeja de trabajo</h1><p>Solo aparecen los procesos que requieren una actuación administrativa o jurídica. El registro completo está en Todos los procesos.</p></div><Link className="primary-button" href="/dashboard/admin/processes">Ver todos los procesos <span aria-hidden="true">→</span></Link></header>
    <section className="kpi-grid" aria-label="Indicadores">
      <KpiCard tono="green" icono={<Icon name="folder" />} valor={resumen.total} etiqueta="Procesos registrados" />
      <KpiCard tono="blue" icono={<Icon name="school" />} valor={resumen.instituciones} etiqueta="Instituciones con procesos" />
      <KpiCard tono="amber" icono={<Icon name="assign" />} valor={resumen.sinResponsable} etiqueta="Sin responsable jurídico" href="/dashboard/admin/assignments" accion="Gestionar" />
      <KpiCard tono="rose" icono={<Icon name="block" />} valor={resumen.bloqueados} etiqueta="Actuaciones bloqueadas" href="/dashboard/admin/alerts" accion="Ver alertas" />
    </section>
    <section className="inbox-board">
      <div className="surface inbox-bars"><div className="section-heading"><h2>Procesos por Institución Educativa</h2><span>{resumen.instituciones} {resumen.instituciones === 1 ? 'institución' : 'instituciones'}</span></div><BarList elementos={resumen.porInstitucion.map((item) => ({ etiqueta: item.nombre, valor: item.total }))} vacio="Aún no hay procesos registrados." /></div>
      <div className="surface inbox-donut"><div className="section-heading"><h2>Responsable jurídico</h2></div><Donut etiquetaTotal="procesos" partes={[{ etiqueta: 'Asignado', valor: resumen.conResponsable, tono: 'green' }, { etiqueta: 'Sin asignar', valor: resumen.sinResponsable, tono: 'amber' }]} /></div>
    </section>
    <section className="surface work-queue"><div className="section-heading"><div><p className="section-kicker">Pendientes de atención</p><h2>Procesos que requieren intervención</h2></div><span>{workQueue.length} {workQueue.length === 1 ? 'pendiente' : 'pendientes'}</span></div>
      {workQueue.length ? <div className="work-queue-list">{workQueue.map((process) => <Link className="work-item" href={`/dashboard/processes/${process.id}`} key={process.id}><span className="work-item-signal" aria-hidden="true"><Icon name="block" /></span><div className="work-item-main"><small>Proceso de contratación · {phaseLabel(process.phase)}</small><strong>{process.institutionName}</strong><span>{process.attorneyName ? `Responsable jurídico: ${process.attorneyName}` : 'Requiere asignar responsable jurídico'}</span></div><div className="work-item-status"><ProcessStatus status={process.status} /><small>Abierto el {new Date(process.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div><span className="work-item-open">Ver proceso <b aria-hidden="true">→</b></span></Link>)}</div> : <div className="dossier-empty"><strong>No hay procesos pendientes de atención.</strong><p>Los procesos registrados siguen disponibles en Todos los procesos.</p></div>}
    </section>
    <section className="dossier-footer-nav"><Link href="/dashboard/admin/institutions"><span aria-hidden="true">⌂</span><div><strong>Instituciones Educativas</strong><small>Relación de servicio, estado y responsables institucionales.</small></div><b aria-hidden="true">→</b></Link><Link href="/dashboard/admin/lawyers"><span aria-hidden="true">◌</span><div><strong>Equipo jurídico Lexcon</strong><small>Abogados disponibles y sus asignaciones vigentes.</small></div><b aria-hidden="true">→</b></Link><Link href="/dashboard/admin/audit"><span aria-hidden="true">≡</span><div><strong>Registro de actuaciones</strong><small>Trazabilidad de aperturas, asignaciones y cambios administrativos.</small></div><b aria-hidden="true">→</b></Link></section>
  </div></WorkspaceShell>;
}
