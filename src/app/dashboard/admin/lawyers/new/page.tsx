import { WorkspaceShell } from '../../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { exigirFuncion } from '../../../_components/no-disponible';
import { AttorneyManagement } from '../../attorney-management';

export default async function NewAttorneyPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']); const noDisponible = exigirFuncion('EQUIPO_JURIDICO', user, '/dashboard/admin/lawyers/new'); if (noDisponible) return noDisponible;
  return <WorkspaceShell user={user} activePath="/dashboard/admin/lawyers/new"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de equipo</p><h1>Registrar abogado Lexcon</h1><p>Registre la cuenta que podrá recibir asignaciones jurídicas.</p></div></header><AttorneyManagement attorneys={[]} createOnly /></div></WorkspaceShell>;
}
