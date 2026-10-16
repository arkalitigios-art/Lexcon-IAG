import { listarInstituciones } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { InstitutionDirectory } from '../institution-directory';

export default async function InstitutionsPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const instituciones = await listarInstituciones(puertoInstituciones(), user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de servicio</p><h1>Instituciones Educativas</h1><p>Consulte cada Institución Educativa contratante y abra su ficha de servicio.</p></div></header><InstitutionDirectory institutions={instituciones} /></div></WorkspaceShell>;
}
