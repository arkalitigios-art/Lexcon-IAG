import { getAdminControlCenter } from '@/modules/admin/control-center';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { AdminAccesses } from '../admin-accesses';

export default async function AccessesPage() { const user = await requireWorkspaceUser(['ARKA_ADMIN']); const control = getAdminControlCenter(); return <WorkspaceShell user={user} activePath="/dashboard/admin/accesses"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Control de seguridad</p><h1>Accesos y roles</h1><p>Verifique los perfiles habilitados y active o desactive una membresía ficticia cuando corresponda.</p></div></header><section className="surface admin-list"><div className="section-heading"><div><p className="section-kicker">Perfiles registrados</p><h2>Control de acceso</h2></div><span>{control.counts.activeAccesses} activos</span></div><AdminAccesses accesses={control.accesses} /></section></div></WorkspaceShell>; }
