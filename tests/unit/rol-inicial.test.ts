import { describe, expect, it } from 'vitest';
import { rolInicialDesdeConsulta } from '../../src/modules/access/supabase-user-administration';

describe('rol preseleccionado en Usuarios y accesos', () => {
  it.each<[unknown, string]>([
    ['RECTOR_IE', 'RECTOR_IE'],
    ['ABOGADO_ARKA', 'ABOGADO_ARKA'],
    ['COMITE_EVALUADOR', 'ABOGADO_ARKA'],
    [['RECTOR_IE'], 'ABOGADO_ARKA'],
    [undefined, 'ABOGADO_ARKA'],
  ])('%o → %s', (valor, esperado) => {
    expect(rolInicialDesdeConsulta(valor)).toBe(esperado);
  });
});
