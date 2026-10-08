import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import type { ProcessDetail } from '@/modules/processes/process-queries';
import { createMarketStudyClassifications, createMarketStudyNarrative } from './market-study-narrative';
import { createMarketStudyBudget, taxTreatmentLabel } from './market-study-financials';
import { marketStudyRevisionDirectives } from './market-study-revisions';

const navy = '1F1F1F';
const paleBlue = 'EAF2F8';
const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' };
const tableBorders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function currency(value: string | number | null): string {
  if (value === null) return 'No identificado';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numeric) : String(value);
}

function sourceLabel(source: string, quotations: ProcessDetail['quotations']): string {
  return quotations.find((quote) => quote.originalName === source)?.supplierName ?? source.replace(/\.(pdf|docx)$/i, '').replaceAll('_', ' ');
}

function body(text: string, options: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}): Paragraph {
  return new Paragraph({ alignment: options.alignment ?? AlignmentType.JUSTIFIED, spacing: { after: options.after ?? 110, line: 276 }, children: [new TextRun({ text, font: 'Aptos', size: 24, bold: options.bold })] });
}

function heading(text: string, pageBreakBefore = false): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore, spacing: { before: 190, after: 100 }, keepNext: true, children: [new TextRun({ text, font: 'Aptos Display', color: '000000', size: 28, bold: true })] });
}

function signatureBlock(process: ProcessDetail): Paragraph[] {
  const issuedAt = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });
  const city = process.institutionCity.trim() || 'la ciudad de sede principal de la Institución Educativa';
  return [
    new Paragraph({ spacing: { before: 260, after: 120 }, children: [new TextRun({ text: `Se expide en ${city}, a los ${issuedAt}.`, font: 'Aptos', size: 24 })] }),
    new Paragraph({ spacing: { before: 420, after: 50 }, children: [new TextRun({ text: '________________________________________', font: 'Aptos', size: 24 })] }),
    new Paragraph({ spacing: { after: 35 }, children: [new TextRun({ text: process.responsibleName, font: 'Aptos', size: 24, bold: true })] }),
    new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Rector(a) / Ordenador(a) del gasto', font: 'Aptos', size: 24 })] }),
  ];
}

function cell(text: string, header = false): TableCell {
  return new TableCell({ verticalAlign: VerticalAlign.CENTER, shading: header ? { type: ShadingType.CLEAR, fill: navy, color: 'auto' } : undefined, margins: { top: 115, bottom: 115, left: 120, right: 120 }, children: [new Paragraph({ alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 240 }, children: [new TextRun({ text, font: 'Aptos', size: header ? 19 : 20, bold: header, color: header ? 'FFFFFF' : '000000' })] })] });
}

function informationTable(process: ProcessDetail, regulation: string, objectDescription: string): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: tableBorders, rows: [
    new TableRow({ children: [cell('Institución Educativa', true), cell(process.institutionName)] }),
    new TableRow({ children: [cell('Fase del expediente', true), cell('Estudio de mercado')] }),
    new TableRow({ children: [cell('Ciudad o municipio', true), cell(process.institutionCity.trim() || 'Pendiente de actualización institucional')] }),
    new TableRow({ children: [cell('Fecha de elaboración', true), cell(new Date().toLocaleDateString('es-CO', { dateStyle: 'long' }))] }),
    new TableRow({ children: [cell('Reglamento institucional vinculado', true), cell(regulation)] }),
    new TableRow({ children: [cell('Objeto a contratar', true), cell(objectDescription)] }),
  ] });
}

