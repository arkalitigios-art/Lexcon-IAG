import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { getInstitutionRegulation } from '@/modules/regulations/institution-regulation';
import { RegulationForm } from './regulation-form';

export default async function RegulationsPage() {
  const user = await requireWorkspaceUser(['IE_RECTOR', 'IE_SUPPORT']);
  return <WorkspaceShell user={user} activePath="/dashboard/regulations"><div className="page-stack app-page-stack"><header className="page-heading app-page-heading"><div><p className="section-kicker">Gobierno institucional</p><h1>Reglamento de contratación</h1><p>Conserve la versión aprobada que da contexto a los nuevos expedientes de la Institución Educativa.</p></div></header><RegulationForm regulation={getInstitutionRegulation(user)} canManage /></div></WorkspaceShell>;
}
