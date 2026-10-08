export type PlatformRole = 'ARKA_ADMIN' | 'ARKA_ATTORNEY' | 'IE_RECTOR' | 'IE_SUPPORT' | 'IE_COMMITTEE';
export type Capability = 'PROCESS_READ' | 'PROCESS_OPEN' | 'ATTORNEY_ASSIGN' | 'ACCESS_MANAGE' | 'LEGAL_REVIEW' | 'INSTITUTIONAL_SIGN' | 'SECOP_PUBLISH' | 'INSTITUTIONAL_DECIDE';

export interface AccessContext {
  userId: string;
  role: PlatformRole;
  institutionId: string | null;
  assignedProcessIds: ReadonlySet<string>;
}

export function canAccessProcess(context: AccessContext, processId: string, institutionId: string): boolean {
  if (context.role === 'ARKA_ADMIN') return true;
  if (context.role === 'ARKA_ATTORNEY') return context.assignedProcessIds.has(processId);
  if (context.role === 'IE_RECTOR' || context.role === 'IE_SUPPORT') return context.institutionId === institutionId;
  return false;
}

export function hasCapability(context: AccessContext, capability: Capability): boolean {
  const grants: Record<PlatformRole, readonly Capability[]> = {
    ARKA_ADMIN: ['PROCESS_READ', 'ATTORNEY_ASSIGN', 'ACCESS_MANAGE', 'LEGAL_REVIEW'],
    ARKA_ATTORNEY: ['PROCESS_READ', 'LEGAL_REVIEW'],
    IE_RECTOR: ['PROCESS_READ', 'PROCESS_OPEN', 'INSTITUTIONAL_SIGN', 'SECOP_PUBLISH', 'INSTITUTIONAL_DECIDE'],
    IE_SUPPORT: ['PROCESS_READ', 'PROCESS_OPEN'],
    IE_COMMITTEE: [],
  };
  return grants[context.role].includes(capability);
}
