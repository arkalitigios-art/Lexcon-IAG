import { describe, expect, it } from 'vitest';
import { processConsecutive, processContractType } from '../../src/modules/processes/process-presentation';

describe('identificación visible de procesos', () => {
  it('usa el consecutivo independiente de la Institución Educativa', () => {
    expect(processConsecutive({ institutionSequence: 7, createdAt: '2026-10-06T12:00:00.000Z' })).toBe('2026-0007');
  });

  it('presenta el tipo contractual solo cuando puede inferirlo del objeto', () => {
    expect(processContractType('Mantenimiento preventivo de equipos')).toBe('Contrato de mantenimiento');
    expect(processContractType('Prestación de servicios de apoyo')).toBe('Contrato de prestación de servicios');
    expect(processContractType('Adquisición de útiles escolares')).toBe('Contrato de suministro');
    expect(processContractType(null)).toBe('Tipo contractual por definir');
  });
});
