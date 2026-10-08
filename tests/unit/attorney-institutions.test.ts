import { describe, expect, it } from 'vitest';
import { groupProcessesByInstitution } from '@/modules/processes/attorney-institutions';
import type { ProcessSummary } from '@/modules/processes/process-queries';

function process(id: string, institutionId: string, institutionName: string): ProcessSummary {
  return { id, institutionId, institutionSequence: 1, phase: 'MARKET', status: 'PENDING_ACTION', createdAt: '2026-10-06T12:00:00.000Z', institutionName, attorneyName: 'Abogada Arka', objectDescription: null };
}

describe('groupProcessesByInstitution', () => {
  it('groups already-authorized processes by institution and orders the cards by name', () => {
    const institutions = groupProcessesByInstitution([
      process('two', 'horizonte', 'IE Horizonte'),
      process('one', 'amanecer', 'IE Amanecer'),
      process('three', 'horizonte', 'IE Horizonte'),
    ]);

    expect(institutions.map((institution) => institution.name)).toEqual(['IE Amanecer', 'IE Horizonte']);
    expect(institutions[1].processes.map((item) => item.id)).toEqual(['two', 'three']);
  });
});