function institutionHeader(process: ProcessDetail, regulation: string): Paragraph[] {
  const city = process.institutionCity.trim() || 'Ciudad o municipio pendiente de actualización';
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 45 }, children: [new TextRun({ text: process.institutionName.toLocaleUpperCase('es-CO'), font: 'Aptos', size: 25, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 45 }, children: [new TextRun({ text: city, font: 'Aptos', size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 45 }, children: [new TextRun({ text: 'FONDO DE SERVICIOS EDUCATIVOS', font: 'Aptos', size: 19, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 230 }, children: [new TextRun({ text: regulation, font: 'Aptos', size: 17 })] }),
  ];
}

function classificationTable(process: ProcessDetail): Table {
  const classifications = createMarketStudyClassifications(process);
  const rows = [new TableRow({ tableHeader: true, children: [cell('Ítem', true), cell('Descripción del bien o servicio', true), cell('Código UNSPSC', true), cell('Clasificación', true), cell('Unidad de medida', true)] })];
  for (const classification of classifications) rows.push(new TableRow({ children: [cell(String(classification.item)), cell(classification.description), cell(classification.code), cell(classification.classification), cell(classification.unit)] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, columnWidths: [520, 3550, 1350, 2200, 1050], borders: tableBorders, rows });
}


function sourcesTable(process: ProcessDetail): Table {
  const rows = [new TableRow({ tableHeader: true, children: [cell('No.', true), cell('Proveedor', true), cell('Cotización comparada', true), cell('Fecha de recepción', true)] })];
  for (const [index, quote] of process.quotations.entries()) rows.push(new TableRow({ cantSplit: true, children: [cell(String(index + 1)), cell(quote.supplierName ?? 'Proveedor por verificar'), cell(quote.originalName), cell(new Date(quote.createdAt).toLocaleDateString('es-CO'))] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, columnWidths: [650, 2750, 4000, 2100], borders: tableBorders, rows });
}

function marketMatrix(process: ProcessDetail): Table {
  const sources = [...new Set(process.marketStudy.comparisons.flatMap((comparison) => comparison.values.map((value) => value.source)))];
  const headers = ['Ítem', 'Cantidad', ...sources.map((source) => sourceLabel(source, process.quotations)), 'Promedio base sin IVA'];
  const widths = [3000, 700, ...sources.map(() => 1450), 1500];
  const rows = [new TableRow({ tableHeader: true, children: headers.map((title) => cell(title, true)) })];
  for (const comparison of process.marketStudy.comparisons) {
    rows.push(new TableRow({ cantSplit: true, children: [cell(comparison.description), cell(comparison.quantity), ...sources.map((source) => {
      const quote = comparison.values.find((value) => value.source === source);
      const treatment = quote?.taxTreatment === 'INCLUDED_IN_REPORTED_TOTAL' ? 'incluido' : quote?.taxTreatment === 'EXCLUDED_FROM_REPORTED_TOTAL' ? 'sin IVA' : quote?.taxTreatment === 'EXEMPT' ? 'exento' : 'no verificable';
      const totalLabel = quote?.taxTreatment === 'INCLUDED_IN_REPORTED_TOTAL' ? 'Total con IVA' : quote?.taxTreatment === 'EXCLUDED_FROM_REPORTED_TOTAL' ? 'Total sin IVA' : 'Total reportado';
      return cell(quote ? `${currency(quote.unitValue)}\nIVA: ${quote.taxRate ?? 'no identificado'} ${treatment}\n${totalLabel}: ${currency(quote.totalValue)}` : 'No comparable');
    }), cell(currency(comparison.arithmeticMean))] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, columnWidths: widths, borders: tableBorders, rows });
}

function quotationTotalsTable(process: ProcessDetail): Table {
  const sources = [...new Set(process.marketStudy.comparisons.flatMap((comparison) => comparison.values.map((value) => value.source)))];
  const rows = [new TableRow({ tableHeader: true, children: [cell('Cotización', true), cell('IVA identificado', true), cell('Tratamiento en la matriz', true), cell('Total de ítems comparables', true)] })];
  for (const source of sources) {
    const values = process.marketStudy.comparisons.flatMap((comparison) => comparison.values.filter((value) => value.source === source));
    const totals = values.map((value) => Number(value.totalValue)).filter(Number.isFinite);
    const rates = [...new Set(values.map((value) => value.taxRate).filter((value): value is string => Boolean(value)))];
    const treatments = [...new Set(values.map((value) => value.taxTreatment))];
    const tax = rates.length > 1 ? `${rates.join(' y ')} (según ítem)` : rates[0] ?? 'No identificado';
    const treatment = treatments.length > 1 ? 'Varía según los ítems de la matriz.' : treatments[0] ? taxTreatmentLabel(treatments[0]) : 'Sin datos verificables.';
    const total = totals.length ? totals.reduce((sum, value) => sum + value, 0) : null;
    rows.push(new TableRow({ cantSplit: true, children: [cell(sourceLabel(source, process.quotations)), cell(tax), cell(treatment), cell(currency(total))] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, columnWidths: [2800, 1800, 2900, 2500], borders: tableBorders, rows });
}

export async function createMarketStudyDocx(process: ProcessDetail): Promise<Buffer> {
  const regulation = process.marketStudy.regulationVersion
    ? `Versión ${process.marketStudy.regulationVersion}${process.marketStudy.regulationName ? ` - ${process.marketStudy.regulationName}` : ''}`
    : 'No se registró una versión institucional vinculada.';
  const narrative = createMarketStudyNarrative(process);
  const budget = createMarketStudyBudget(process);
  const sources = [...new Set(process.marketStudy.comparisons.flatMap((comparison) => comparison.values.map((value) => value.source)))];
  const revisions = marketStudyRevisionDirectives(process);
  const document = new Document({ creator: process.institutionName, title: 'Estudio de mercado', description: 'Estudio de mercado', sections: [{
    properties: { page: { size: { width: sources.length > 3 ? 15840 : 12240, height: sources.length > 3 ? 12240 : 15840 }, margin: { top: 1000, right: 900, bottom: 900, left: 900, header: 450, footer: 450 } } },
    children: [
      ...institutionHeader(process, regulation),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 130 }, children: [new TextRun({ text: 'ESTUDIO DE MERCADO', font: 'Aptos Display', size: 42, bold: true, color: '000000' })] }),
      heading('1 Identificación del estudio'), informationTable(process, regulation, narrative.objectDescription),
      heading('2 Considerandos y fundamentos jurídicos y normativos'),
      body('Que el artículo 209 de la Constitución Política establece que la función administrativa está al servicio de los intereses generales y se desarrolla con fundamento en los principios de igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad.'),
      body('Que la Ley 715 de 2001 regula los Fondos de Servicios Educativos y su administración, y que el Decreto 1075 de 2015 compila la reglamentación aplicable al manejo de dichos fondos.'),
      body(`Que la Institución Educativa adelanta sus actuaciones conforme al reglamento o manual de contratación institucional vinculado al expediente: ${regulation}.`),
      body('Que, para establecer una referencia económica del proceso, se examinaron las cotizaciones allegadas y se estructuraron los valores unitarios identificables, las cantidades y los ítems comparables.'),
      heading('3 Objeto del estudio'), body(narrative.objectDescription),
      heading('4 Clasificación del bien o servicio'), body('La clasificación se organiza por cada bien o servicio identificado en la matriz comparativa. Los códigos se presentan para la validación institucional dentro del expediente.'), classificationTable(process),
      heading('5 Análisis de oferta y demanda'), body(`Demanda institucional: ${narrative.demandAnalysis}`), body(`Oferta observada: ${narrative.supplyAnalysis}`),
      heading('6 Fuentes documentales examinadas'), body('La Institución Educativa aportó las siguientes cotizaciones. Los originales privados permanecen vinculados al expediente y el estudio solo incorpora los campos estructurados.'), ...(revisions.sourcesAsTable ? [sourcesTable(process)] : process.quotations.map((quote, index) => body(`${index + 1}. ${quote.supplierName ?? 'Proveedor por verificar'} - ${quote.originalName}.`, { alignment: AlignmentType.LEFT, after: 65 }))),
      heading('7 Metodología de comparación'), body('Se comparan los ítems que coinciden en descripción normalizada y cantidad entre dos o más cotizaciones. Para cada grupo comparable se calcula el promedio aritmético simple de los valores unitarios base, sin IVA: sumatoria de los valores unitarios comparables dividida entre el número de cotizaciones comparables. El resultado se redondea al peso colombiano para su presentación. El IVA se presenta por separado únicamente cuando la fuente identifica la tarifa y acredita que el total reportado lo incluye.'),
      heading('8 Matriz comparativa de mercado'), body('Las columnas de cada fuente se presentan en este orden: valor unitario base sin IVA, IVA identificado con su tratamiento y total reportado.'),
      ...(process.marketStudy.comparisons.length ? [marketMatrix(process), body('Resumen de los ítems comparables por cotización', { bold: true, after: 70 }), body('Este resumen suma únicamente los valores que aparecen en la matriz comparativa. Los originales aportados permanecen como evidencia privada del expediente.'), quotationTotalsTable(process)] : [body('No se identificaron grupos de ítems comparables con información suficiente para construir la matriz.')]),
      heading('9 Presupuesto estimado'), body(`El presupuesto base estimado, antes de IVA, derivado de los promedios unitarios comparables es ${currency(budget.baseEstimate)}.`), ...(budget.taxEstimate === null ? [body(budget.taxNote), body(`Base tributaria y condiciones económicas: ${narrative.taxBasis}`)] : [body(`IVA estimado sobre la base comparable: ${currency(budget.taxEstimate)}. Total estimado con IVA: ${currency(budget.totalEstimate)}.`), body(budget.taxNote)]),
      heading('10 Conclusión'), body(`El presente estudio consolida ${process.quotations.length} cotización(es) y ${process.marketStudy.comparisons.length} grupo(s) de ítems comparables. La cifra base estimada es una referencia técnica de mercado y no constituye selección de proveedor ni decisión de contratación.`),
      ...signatureBlock(process),
    ],
  }] });
  return Packer.toBuffer(document);
}
