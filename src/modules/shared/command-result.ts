export type SafeErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'INTERNAL_ERROR';

export type CommandResult<T> = { ok: true; data: T } | { ok: false; error: { code: SafeErrorCode; message: string } };

export const success = <T>(data: T): CommandResult<T> => ({ ok: true, data });
export const failure = <T = never>(code: SafeErrorCode, message: string): CommandResult<T> => ({ ok: false, error: { code, message } });
