import { redirect } from 'next/navigation';
import { currentUser, type CurrentUser } from '@/platform/auth/current-user';
import type { PlatformRole } from '@/modules/access/authorization';

export function workspacePath(role: PlatformRole): string {
  switch (role) {
    case 'ARKA_ADMIN': return '/dashboard/admin';
    case 'ARKA_ATTORNEY': return '/dashboard/attorney';
    case 'IE_RECTOR':
    case 'IE_SUPPORT': return '/dashboard/institution';
    case 'IE_COMMITTEE': return '/dashboard/committee';
  }
}

export async function requireWorkspaceUser(roles?: readonly PlatformRole[]): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (roles && !roles.includes(user.role)) redirect(workspacePath(user.role));
  return user;
}
