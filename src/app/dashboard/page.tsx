import { redirect } from 'next/navigation';
import { requireWorkspaceUser, workspacePath } from './require-workspace-user';

export default async function DashboardPage() {
  const user = await requireWorkspaceUser();
  redirect(workspacePath(user.role));
}
