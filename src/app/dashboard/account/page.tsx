import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { supabaseConfigurado } from '@/platform/supabase/server';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { AccountForms } from './account-forms';

export const dynamic = 'force-dynamic';

/** Una configuración parcial o no HTTPS lanza; para esta pantalla simplemente significa que Supabase no está disponible. */
function configurado(): boolean {
  try { return supabasePublicoConfigurado() && supabaseConfigurado(); } catch { return false; }
}

export default async function AccountPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN', 'ARKA_ATTORNEY', 'IE_RECTOR', 'IE_SUPPORT']);
  let correo = '';
  if (configurado()) {
    const { data: { user: auth } } = await (await crearClienteSupabaseSesion()).auth.getUser();
    correo = auth?.email ?? '';
  }
  return <WorkspaceShell user={user} activePath="/dashboard/account"><div className="page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Mi espacio</p><h1>Mi cuenta</h1><p>Actualice su nombre, su contraseña y el correo con el que inicia sesión.</p></div></header>
    {correo ? <AccountForms nombre={user.name} correo={correo} /> : <section className="surface"><p>Mi cuenta está disponible cuando LEXCON usa el acceso con Supabase.</p></section>}
  </div></WorkspaceShell>;
}
