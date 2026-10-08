import { listManagedAttorneys } from '@/modules/admin/service-administration';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { AttorneyManagement } from '../attorney-management';

export default async function LawyersPage() { const user = await requireWorkspaceUser(['ARKA_ADMIN']); return <WorkspaceShell user={user} activePath="/dashboard/admin/lawyers"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de equipo</p><h1>Equipo jurídico</h1><p>Consulte las personas disponibles, gestione sus cuentas y cree un nuevo abogado desde una ruta propia.</p></div></header><AttorneyManagement attorneys={listManagedAttorneys()} /></div></WorkspaceShell>; }
