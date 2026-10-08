import { AlignmentType, BorderStyle, Document, HeightRule, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import type { ProcessDetail } from '@/modules/processes/process-queries';
import { createMarketStudyNarrative } from './market-study-narrative';
import { formatInstitutionProcessConsecutive } from '@/modules/processes/process-consecutive';
import { analyzeEvaluationOffers } from './evaluation-act-docx';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const money = (value: string | number | null | undefined) => value === null || value === undefined ? 'Valor según soporte original' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value));
const body = (text: string, options: { bold?: boolean; center?: boolean; after?: number } = {}) => new Paragraph({ alignment: options.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, spacing: { after: options.after ?? 100, line: 264 }, children: [new TextRun({ text, font: 'Aptos', size: 22, bold: options.bold })] });
const heading = (text: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, keepNext: true, children: [new TextRun({ text, font: 'Aptos Display', size: 28, bold: true, color: '000000' })] });
const documentHeading = (text: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 90 }, keepNext: true, children: [new TextRun({ text, font: 'Aptos Display', size: 32, bold: true, color: '000000' })] });
const numberedConsidering = (number: number, text: string) => body(`${number}. ${text}`);
const cell = (text: string, header = false) => new TableCell({ verticalAlign: VerticalAlign.CENTER, shading: header ? { type: ShadingType.CLEAR, fill: '1F1F1F', color: 'auto' } : undefined, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text, font: 'Aptos', size: header ? 18 : 20, bold: header, color: header ? 'FFFFFF' : '000000' })] })] });
const table = (headers: string[], rows: string[][]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, rows: [new TableRow({ tableHeader: true, children: headers.map((value) => cell(value, true)) }), ...rows.map((row) => new TableRow({ cantSplit: true, children: row.map((value) => cell(value)) }))] });
const contractClause = (name: string, content: string) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 150, after: 100, line: 276 }, keepNext: true, children: [new TextRun({ text: `${name} `, font: 'Aptos', size: 24, bold: true }), new TextRun({ text: content, font: 'Aptos', size: 24 })] });
const contractHeaderCell = (text: string, width: number) => new TableCell({ width: { size: width, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, shading: { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' }, margins: { top: 95, bottom: 95, left: 75, right: 75 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 200 }, children: [new TextRun({ text, font: 'Aptos', size: 18, bold: true, color: '000000' })] })] });
const contractValueCell = (text: string, width: number, center = false) => new TableCell({ width: { size: width, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, margins: { top: 85, bottom: 85, left: 75, right: 75 }, children: [new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 205 }, children: [new TextRun({ text, font: 'Aptos', size: 18 })] })] });
const contractTable = (headers: string[], rows: string[][], widths: number[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, rows: [new TableRow({ tableHeader: true, children: headers.map((value, index) => contractHeaderCell(value, widths[index])) }), ...rows.map((row) => new TableRow({ cantSplit: true, children: row.map((value, index) => contractValueCell(value, widths[index], index !== 1)) }))] });
type SignatureParty = { label: string; name: string; role?: string };
const signatureCell = ({ name, role }: SignatureParty) => new TableCell({ verticalAlign: VerticalAlign.TOP, margins: { top: 130, bottom: 130, left: 120, right: 120 }, children: [
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 35, line: 220 }, children: [new TextRun({ text: name, font: 'Aptos', size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text: role ?? '', font: 'Aptos', size: 20 })] }),
  new Paragraph({ spacing: { after: 0, line: 220 }, children: [new TextRun({ text: ' ', font: 'Aptos', size: 20 })] }),
  new Paragraph({ spacing: { after: 0, line: 220 }, children: [new TextRun({ text: ' ', font: 'Aptos', size: 20 })] }),
  new Paragraph({ spacing: { after: 0, line: 220 }, children: [new TextRun({ text: ' ', font: 'Aptos', size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text: '______________________________', font: 'Aptos', size: 20 })] }),
] });
const signatureTable = (parties: SignatureParty[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, rows: [new TableRow({ tableHeader: true, children: parties.map((party) => cell(party.label, true)) }), new TableRow({ cantSplit: true, height: { value: 1800, rule: HeightRule.ATLEAST }, children: parties.map(signatureCell) })] });
const consecutive = (process: ProcessDetail) => formatInstitutionProcessConsecutive(process.institutionSequence, process.createdAt);
const city = (process: ProcessDetail) => process.institutionCity.trim() || 'la ciudad de sede principal de la Institución Educativa';
const date = () => new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });

export function contractType(process: ProcessDetail): 'CONTRATO DE SUMINISTRO' | 'CONTRATO DE PRESTACIÓN DE SERVICIOS' | 'CONTRATO DE MANTENIMIENTO' {
  const object = `${process.marketStudy.profile.objectDescription} ${process.marketStudy.comparisons.map((item) => item.description).join(' ')}`.toLocaleLowerCase('es-CO');
  if (/mantenimiento|reparaci[oó]n|adecuaci[oó]n/.test(object)) return 'CONTRATO DE MANTENIMIENTO';
  if (/servicio|capacitaci[oó]n|apoyo|consultor[ií]a|software|aseo|transporte/.test(object)) return 'CONTRATO DE PRESTACIÓN DE SERVICIOS';
  return 'CONTRATO DE SUMINISTRO';
}

