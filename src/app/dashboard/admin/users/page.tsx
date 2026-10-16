import { listarInstitucionesParaAcceso, listarUsuariosAdministrados, rolInicialDesdeConsulta } from '@/modules/access/supabase-user-administration';
import { supabaseConfigurado } from '@/platform/supabase/server';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { UserAccessManagement } from '../user-access-management';

/** Una configuración parcial o no HTTPS lanza; para esta pantalla significa que Supabase no está disponible. */
function configurado(): boolean {
  try { return supabaseConfigurado(); } catch { return false; }
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ [clave: string]: string | string[] | undefined }> }) {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const encabezado = <header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de acceso</p><h1>Usuarios y accesos</h1><p>Invite a las personas que necesitan entrar a LEXCON. Cada una define su propia contraseña mediante un enlace enviado a su correo.</p></div></header>;
  if (!configurado()) {
    return <WorkspaceShell user={user} activePath="/dashboard/admin/users"><div className="page-stack admin-module">{encabezado}<section className="surface"><p>Usuarios y accesos está disponible cuando LEXCON usa el acceso con Supabase. La demostración local usa las cuentas ficticias de la pantalla de acceso.</p></section></div></WorkspaceShell>;
  }
  const rolInicial = rolInicialDesdeConsulta((await searchParams).rol);
  // key={rolInicial}: al pasar de un ?rol= a otro sin recargar, el formulario se vuelve a montar y aplica el rol preseleccionado.
  const [usuarios, instituciones] = await Promise.all([listarUsuariosAdministrados(user), listarInstitucionesParaAcceso(user)]);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/users"><div className="page-stack admin-module">{encabezado}<UserAccessManagement key={rolInicial} usuarios={usuarios} instituciones={instituciones} idActor={user.id} rolInicial={rolInicial} /></div></WorkspaceShell>;
}
