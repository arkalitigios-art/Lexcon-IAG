import { listAvailableAttorneys } from '@/modules/assignments/attorney-assignment';
import { listUnassignedProcesses } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { AdminAssignment } from '../admin-assignment';

export default async function AssignmentsPage() { const user = await requireWorkspaceUser(['ARKA_ADMIN']); const processes = listUnassignedProcesses(); return <WorkspaceShell user={user} activePath="/dashboard/admin/assignments"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Control jurídico</p><h1>Asignaciones jurídicas</h1><p>Seleccione el proceso de contratación y el abogado responsable. La asignación queda registrada en la trazabilidad.</p></div></header><section className="surface assignment-surface"><div className="section-heading"><div><p className="section-kicker">Procesos sin responsable</p><h2>Asignar abogado</h2></div><span>{processes.length} pendientes</span></div><AdminAssignment processes={processes} attorneys={listAvailableAttorneys()} /></section></div></WorkspaceShell>; }