export function contractNumber(process: ProcessDetail): string {
  const year = new Date(process.createdAt).getFullYear(); const sequence = process.institutionSequence ?? 0;
  return `${String(sequence).padStart(3, '0')} DE ${year}`;
}

export function contractTitle(process: ProcessDetail): string { return `${contractType(process)} No. ${contractNumber(process)}`; }
export function contractFilename(process: ProcessDetail): string { return `${contractType(process).replaceAll(' ', '_')}_${contractNumber(process).replace(' DE ', '_')}.docx`; }

function processDocument(process: ProcessDetail, kind: string): string {
  return process.documents.find((document) => document.kind === kind)?.originalName ?? `Soporte ${kind} no identificado`;
}

function referenceFromName(name: string, prefix: 'CDP' | 'RP'): string {
  const match = name.match(new RegExp(`${prefix}[-_ ]?(?:No\\.?[-_ ]?)?\\d{4}[-_]\\d+`, 'iu'));
  return match?.[0]?.replaceAll('_', '-') ?? name;
}

async function selectedOffer(process: ProcessDetail) {
  const decision = selection(process); const analysis = await analyzeEvaluationOffers(process);
  return analysis.evaluations.find((evaluation) => evaluation.offer.supplier.trim().toLocaleLowerCase('es-CO') === decision.selectedSupplier.trim().toLocaleLowerCase('es-CO'))?.offer ?? null;
}

function header(process: ProcessDetail, title: string): Paragraph[] {
  return [body(process.institutionName.toLocaleUpperCase('es-CO'), { center: true, bold: true, after: 45 }), body(city(process), { center: true, after: 45 }), body('FONDO DE SERVICIOS EDUCATIVOS', { center: true, bold: true, after: 180 }), documentHeading(title), body(`Proceso No. ${consecutive(process)}`, { center: true, bold: true, after: 180 })];
}

function evaluationSignatureTable(process: ProcessDetail): Table {
  const evaluators = process.evaluationTeam?.evaluators ?? [];
  const rows = evaluators.length ? evaluators.map((member) => [`${member.name}\n${member.role}`, '________________________']) : [['Integrante del comité pendiente de registro', '________________________']];
  return table(['Integrante del comité evaluador', 'Firma'], rows);
}

function selection(process: ProcessDetail) {
  if (!process.selectionDecision) throw new Error('No existe una decisión de selección registrada para este expediente.');
  return process.selectionDecision;
}

