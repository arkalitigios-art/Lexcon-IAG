import { describe, expect, it } from 'vitest';
import { calcularSegmentos } from '../../src/modules/admin/donut-segments';
import { esBloqueado, resumirBandeja } from '../../src/modules/admin/inbox-summary';

const procesos = [
  { institutionName: 'IE Horizonte', attorneyName: null, status: 'BLOCKED_REGULATION' },
  { institutionName: 'IE Horizonte', attorneyName: 'Abogada', status: 'BLOCKED_MARKET_DATA' },
  { institutionName: 'IE Horizonte', attorneyName: 'Abogada', status: 'PENDING_ACTION' },
  { institutionName: 'IE Amanecer', attorneyName: 'Abogada', status: 'COMPLETED' },
];

describe('resumen de la bandeja', () => {
  it('cuenta procesos, instituciones, sin responsable y bloqueados', () => {
    expect(resumirBandeja(procesos)).toMatchObject({ total: 4, instituciones: 2, sinResponsable: 1, conResponsable: 3, bloqueados: 2 });
  });
  it('ordena las instituciones por cantidad y nombre', () => expect(resumirBandeja(procesos).porInstitucion).toEqual([{ nombre: 'IE Horizonte', total: 3 }, { nombre: 'IE Amanecer', total: 1 }]));
  it('funciona sin procesos', () => expect(resumirBandeja([])).toEqual({ total: 0, instituciones: 0, sinResponsable: 0, conResponsable: 0, bloqueados: 0, porInstitucion: [] }));
  it('reconoce estados bloqueados', () => { expect(esBloqueado('BLOCKED_REGULATION')).toBe(true); expect(esBloqueado('PENDING_ACTION')).toBe(false); });
});

describe('segmentos de dona', () => {
  it('reparte el trazo y acumula el desplazamiento', () => expect(calcularSegmentos([3, 1])).toEqual([{ valor: 3, longitud: 75, desplazamiento: 0 }, { valor: 1, longitud: 25, desplazamiento: -75 }]));
  it('conserva segmentos vacíos', () => expect(calcularSegmentos([0, 0])).toEqual([{ valor: 0, longitud: 0, desplazamiento: 0 }, { valor: 0, longitud: 0, desplazamiento: 0 }]));
  it('ignora valores negativos', () => expect(calcularSegmentos([-5, 5])[1].longitud).toBe(100));
});
