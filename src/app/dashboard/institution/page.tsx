import { listProcessesFor } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { InstitutionWorkspace } from './institution-workspace';
import { listInAppNotifications } from '@/modules/processes/in-app-notifications';

export default async function InstitutionPage() {
  const user = await requireWorkspaceUser(['IE_RECTOR', 'IE_SUPPORT']);
  const notifications = listInAppNotifications(user.id);
  return <WorkspaceShell user={user} activePath="/dashboard/institution"><InstitutionWorkspace processes={await listProcessesFor(user)} notifications={notifications} canOpen /></WorkspaceShell>;
}