export async function createSelectionActDocx(process: ProcessDetail): Promise<Buffer> {
  const decision = selection(process); const object = createMarketStudyNarrative(process).objectDescription;
  const children: Array<Paragraph | Table> = [
    ...header(process, 'ACTA DE SELECCIÓN DE OFERENTE'),
    heading('Considerandos'),
    body(`Que el comité evaluador examinó las ofertas recibidas para el objeto: ${object}, conforme a la invitación pública, los estudios previos, el reglamento institucional aplicable y la evidencia incorporada al expediente.`),
    body('Que el acta de evaluación es un documento de análisis y no designa por sí misma al proponente seleccionado. La selección se adopta mediante la presente decisión expresa del comité, con fundamento en las verificaciones y resultados documentados.'),
    heading('1. Resultado de la evaluación y decisión del comité'),
    table(['Elemento', 'Determinación institucional'], [['Proceso', consecutive(process)], ['Proponente seleccionado por el comité', decision.selectedSupplier], ['Motivación registrada', decision.rationale], ['Estado del acta', decision.status === 'SIGNED_UPLOADED' ? 'Acta firmada incorporada al expediente' : 'Versión para descargar, firmar e incorporar al expediente']]),
    body(`El comité evaluador decide seleccionar a ${decision.selectedSupplier} para continuar con las actuaciones posteriores, sujeto a la verificación de la firma de esta acta, la comunicación de aceptación, el registro presupuestal y los demás requisitos institucionales aplicables.`),
    heading('2. Órdenes de la actuación'),
    body('Primera. Incorporar la presente acta firmada al expediente físico y digital.'),
    body('Segunda. Una vez incorporada el acta firmada, elaborar la comunicación de aceptación de oferta dirigida al proponente seleccionado.'),
    body('Tercera. Antes de iniciar ejecución, verificar y cargar el Registro Presupuestal, y expedir los documentos contractuales e inicio que correspondan.'),
    body(`Se expide en ${city(process)}, a los ${date()}.`, { after: 160 }), evaluationSignatureTable(process),
  ];
  return Packer.toBuffer(new Document({ creator: process.institutionName, title: 'Acta de selección de oferente', sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}

export async function createAcceptanceCommunicationDocx(process: ProcessDetail): Promise<Buffer> {
  const decision = selection(process); const object = createMarketStudyNarrative(process).objectDescription;
  const children: Array<Paragraph | Table> = [
    ...header(process, 'COMUNICACIÓN DE ACEPTACIÓN DE OFERTA'),
    body(`Señor(a)\n${decision.selectedSupplier}\nProponente seleccionado`, { after: 120 }),
    body(`Asunto: aceptación de oferta — Proceso No. ${consecutive(process)}.`),
    body(`La ${process.institutionName}, por medio de la presente comunicación, informa que el comité evaluador dejó constancia en el Acta de selección de oferente de la selección de su propuesta para el objeto: ${object}.`),
    table(['Elemento', 'Información'], [['Proceso', consecutive(process)], ['Proponente seleccionado', decision.selectedSupplier], ['Motivación del comité', decision.rationale], ['Requisito pendiente', 'Verificación del Registro Presupuestal y requisitos de perfeccionamiento y ejecución aplicables.']]),
    body('Esta comunicación deberá incorporarse al expediente junto con el acta de selección firmada y no autoriza inicio de ejecución hasta que se cumplan los requisitos presupuestales, documentales y de legalización exigibles.'),
    body(`Se expide en ${city(process)}, a los ${date()}.`, { after: 160 }), body('________________________________________', { after: 20 }), body(process.responsibleName, { bold: true, after: 20 }), body('Rector(a) / Ordenador(a) del gasto'),
  ];
  return Packer.toBuffer(new Document({ creator: process.institutionName, title: 'Comunicación de aceptación de oferta', sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}

export async function createContractDocx(process: ProcessDetail): Promise<Buffer> {
  const decision = selection(process); const object = createMarketStudyNarrative(process).objectDescription; const offer = await selectedOffer(process); const title = contractTitle(process);
  const cdp = referenceFromName(processDocument(process, 'BUDGET_CERTIFICATE'), 'CDP'); const rp = referenceFromName(processDocument(process, 'BUDGET_REGISTRATION'), 'RP'); const supervisor = process.evaluationTeam?.supervisor;
  const contractor = offer ? `${offer.supplier}\nNIT o documento: ${offer.taxId}\nRepresentante: ${offer.representative}` : decision.selectedSupplier;
  const numberFromCurrency = (value: string) => Number(value.replace(/[^\d]/gu, '')) || null;
  const unspsc = (description: string) => description.match(/UNSPSC\s*(\d{8})/iu)?.[1] ?? process.marketStudy.profile.unspscCodes.split(/[,;\s]+/u).find((code) => /^\d{8}$/u.test(code)) ?? 'Según estudio previo';
  const contractItems = offer?.items.length ? offer.items.map((item) => {
    const total = numberFromCurrency(item.total); const tax = numberFromCurrency(item.tax); const subtotal = total !== null && tax !== null ? money(total - tax) : 'Según oferta';
    return [item.number, item.description.replace(/\s*·\s*UNSPSC\s*\d{8}/iu, ''), unspsc(item.description), item.quantity, item.unit, subtotal, item.tax, item.total];
  }) : [['—', 'Ítems y valores según oferta seleccionada incorporada al expediente', 'Según estudio previo', '—', '—', '—', '—', '—']];
  if (offer?.items.length) contractItems.push(['', 'TOTAL', '', '', '', money(offer.subtotal), money(offer.ivaTotal), money(offer.total)]);
  const clauses: Array<[string, string]> = [
    ['CLÁUSULA PRIMERA. OBJETO.', `EL CONTRATISTA se obliga para con LA INSTITUCIÓN a ${contractType(process) === 'CONTRATO DE SUMINISTRO' ? 'suministrar' : 'ejecutar'} ${object}, por su cuenta y riesgo, con autonomía técnica y administrativa, en las cantidades, especificaciones, precios y condiciones previstas en este contrato, la invitación pública, los estudios previos y la oferta aceptada.`],
    ['CLÁUSULA SEGUNDA. ESPECIFICACIONES, CANTIDADES Y PRECIOS.', 'Los bienes o servicios objeto del contrato son los que se relacionan en la siguiente matriz. Los precios unitarios ofrecidos permanecerán fijos durante la ejecución y comprenden todos los costos necesarios para el cumplimiento del objeto contractual.'],
    ['PARÁGRAFO.', 'Los bienes deberán ser nuevos, de primera calidad y corresponder a las referencias de la oferta. LA INSTITUCIÓN podrá rechazar los que no cumplan las especificaciones, sin que ello genere costo adicional a su cargo.'],
    ['CLÁUSULA TERCERA. VALOR.', `El valor total del contrato es ${money(offer?.total)}${offer ? `, IVA incluido, integrado por una base de ${money(offer.subtotal)} y un IVA de ${money(offer.ivaTotal)}.` : '.'} Este valor incluye los costos directos e indirectos, transporte, cargue, descargue, empaques, impuestos, tasas, contribuciones y demás erogaciones necesarias para cumplir el objeto.`],
    ['CLÁUSULA CUARTA. FORMA DE PAGO.', 'LA INSTITUCIÓN efectuará el pago contra la entrega o ejecución recibida a satisfacción por el supervisor, la presentación de factura o cuenta de cobro y los soportes tributarios, comerciales y de seguridad social que sean exigibles. No se reconocerán pagos anticipados ni valores diferentes a los pactados, salvo que los documentos aprobados dispongan expresamente otra condición.'],
    ['CLÁUSULA QUINTA. IMPUTACIÓN PRESUPUESTAL.', `El pago se hará con cargo al Certificado de Disponibilidad Presupuestal ${cdp} y al Registro Presupuestal ${rp}. El rubro, fuente, valor comprometido, vigencia y retenciones serán los que consten en los documentos presupuestales originales incorporados al expediente.`],
    ['CLÁUSULA SEXTA. PLAZO DE EJECUCIÓN.', 'El plazo será el establecido en la oferta aceptada y en la invitación pública. Se contará a partir de la suscripción del Acta de inicio y del cumplimiento de los requisitos de ejecución. El término solo podrá modificarse por escrito, con la justificación y los soportes exigibles.'],
    ['CLÁUSULA SÉPTIMA. LUGAR Y CONDICIONES DE ENTREGA.', `La ejecución se realizará en ${city(process)} o en la sede institucional definida en los documentos del proceso. El contratista coordinará las entregas o actividades con el supervisor y asumirá la custodia de los bienes o la responsabilidad de la prestación hasta el recibo a satisfacción.`],
    ['CLÁUSULA OCTAVA. OBLIGACIONES GENERALES DEL CONTRATISTA.', 'EL CONTRATISTA deberá cumplir el objeto en las condiciones ofrecidas; entregar bienes o servicios de calidad e idoneidad; atender los requerimientos del supervisor; mantener las condiciones jurídicas, tributarias y de seguridad social acreditadas; informar cualquier hecho que afecte la ejecución; y responder por los daños atribuibles a su actuación.'],
    ['CLÁUSULA NOVENA. OBLIGACIONES ESPECÍFICAS DEL CONTRATISTA.', 'EL CONTRATISTA deberá entregar los bienes completos y en las referencias aceptadas, o prestar el servicio con los recursos y estándares ofrecidos; reemplazar elementos defectuosos o subsanar observaciones dentro del plazo indicado por el supervisor; conservar evidencia de la entrega; y abstenerse de modificar cantidades, precios o condiciones sin autorización escrita de LA INSTITUCIÓN.'],
    ['CLÁUSULA DÉCIMA. OBLIGACIONES DE LA INSTITUCIÓN EDUCATIVA.', 'LA INSTITUCIÓN suministrará la información necesaria para la ejecución; ejercerá la supervisión; recibirá o formulará observaciones sobre la entrega; tramitará el pago cuando se cumplan los requisitos; aplicará las retenciones correspondientes; conservará el expediente y realizará las publicaciones institucionales que procedan.'],
    ['CLÁUSULA DÉCIMA PRIMERA. SUPERVISIÓN.', `La supervisión estará a cargo de ${supervisor ? `${supervisor.name}, ${supervisor.role}` : 'la persona designada por escrito por la Institución Educativa'}, quien verificará el cumplimiento técnico, administrativo, financiero y documental, sin modificar por sí solo el objeto, valor o plazo pactados.`],
    ['CLÁUSULA DÉCIMA SEGUNDA. FUNCIONES DEL SUPERVISOR.', 'El supervisor comprobará las condiciones de ejecución y de entrega; exigirá los soportes correspondientes; promoverá el recibo a satisfacción; formulará observaciones escritas; verificará la procedencia de pagos; informará riesgos, incumplimientos o novedades; y conservará en el expediente las constancias de su gestión.'],
    ['CLÁUSULA DÉCIMA TERCERA. RECIBO A SATISFACCIÓN Y CALIDAD.', 'El supervisor verificará cantidades, especificaciones, estado, oportunidad y calidad. Si la entrega no cumple, dejará constancia escrita y EL CONTRATISTA deberá corregirla dentro del plazo señalado antes de que proceda el recibo a satisfacción y el pago.'],
    ['CLÁUSULA DÉCIMA CUARTA. GARANTÍAS.', 'Las garantías exigibles, sus amparos, cuantías, vigencias y condiciones serán las previstas en la invitación pública, el reglamento institucional y los documentos aprobados del proceso. Cuando no se exijan garantías adicionales, subsisten las obligaciones de calidad, responsabilidad y corrección a cargo del contratista.'],
    ['CLÁUSULA DÉCIMA QUINTA. SEGURIDAD SOCIAL Y OBLIGACIONES TRIBUTARIAS.', 'EL CONTRATISTA acreditará el cumplimiento de las obligaciones de seguridad social y parafiscales cuando sean exigibles. LA INSTITUCIÓN aplicará las retenciones, descuentos y tributos que correspondan conforme a la condición tributaria acreditada y la normativa aplicable.'],
    ['CLÁUSULA DÉCIMA SEXTA. AUSENCIA DE RELACIÓN LABORAL.', 'La ejecución de este contrato no genera relación laboral entre LA INSTITUCIÓN y el personal que EL CONTRATISTA emplee o vincule. El contratista conserva la dirección técnica y administrativa de sus actividades y asume sus obligaciones laborales, comerciales, tributarias y de seguridad social.'],
    ['CLÁUSULA DÉCIMA SÉPTIMA. CESIÓN Y SUBCONTRATACIÓN.', 'EL CONTRATISTA no podrá ceder total o parcialmente el contrato sin autorización previa y escrita de LA INSTITUCIÓN. La subcontratación, cuando sea compatible con el objeto y permitida en la invitación pública, no libera al contratista de su responsabilidad integral.'],
    ['CLÁUSULA DÉCIMA OCTAVA. MODIFICACIONES, ADICIONES Y PRÓRROGAS.', 'Toda modificación, adición o prórroga deberá constar por escrito, estar debidamente justificada, contar con los soportes presupuestales cuando sean exigibles y ajustarse al reglamento institucional. No podrá alterarse el objeto ni superarse el límite de cuantía aplicable al proceso.'],
    ['CLÁUSULA DÉCIMA NOVENA. SUSPENSIÓN Y REINICIO.', 'La suspensión procederá por circunstancias justificadas que impidan temporalmente la ejecución. Deberá constar en acta suscrita por las partes y el supervisor, indicando la causa, fecha de suspensión y condiciones de reinicio. El reinicio se documentará de la misma manera.'],
    ['CLÁUSULA VIGÉSIMA. TERMINACIÓN ANTICIPADA.', 'El contrato podrá terminar anticipadamente por mutuo acuerdo, imposibilidad de ejecución, incumplimiento debidamente establecido, fuerza mayor, caso fortuito u otra causa legal o contractual procedente. La decisión deberá constar por escrito y respetar el debido proceso cuando afecte al contratista.'],
    ['CLÁUSULA VIGÉSIMA PRIMERA. MULTAS, CLÁUSULA PENAL Y GARANTÍAS.', 'Las multas, la cláusula penal, la efectividad de garantías y demás consecuencias económicas por incumplimiento solo se aplicarán en los términos, cuantías y procedimiento previstos expresamente en el reglamento institucional, la invitación pública y los documentos aprobados, con garantía del derecho de defensa.'],
    ['CLÁUSULA VIGÉSIMA SEGUNDA. RESPONSABILIDAD E INDEMNIDAD.', 'EL CONTRATISTA responderá por los daños que cause por acción u omisión imputable durante la ejecución y mantendrá indemne a LA INSTITUCIÓN frente a reclamaciones de terceros originadas en su actuación o en la de las personas a su cargo, sin perjuicio de las responsabilidades legales aplicables.'],
    ['CLÁUSULA VIGÉSIMA TERCERA. INHABILIDADES, INCOMPATIBILIDADES Y CONFLICTOS DE INTERÉS.', 'EL CONTRATISTA declara que no se encuentra incurso en causales de inhabilidad, incompatibilidad o conflicto de interés aplicables y se obliga a informar cualquier situación sobreviniente que pueda afectar su capacidad para ejecutar el contrato.'],
    ['CLÁUSULA VIGÉSIMA CUARTA. TRANSPARENCIA, CONFIDENCIALIDAD Y DATOS.', 'Las partes actuarán con transparencia y se abstendrán de ofrecer, solicitar o aceptar beneficios indebidos. EL CONTRATISTA guardará reserva sobre la información institucional a la que acceda y tratará los datos personales únicamente para las finalidades necesarias de la ejecución.'],
    ['CLÁUSULA VIGÉSIMA QUINTA. RIESGOS, FUERZA MAYOR Y CONTROVERSIAS.', 'Las partes atenderán los riesgos identificados en los estudios previos y la invitación pública. La ocurrencia de fuerza mayor, caso fortuito o hechos de terceros deberá comunicarse de inmediato. Las diferencias se procurarán resolver directamente y, si persisten, se acudirá a los mecanismos y autoridades competentes.'],
    ['CLÁUSULA VIGÉSIMA SEXTA. DOCUMENTOS INTEGRANTES.', `Forman parte integral del contrato los estudios previos, el estudio de mercado, ${cdp}, la invitación pública, la oferta con sus anexos, el acta de recibo de ofertas, el acta de evaluación, el Acta de selección firmada, la comunicación de aceptación, ${rp} y los soportes de ejecución.`],
    ['CLÁUSULA VIGÉSIMA SÉPTIMA. PERFECCIONAMIENTO, EJECUCIÓN Y PUBLICIDAD.', 'El contrato se perfecciona con la firma de las partes. Su ejecución requiere los requisitos presupuestales, documentales y de ejecución que correspondan, incluida la suscripción del Acta de inicio. LA INSTITUCIÓN realizará las publicaciones y conservará el expediente conforme al reglamento institucional.'],
    ['CLÁUSULA VIGÉSIMA OCTAVA. CIERRE Y ARCHIVO.', 'Al terminar la ejecución, el supervisor promoverá el recibo final, el balance de obligaciones y las actuaciones de cierre o liquidación que resulten aplicables. LA INSTITUCIÓN conservará los documentos y soportes en el expediente físico y digital.'],
    ['CLÁUSULA VIGÉSIMA NOVENA. RÉGIMEN APLICABLE.', 'El presente contrato se interpreta y ejecuta conforme a la Constitución Política, las normas aplicables a los Fondos de Servicios Educativos, el reglamento institucional de contratación, los documentos del proceso y las cláusulas aquí pactadas.'],
    ['CLÁUSULA TRIGÉSIMA. DOMICILIO CONTRACTUAL.', `Para todos los efectos, el domicilio contractual será ${city(process)}. Las comunicaciones relacionadas con la ejecución se incorporarán al expediente y se dirigirán por los medios institucionales definidos para el proceso.`],
  ];
  const considerations = [
    'Que los artículos 67 y 209 de la Constitución Política orientan la garantía del servicio educativo y el ejercicio de la función administrativa con fundamento en los principios de igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad.',
    'Que el artículo 11 de la Ley 715 de 2001 creó los Fondos de Servicios Educativos como cuentas para administrar recursos destinados a atender gastos de funcionamiento e inversión distintos de personal de los establecimientos educativos estatales.',
    'Que la administración del Fondo de Servicios Educativos corresponde al rector como ordenador del gasto, bajo la reglamentación expedida por el Consejo Directivo y dentro de las competencias previstas para la institución educativa.',
    'Que el artículo 13 de la Ley 715 de 2001 establece que los actos y contratos con cargo a Fondos de Servicios Educativos cuya cuantía sea inferior a veinte salarios mínimos legales mensuales vigentes se rigen por los procedimientos y reglas que expida el Consejo Directivo, con observancia de los principios aplicables.',
    'Que el Capítulo 6 del Título 1 de la Parte 3 del Libro 2 del Decreto 1075 de 2015 regula la administración de los Fondos de Servicios Educativos y las funciones de los rectores y Consejos Directivos en la contratación de cuantía inferior a veinte salarios mínimos legales mensuales vigentes.',
    'Que el artículo 13 de la Ley 1150 de 2007 exige a las entidades sometidas a un régimen contractual excepcional aplicar los principios de la función administrativa y de la gestión fiscal, así como el régimen de inhabilidades e incompatibilidades aplicable.',
    `Que el reglamento institucional de contratación ${process.marketStudy.regulationName ?? 'vinculado al expediente'} define el procedimiento aplicable para la adquisición de bienes y servicios que se adelanta en este proceso.`,
    `Que la necesidad, justificación, especificaciones, presupuesto y riesgos se documentaron en los estudios previos, el estudio de mercado, la invitación pública y los demás antecedentes del proceso No. ${consecutive(process)}.`,
    'Que la investigación de mercado y los documentos precontractuales permitieron establecer las condiciones técnicas y económicas requeridas para satisfacer la necesidad institucional sin exceder la cuantía aplicable.',
    `Que para respaldar el compromiso se incorporó el Certificado de Disponibilidad Presupuestal ${cdp}, cuyos datos de rubro, fuente, valor y vigencia constan en el soporte presupuestal original.`,
    'Que se agotó el procedimiento previsto en el reglamento institucional, se recibieron las ofertas y se realizó la evaluación jurídica, técnica, financiera y económica con base en la evidencia incorporada al expediente.',
    `Que el comité evaluador seleccionó a ${decision.selectedSupplier} mediante Acta de selección de oferente firmada, y la comunicación de aceptación de oferta hace parte de los antecedentes contractuales.`,
    `Que se incorporó el Registro Presupuestal ${rp}, requisito presupuestal que respalda el compromiso por el valor aceptado.`,
    'Que el contratista acreditó los requisitos habilitantes exigidos y declaró no encontrarse incurso en causales de inhabilidad, incompatibilidad o conflicto de interés, de acuerdo con los soportes incorporados y las verificaciones institucionales aplicables.',
  ];
  const children: Array<Paragraph | Table> = [
    ...header(process, title),
    table(['Campo', 'Información'], [['Proceso de contratación', `${consecutive(process)} · Contratación de cuantía inferior a 20 SMMLV`], ['Contratante', `${process.institutionName}\nFondo de Servicios Educativos\nRepresentada por ${process.responsibleName}, Rector(a) y Ordenador(a) del gasto`], ['Contratista', contractor], ['Objeto', object], ['Valor', offer ? `${money(offer.total)} IVA incluido` : 'Según oferta seleccionada y RP incorporado'], ['CDP', cdp], ['RP', rp], ['Supervisor(a)', supervisor ? `${supervisor.name}\n${supervisor.role}` : 'Designado(a) por la Institución Educativa'], ['Lugar de ejecución', city(process)]]),
    body(`Entre los suscritos, ${process.responsibleName}, en calidad de Rector(a) y Ordenador(a) del gasto de ${process.institutionName}, quien para efectos del presente contrato se denomina LA INSTITUCIÓN, y ${decision.selectedSupplier}, quien se denomina EL CONTRATISTA, se acuerda celebrar el presente ${title}, previas las siguientes consideraciones:`, { after: 150 }),
    heading('CONSIDERACIONES'),
    ...considerations.map((item, index) => numberedConsidering(index + 1, item)),
    heading('CLÁUSULAS'),
    ...clauses.flatMap(([name, content], index) => index === 1 ? [contractClause(name, content), contractTable(['Ítem', 'Descripción', 'UNSPSC', 'Cant.', 'Valor\nunitario', 'Subtotal', 'IVA', 'Total'], contractItems, [5, 28, 10, 6, 12, 13, 12, 14])] : [contractClause(name, content)]),
    body(`Para constancia, se firma en ${city(process)}, a los ____ días del mes de ____________ de ${new Date(process.createdAt).getFullYear()}.`, { after: 160 }),
    signatureTable([{ label: 'LA INSTITUCIÓN', name: process.responsibleName, role: 'Rector(a) / Ordenador(a) del gasto' }, { label: 'EL CONTRATISTA', name: decision.selectedSupplier }]),
  ];
  return Packer.toBuffer(new Document({ creator: process.institutionName, title, sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}
export async function createStartActDocx(process: ProcessDetail): Promise<Buffer> {
  const decision = selection(process); const offer = await selectedOffer(process); const title = contractTitle(process);
  const cdp = referenceFromName(processDocument(process, 'BUDGET_CERTIFICATE'), 'CDP'); const rp = referenceFromName(processDocument(process, 'BUDGET_REGISTRATION'), 'RP'); const supervisor = process.evaluationTeam?.supervisor;
  const object = createMarketStudyNarrative(process).objectDescription;
  const children: Array<Paragraph | Table> = [
    ...header(process, 'ACTA DE INICIO'),
    body(`${title} — Proceso No. ${consecutive(process)}`, { center: true, bold: true }),
    heading('1. Identificación del contrato'),
    table(['Campo', 'Información'], [['Contrato', title], ['Fecha de suscripción', date()], ['Contratante', `${process.institutionName}\nFondo de Servicios Educativos\n${process.responsibleName}, Rector(a) / Ordenador(a) del gasto`], ['Contratista', offer ? `${offer.supplier}\nNIT o documento: ${offer.taxId}\nRepresentante: ${offer.representative}` : decision.selectedSupplier], ['Objeto', object], ['Valor', offer ? `${money(offer.total)} IVA incluido (base ${money(offer.subtotal)} + IVA ${money(offer.ivaTotal)})` : 'Según oferta aceptada y Registro Presupuestal'], ['Plazo de ejecución', 'El establecido en el contrato, la oferta aceptada y los documentos del proceso'], ['CDP / RP', `${cdp} / ${rp}`], ['Supervisor(a)', supervisor ? `${supervisor.name}\n${supervisor.role}` : 'Supervisor(a) designado(a) por la Institución Educativa'], ['Lugar de ejecución', city(process)]]),
    body(`En ${city(process)}, a los ${date()}, se reunieron ${supervisor ? `${supervisor.name}, en calidad de supervisor(a),` : 'el supervisor designado por la Institución Educativa,'} y ${decision.selectedSupplier}, en calidad de contratista, con el fin de dejar constancia del cumplimiento de los requisitos necesarios e iniciar la ejecución de ${title}.`),
    heading('2. Requisitos de ejecución cumplidos'),
    table(['Requisito', 'Soporte o verificación', 'Estado'], [['Perfeccionamiento del contrato', `${title} suscrito por las partes`, 'CUMPLIDO'], ['Registro presupuestal del compromiso', `${rp} incorporado al expediente`, 'CUMPLIDO'], ['Acta de selección y aceptación de oferta', 'Acta firmada y comunicación incorporadas al expediente', 'CUMPLIDO'], ['Aportes y requisitos del contratista', 'Soportes exigibles incorporados al expediente', 'CUMPLIDO'], ['Designación de supervisión', supervisor ? `${supervisor.name} — ${supervisor.role}` : 'Supervisor(a) designado(a) por la Institución Educativa', 'CUMPLIDO'], ['Garantías y demás requisitos aplicables', 'Soportes exigidos en la invitación pública, el contrato y el reglamento institucional', 'CUMPLIDO']]),
    heading('3. Fechas de ejecución'),
    table(['Concepto', 'Fecha'], [['Fecha de inicio', date()], ['Fecha de terminación del plazo', 'Según el plazo pactado en el contrato'], ['Vigencia del contrato', 'La prevista en el contrato y en los documentos presupuestales']]),
    heading('4. Compromisos para la ejecución'),
    body('Primero. EL CONTRATISTA ejecutará el objeto conforme a las condiciones técnicas, cantidades, calidad, plazo y valor establecidos en el contrato, la invitación pública y la oferta aceptada.'),
    body('Segundo. El supervisor verificará la ejecución, las entregas, los soportes de pago y el cumplimiento de las obligaciones, y dejará constancia de cualquier observación que deba ser atendida antes del recibo a satisfacción.'),
    body('Tercero. Las partes informarán oportunamente cualquier circunstancia que afecte el plazo, la calidad o las condiciones de ejecución. Esta acta no modifica el objeto, valor, plazo ni las obligaciones pactadas.'),
    heading('5. Declaraciones'),
    body('Quienes suscriben manifiestan que conocen los documentos integrantes del contrato, que los requisitos de ejecución ya se encuentran cumplidos conforme a los soportes originales incorporados al expediente y que el plazo contractual comienza a contarse desde la fecha de inicio registrada en esta acta.'),
    body(`Para constancia, se firma en ${city(process)}, a los ${date()}.`, { after: 160 }), signatureTable([{ label: 'LA INSTITUCIÓN', name: process.responsibleName, role: 'Rector(a) / Ordenador(a) del gasto' }, { label: 'EL CONTRATISTA', name: decision.selectedSupplier }, { label: 'SUPERVISOR(A)', name: supervisor?.name ?? 'Supervisor(a) designado(a)', role: supervisor?.role }]),
  ];
  return Packer.toBuffer(new Document({ creator: process.institutionName, title: `Acta de inicio - ${title}`, sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}

export async function createLiquidationActDocx(process: ProcessDetail): Promise<Buffer> {
  const decision = selection(process); const offer = await selectedOffer(process); const title = contractTitle(process); const supervisor = process.evaluationTeam?.supervisor;
  const cdp = referenceFromName(processDocument(process, 'BUDGET_CERTIFICATE'), 'CDP'); const rp = referenceFromName(processDocument(process, 'BUDGET_REGISTRATION'), 'RP');
  const partialReceipts = process.documents.filter((document) => document.kind === 'SATISFACTORY_RECEIPT_PARTIAL');
  const finalReceipt = process.documents.find((document) => document.kind === 'SATISFACTORY_RECEIPT_FINAL');
  const receiptRows = [...partialReceipts.map((document, index) => [`Recibido parcial ${index + 1}`, document.originalName, new Date(document.createdAt).toLocaleDateString('es-CO')]), ['Recibido final', finalReceipt?.originalName ?? 'Recibido a satisfacción final incorporado al expediente', finalReceipt ? new Date(finalReceipt.createdAt).toLocaleDateString('es-CO') : 'Según soporte final']];
  const children: Array<Paragraph | Table> = [
    ...header(process, 'ACTA DE LIQUIDACIÓN DEL CONTRATO'),
    body(`${title} — Proceso No. ${consecutive(process)}`, { center: true, bold: true }),
    heading('1. Identificación contractual'),
    table(['Campo', 'Información'], [['Contrato', title], ['Contratante', `${process.institutionName}\nFondo de Servicios Educativos\n${process.responsibleName}, Rector(a) / Ordenador(a) del gasto`], ['Contratista', decision.selectedSupplier], ['Objeto', createMarketStudyNarrative(process).objectDescription], ['Valor contratado', offer ? `${money(offer.total)} IVA incluido` : 'Según contrato y oferta aceptada'], ['CDP / RP', `${cdp} / ${rp}`], ['Supervisor(a)', supervisor ? `${supervisor.name}\n${supervisor.role}` : 'Supervisor(a) registrado(a) por la Institución Educativa'], ['Lugar de ejecución', city(process)]]),
    heading('2. Consideraciones'),
    numberedConsidering(1, 'Que el artículo 13 de la Ley 715 de 2001 y el artículo 2.3.1.6.3.17 del Decreto 1075 de 2015 someten la contratación con recursos del Fondo de Servicios Educativos de cuantía inferior a veinte salarios mínimos legales mensuales vigentes al reglamento del Consejo Directivo y a los principios de transparencia, economía, publicidad y responsabilidad.'),
    numberedConsidering(2, 'Que el contrato fue celebrado con los antecedentes precontractuales, la selección institucional, el CDP, el RP y los documentos que obran en el expediente.'),
    numberedConsidering(3, 'Que la supervisión y la Institución Educativa incorporaron los recibidos a satisfacción que soportan la ejecución, incluidos los parciales cuando el pago se realizó por entregas o periodos.'),
    numberedConsidering(4, 'Que se incorporó el recibido a satisfacción final, soporte con el cual se acredita la terminación de las obligaciones de ejecución y procede efectuar el balance contractual que corresponda.'),
    heading('3. Soportes de ejecución y recibo a satisfacción'),
    table(['Soporte', 'Archivo incorporado', 'Fecha de registro'], receiptRows),
    heading('4. Balance y liquidación'),
    body(`Las partes dejan constancia de que el objeto contractual fue ejecutado y recibido a satisfacción conforme al soporte final incorporado. El valor contractual corresponde a ${offer ? `${money(offer.total)} IVA incluido` : 'lo establecido en el contrato y el Registro Presupuestal'}. Los pagos, descuentos, retenciones, saldos, garantías y demás efectos económicos se soportan en la contabilidad institucional, los comprobantes de pago y los documentos del expediente.`),
    body('Con la firma de esta acta se declara realizado el balance final de las obligaciones contractuales, sin perjuicio de las obligaciones de garantía, calidad, estabilidad, responsabilidad, archivo, control fiscal o aquellas que por su naturaleza subsistan conforme a la ley, el contrato y el reglamento institucional.'),
    heading('5. Declaraciones finales'),
    body('El contratista, el supervisor y la Institución Educativa manifiestan que revisaron los soportes de ejecución y el recibido final. La presente acta se incorpora al expediente físico y digital y se publica o comunica por el canal que corresponda según el reglamento institucional y la normativa aplicable.'),
    body(`Para constancia, se firma en ${city(process)}, a los ${date()}.`, { after: 160 }),
    signatureTable([{ label: 'LA INSTITUCIÓN', name: process.responsibleName, role: 'Rector(a) / Ordenador(a) del gasto' }, { label: 'EL CONTRATISTA', name: decision.selectedSupplier }, { label: 'SUPERVISOR(A)', name: supervisor?.name ?? 'Supervisor(a) registrado(a)', role: supervisor?.role }]),
  ];
  return Packer.toBuffer(new Document({ creator: process.institutionName, title: `Acta de liquidación - ${title}`, sections: [{ properties: { page: { margin: { top: 1050, right: 900, bottom: 1050, left: 900 } } }, children }] }));
}
