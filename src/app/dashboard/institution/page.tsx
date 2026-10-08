import { listProcessesFor } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { InstitutionWorkspace } from './institution-workspace';
import { getSqlite } from '@/platform/database/client';

export default async function InstitutionPage() {
  const user = await requireWorkspaceUser(['IE_RECTOR', 'IE_SUPPORT']);
  const notifications = getSqlite().prepare(`SELECT id, process_id AS processId, body, created_at AS createdAt
    FROM alerts WHERE user_id = ? AND channel = 'IN_APP' AND status = 'OPEN' ORDER BY created_at DESC LIMIT 6`).all(user.id) as Array<{ id: string; processId: string | null; body: string; createdAt: string }>;
  return <WorkspaceShell user={user} activePath="/dashboard/institution"><InstitutionWorkspace processes={listProcessesFor(user)} notifications={notifications} canOpen /></WorkspaceShell>;
}
