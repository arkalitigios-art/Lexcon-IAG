import { describe, expect, it } from 'vitest';
import { extractOffer } from '../../src/modules/automation/evaluation-act-docx';

const offerPdfText = `
PROPUESTA No. 1
Información del proponente Dato
Nombre o razón social DISTRIBUCIONES DE PRUEBA S.A.S.
NIT o documento 900.000.001-1
Representante legal Juliana Cardona
Vigencia de la oferta 60 días calendario
Plazo y lugar de entrega 3 días hábiles en la sede de la IE
Yo, Juliana Cardona, identificado(a) con cédula, actuando en calidad de representante legal de DISTRIBUCIONES DE PRUEBA S.A.S., presento oferta.
Carta de presentación de la oferta
Documento de identidad
Certificado de existencia y representación legal
Registro Único Tributario (RUT)
Declaración de inhabilidades e incompatibilidades
Certificación de aportes a seguridad social
Compromiso de transparencia
Oferta económica
Ítem Descripción Cant. Valor unitario antes de IVA IVA 19 % Valor total
1 Caja de marcadores borrables x 12 unidades 10 $ 29.500 $ 56.050 $ 351.050
2 Resma de papel bond tamaño carta 75 gramos 50 $ 13.500 $ 128.250 $ 803.250
Subtotal antes de IVA $ 970.000
IVA total $ 184.300
TOTAL OFERTA $ 1.154.300`;

describe('lectura de ofertas en PDF', () => {
  it('extrae la identificación, los anexos y los valores de la propuesta completa', () => {
    const offer = extractOffer(offerPdfText, 'Propuesta.pdf');
    expect(offer.supplier).toBe('DISTRIBUCIONES DE PRUEBA S.A.S.');
    expect(offer.taxId).toBe('900.000.001-1');
    expect(offer.representative).toBe('Juliana Cardona');
    expect(offer.total).toBe(1154300);
    expect(offer.subtotal).toBe(970000);
    expect(offer.ivaTotal).toBe(184300);
    expect(offer.items).toHaveLength(2);
    expect(offer.legalDocuments).toEqual(expect.arrayContaining(['Carta de presentación', 'RUT', 'Seguridad social', 'Transparencia']));
  });
});
