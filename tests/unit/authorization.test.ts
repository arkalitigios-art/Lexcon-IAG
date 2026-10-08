import { describe, expect, it } from 'vitest';
import { canAccessProcess, hasCapability, type AccessContext } from '../../src/modules/access/authorization';
import { openProcess } from '../../src/modules/processes/open-process';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const attorney: AccessContext = { userId: 'lawyer', role: 'ARKA_ATTORNEY', institutionId: null, assignedProcessIds: new Set(['assigned']) };
const rector: AccessContext = { userId: 'rector', role: 'IE_RECTOR', institutionId: 'ie-a', assignedProcessIds: new Set() };
const committee: AccessContext = { userId: 'committee', role: 'IE_COMMITTEE', institutionId: 'ie-a', assignedProcessIds: new Set() };

describe('autorización por ámbito', () => {
  it('impide que un abogado consulte expedientes no asignados', () => {
    expect(canAccessProcess(attorney, 'assigned', 'ie-a')).toBe(true);
    expect(canAccessProcess(attorney, 'other', 'ie-a')).toBe(false);
  });
  it('impide el cruce institucional, reserva la firma para rectoría y no da acceso general al comité', () => {
    expect(canAccessProcess(rector, 'process-a', 'ie-a')).toBe(true);
    expect(canAccessProcess(rector, 'process-b', 'ie-b')).toBe(false);
    expect(canAccessProcess(committee, 'process-a', 'ie-a')).toBe(false);
    expect(hasCapability(rector, 'INSTITUTIONAL_SIGN')).toBe(true);
    expect(hasCapability({ ...rector, role: 'IE_SUPPORT' }, 'INSTITUTIONAL_SIGN')).toBe(false);
    expect(hasCapability(rector, 'PROCESS_OPEN')).toBe(true);
    expect(hasCapability(committee, 'PROCESS_OPEN')).toBe(false);
  });

  it('rechaza una apertura de expediente fuera de los roles institucionales', () => {
    const user: CurrentUser = { id: 'committee', name: 'Comité', role: 'IE_COMMITTEE', institutionId: 'ie-a', institutionName: 'IE A' };
    expect(() => openProcess(user, [{ key: 'file', sha256: 'hash', sizeBytes: 1, originalName: 'cotizacion.pdf', mimeType: 'application/pdf' }])).toThrow('No tienes autorización');
  });
});
