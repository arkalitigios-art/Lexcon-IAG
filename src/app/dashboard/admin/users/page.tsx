import { listarInstitucionesParaAcceso, listarUsuariosAdministrados } from '@/modules/access/supabase-user-administration';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { UserAccessManagement } from '../user-access-management';

export default async function UsersPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const [usuarios, instituciones] = await Promise.all([listarUsuariosAdministrados(user), listarInstitucionesParaAcceso(user)]);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/users"><div className="page-stack admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de acceso</p><h1>Usuarios y accesos</h1><p>Invite a las personas que necesitan entrar a LEXCON. Cada una define su propia contraseña mediante un enlace enviado a su correo.</p></div></header><UserAccessManagement usuarios={usuarios} instituciones={instituciones} /></div></WorkspaceShell>;
}
