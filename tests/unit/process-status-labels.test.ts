import { describe, expect, it } from 'vitest';
import { phaseLabel } from '../../src/app/dashboard/_components/process-status';

describe('etiquetas de etapa', () => {
  it('traduce también el alcance de bloqueo que usa Supabase', () => {
    expect(phaseLabel('MERCADO')).toBe('Etapa de mercado');
    expect(phaseLabel('MARKET')).toBe('Etapa de mercado');
    expect(phaseLabel('OTRA')).toBe('OTRA');
  });
});
