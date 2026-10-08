import { describe, expect, it } from 'vitest';
import { calculateArithmeticMeanUnitValue, extractQuoteItemsFromText } from '../../src/modules/automation/iag-drafts';

describe('lector local de cotizaciones', () => {
  it('identifica campos rotulados y normaliza valores colombianos sin decidir una contratación', () => {
    const result = extractQuoteItemsFromText(`
      Proveedor: Papelería Ejemplo S.A.S.
      Descripción: Resma de papel carta
      Cantidad: 2
      Valor unitario: $12.500,00 COP
      Valor total: $25.000,00 COP
    `);
    expect(result.supplierName).toBe('Papelería Ejemplo S.A.S.');
    expect(result.items).toEqual([{
      description: 'Resma de papel carta',
      normalizedDescription: 'resma de papel carta',
      quantity: '2',
      unitValue: '12500.00',
      totalValue: '25000.00',
      taxRate: null,
      taxTreatment: 'UNVERIFIED',
    }]);
  });

  it('marca como incompleto un ítem sin valor en vez de inventarlo', () => {
    const result = extractQuoteItemsFromText('Descripción: Servicio de mantenimiento\nCantidad: 1');
    expect(result.items).toHaveLength(0);
    expect(result.issues[0]).toContain('No se identificó un valor verificable');
  });

  it('conserva columnas separadas al leer una tabla textual', () => {
    const result = extractQuoteItemsFromText('Toner láser  3  $45.000,00  $135.000,00');
    expect(result.items[0]).toMatchObject({ description: 'Toner láser', quantity: '3', unitValue: '45000.00', totalValue: '135000.00' });
  });

  it('reconstruye filas partidas por el salto de línea habitual en un PDF de cotización', () => {
    const result = extractQuoteItemsFromText(`
      Papelería Ejemplo S.A.S.
      NIT: 900.000.000-1
      # Descripción Cant. Unidad Vr. Unitario IVA Vr. Total
      (incl. IVA)
      1 Resma de papel bond tamaño carta, 75
      gramos 50 Resma $ 14.500 19% $ 862.750
      2 Grapadora industrial de brazo largo 5 Unidad $ 28.000 19% $ 166.600
      Subtotal (antes de IVA) $ 800.000
    `);
    expect(result.supplierName).toBe('Papelería Ejemplo S.A.S.');
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: 'Resma de papel bond tamaño carta, 75 gramos', quantity: '50', unitValue: '14500.00', totalValue: '862750.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }),
      expect.objectContaining({ description: 'Grapadora industrial de brazo largo', quantity: '5', unitValue: '28000.00', totalValue: '166600.00', taxRate: '19%', taxTreatment: 'INCLUDED_IN_REPORTED_TOTAL' }),
    ]));
  });

  it('conserva la tarifa cuando la fuente informa expresamente que el IVA está excluido', () => {
    const result = extractQuoteItemsFromText(`
      Descripción: Libro de actas
      Cantidad: 5
      Valor unitario: $38.000
      IVA: 19% excluido
      Valor total: $190.000
    `);
    expect(result.items).toEqual([expect.objectContaining({
      taxRate: '19% excluido',
      taxTreatment: 'EXCLUDED_FROM_REPORTED_TOTAL',
    })]);
  });

  it('calcula el promedio aritmético simple de valores unitarios comparables y redondea al peso', () => {
    expect(calculateArithmeticMeanUnitValue(['28000.00', '26500.00', '27200.00'])).toBe('$27.233,00 COP');
    expect(calculateArithmeticMeanUnitValue(['19500.00', '18200.00', '19000.00'])).toBe('$18.900,00 COP');
  });
});
