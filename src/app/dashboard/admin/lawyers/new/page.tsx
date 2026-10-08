import { WorkspaceShell } from '../../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { AttorneyManagement } from '../../attorney-management';

export default async function NewAttorneyPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/lawyers/new"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de equipo</p><h1>Registrar abogado Arka</h1><p>Registre la cuenta que podrá recibir asignaciones jurídicas.</p></div></header><AttorneyManagement attorneys={[]} createOnly /></div></WorkspaceShell>;
}
