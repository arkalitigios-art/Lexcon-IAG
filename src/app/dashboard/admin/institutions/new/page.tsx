import { WorkspaceShell } from '../../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { InstitutionManagement } from '../../institution-management';

export default async function NewInstitutionPage() { const user = await requireWorkspaceUser(['ARKA_ADMIN']); return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions/new"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de servicio</p><h1>Registrar Institución Educativa</h1><p>Registre la IE contratante, su relación de servicio y el estado inicial.</p></div></header><InstitutionManagement institutions={[]} createOnly /></div></WorkspaceShell>; }
