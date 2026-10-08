import { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import type { ProcessDetail } from '@/modules/processes/process-queries';
import { createMarketStudyBudget } from './market-study-financials';
import { createMarketStudyClassifications, createMarketStudyNarrative } from './market-study-narrative';
import type { PrecontractualDocumentContext } from './precontractual-context';
import { formatInstitutionProcessConsecutive } from '@/modules/processes/process-consecutive';

export type PrecontractualDocumentKind = 'PRELIMINARY_STUDY' | 'PUBLIC_INVITATION';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function currency(value: string | number | null): string {
  if (value === null) return 'No identificado';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numeric) : String(value);
}

function body(text: string, options: { bold?: boolean; center?: boolean; after?: number } = {}): Paragraph {
  return new Paragraph({ alignment: options.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, spacing: { after: options.after ?? 100, line: 264 }, children: [new TextRun({ text, font: 'Aptos', size: 22, bold: options.bold })] });
}

function heading(text: string): Paragraph {
  return new Paragraph({ spacing: { before: 180, after: 80 }, keepNext: true, children: [new TextRun({ text, font: 'Aptos Display', size: 28, bold: true, color: '000000' })] });
}

function cell(text: string, header = false): TableCell {
  return new TableCell({ verticalAlign: VerticalAlign.CENTER, shading: header ? { type: ShadingType.CLEAR, fill: '1F1F1F', color: 'auto' } : undefined, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0, line: 220 }, children: [new TextRun({ text, font: 'Aptos', size: header ? 18 : 20, bold: header, color: header ? 'FFFFFF' : '000000' })] })] });
}

function table(headers: string[], rows: string[][]): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders, rows: [new TableRow({ tableHeader: true, children: headers.map((value) => cell(value, true)) }), ...rows.map((row) => new TableRow({ cantSplit: true, children: row.map((value) => cell(value)) }))] });
}

function processNumber(process: ProcessDetail): string { return formatInstitutionProcessConsecutive(process.institutionSequence, process.createdAt); }

function header(process: ProcessDetail, title: string): Paragraph[] {
  const city = process.institutionCity.trim() || 'Ciudad pendiente de actualización institucional';
  return [
    body(process.institutionName.toLocaleUpperCase('es-CO'), { center: true, bold: true, after: 45 }),
    body(city, { center: true, after: 45 }),
    body('FONDO DE SERVICIOS EDUCATIVOS', { center: true, bold: true, after: 260 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 250 }, children: [new TextRun({ text: title, font: 'Aptos Display', size: 38, bold: true })] }),
  ];
}

function signature(process: ProcessDetail, generatedAt: string): Paragraph[] {
  const city = process.institutionCity.trim() || 'la ciudad de sede principal de la Institución Educativa';
  return [body(`Se expide en ${city}, a los ${new Date(generatedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}.`, { after: 160 }), body('________________________________________', { after: 20 }), body(process.responsibleName, { bold: true, after: 20 }), body('Rector(a) / Ordenador(a) del gasto', { after: 0 })];
}

function cdpDescription(context: PrecontractualDocumentContext): string { return context.cdpNumber ? `CDP No. ${context.cdpNumber}` : `Número de CDP pendiente de validación en ${context.cdpOriginalName}`; }
function scheduleTable(context: PrecontractualDocumentContext): Table { return table(['Actividad', 'Fecha', 'Término mínimo o regla'], context.schedule.map((item) => [item.activity, new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(item.date), item.legalMinimum])); }
function identificationTable(process: ProcessDetail, context: PrecontractualDocumentContext): Table { return table(['Campo', 'Información'], [['Institución Educativa', process.institutionName], ['Consecutivo del proceso', processNumber(process)], ['Documento presupuestal', cdpDescription(context)], ['Archivo CDP', context.cdpOriginalName], ['Fecha de generación', new Date(context.generatedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })]]); }
function bullet(text: string): Paragraph { return new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { left: 360, hanging: 180 }, spacing: { after: 70, line: 264 }, children: [new TextRun({ text: `• ${text}`, font: 'Aptos', size: 22 })] }); }

function regulationDescription(process: ProcessDetail): string {
  return process.marketStudy.regulationVersion
    ? `el reglamento de contratación de la Institución Educativa, versión ${process.marketStudy.regulationVersion}${process.marketStudy.regulationName ? ` (${process.marketStudy.regulationName})` : ''}`
    : 'el reglamento de contratación vinculado al expediente';
}

function selectionCriteriaTable(): Table {
  return table(['Aspecto', 'Verificación requerida'], [
    ['Capacidad jurídica', 'Existencia, representación o identificación, RUT cuando corresponda, ausencia de inhabilidades e incompatibilidades y demás documentos exigidos por el reglamento institucional.'],
    ['Capacidad técnica', 'Cumplimiento integral de las especificaciones, cantidades, calidad, plazo de entrega y requisitos técnicos definidos en esta invitación.'],
    ['Experiencia', 'Soporte de experiencia relacionada únicamente cuando el reglamento institucional y la complejidad del objeto lo exijan.'],
    ['Oferta económica', 'Claridad de valores unitarios, IVA, total y correspondencia con el presupuesto oficial. La regla objetiva de selección será la prevista en el reglamento y en la invitación definitiva.'],
  ]);
}

function riskTable(): Table {
  return table(['Riesgo previsible', 'Asignación', 'Tratamiento y seguimiento'], [
    ['Entrega incompleta, tardía o distinta a las especificaciones.', 'Contratista', 'Definir plazo, exigir especificaciones y registrar el recibo a satisfacción.'],
    ['Variación o inconsistencia en la propuesta económica.', 'Proponente', 'Exigir valores unitarios, IVA y total claros antes de aceptar la oferta.'],
    ['Falta de disponibilidad o información para formalizar.', 'Institución Educativa', 'Verificar CDP, rubro y disponibilidad antes de publicar o asumir obligaciones.'],
    ['Deficiencia en la supervisión o en el recibo.', 'Institución Educativa', 'Designar supervisor y conservar evidencia de cumplimiento, recibo y pago.'],
  ]);
}

function guaranteeAndSupervisionTable(process: ProcessDetail): Table {
  return table(['Aspecto', 'Regla para el proceso'], [
    ['Garantías', `Su exigencia, vigencia y amparos se definirán antes de publicar según ${regulationDescription(process)}, el valor, el objeto y los riesgos. No se presume una garantía no exigida.`],
    ['Supervisión', 'La Institución Educativa designará responsable para verificar ejecución, recibo a satisfacción y obligaciones.'],
    ['Publicación', 'Los documentos y actuaciones se publicarán o conservarán conforme al reglamento y al deber de publicidad aplicable.'],
  ]);
}

function specificationTable(process: ProcessDetail): Table {
  const classifications = createMarketStudyClassifications(process);
  return table(['Ítem', 'Descripción', 'Cantidad', 'Unidad', 'Código UNSPSC'], classifications.map((item) => {
    const comparison = process.marketStudy.comparisons[item.item - 1];
    return [String(item.item), item.description, comparison?.quantity ?? 'Por definir', item.unit, item.code];
  }));
}

function quoteAnalysisTable(process: ProcessDetail): Table {
  return table(['Fuente examinada', 'Proveedor identificado', 'Valor total reportado', 'Tratamiento tributario informado'], process.quotationTotals.length
    ? process.quotationTotals.map((quote) => [quote.source, quote.supplierName ?? 'No identificado en la fuente', currency(quote.totalValue), quote.taxTreatments.length ? quote.taxTreatments.join('; ') : 'No verificable en la fuente'])
    : [['No hay cotizaciones estructuradas para resumir.', '—', '—', '—']]);
}

function proposalRequirementsTable(): Table {
  return table(['Documento o condición', 'Regla de verificación'], [
    ['Carta de presentación de la oferta', 'Firmada por la persona natural, el representante legal o quien cuente con facultad acreditada; identifica al proponente, el objeto y la aceptación de las condiciones.'],
    ['Identificación y existencia', 'Documento de identidad para persona natural; certificado de existencia y representación legal cuando corresponda, con vigencia y objeto compatibles.'],
    ['RUT y condición tributaria', 'Registro Único Tributario vigente y la información tributaria necesaria para aplicar retenciones o descuentos legales.'],
    ['Inhabilidades e incompatibilidades', 'Declaración bajo gravedad de juramento y las verificaciones que correspondan conforme al reglamento institucional.'],
    ['Aportes al sistema de seguridad social', 'Certificación o soporte exigible cuando corresponda a la naturaleza del proponente y del contrato.'],
    ['Experiencia y capacidad técnica', 'Solo la experiencia relacionada, certificaciones y soportes que se indiquen expresamente como proporcionales al objeto.'],
    ['Oferta técnica y económica', 'Anexo de especificaciones diligenciado; valores unitarios, IVA discriminado cuando aplique, valor total, plazo y vigencia de la oferta.'],
  ]);
}

function detailedRiskTable(): Table {
  return table(['Evento', 'Consecuencia', 'Asignación', 'Tratamiento / evidencia'], [
    ['La oferta omite una especificación, unidad, IVA o valor total.', 'Imposibilidad de comparación objetiva o de verificar el precio ofrecido.', 'Proponente', 'Exigir el anexo económico completo y solicitar aclaración solo en los eventos permitidos por el reglamento.'],
    ['El bien o servicio entregado no corresponde a la ficha técnica.', 'Recibo no conforme, retraso o necesidad de corrección.', 'Contratista', 'Especificaciones detalladas, control de entrega y acta de recibo a satisfacción.'],
    ['El CDP, rubro o disponibilidad no cubre la obligación.', 'No puede formalizarse o ejecutarse el compromiso.', 'Institución Educativa', 'Validación del CDP, rubro, vigencia y valor antes de publicar y aceptar.'],
    ['Se presentan retrasos en entrega o ejecución.', 'Afectación de la necesidad institucional.', 'Contratista', 'Plazo verificable, seguimiento del supervisor y medidas previstas en el documento contractual.'],
    ['La información del proceso no se publica o conserva oportunamente.', 'Afectación de publicidad y trazabilidad.', 'Institución Educativa', 'Cronograma, expediente completo y conservación de observaciones, respuestas y decisiones.'],
  ]);
}

function economicOfferItemsTable(process: ProcessDetail): Table {
  const classifications = createMarketStudyClassifications(process);
  return table(['Ítem', 'Descripción y código UNSPSC', 'Cantidad', 'Valor unitario antes de IVA', 'IVA tarifa y valor', 'Valor total del ítem'], classifications.length
    ? [...classifications.map((item) => [String(item.item), `${item.description}\n${item.code}`, process.marketStudy.comparisons[item.item - 1]?.quantity ?? '—', '$ __________________', '$ __________________', '$ __________________']), ['', 'TOTALES DE LA OFERTA', '', '', 'IVA TOTAL: $ __________________', 'TOTAL OFERTA: $ __________________']]
    : [['1', 'La IE debe completar la ficha técnica antes de publicar.', '—', '$ __________________', '$ __________________', '$ __________________'], ['', 'TOTALES DE LA OFERTA', '', '', 'IVA TOTAL: $ __________________', 'TOTAL OFERTA: $ __________________']]);
}

function proponentSignature(): Paragraph[] {
  return [
    body('Atentamente,', { after: 230 }), body('________________________________________', { after: 25 }),
    body('Nombre del proponente o representante legal: ________________________________________', { after: 25 }),
    body('Documento de identidad: ____________________   Cargo: ____________________', { after: 25 }),
    body('Teléfono: ____________________   Correo electrónico: ____________________', { after: 0 }),
  ];
}

function annexEconomicOffer(process: ProcessDetail): Array<Paragraph | Table> {
  return [
    body(`Proceso No. ${processNumber(process)}   Objeto: ${createMarketStudyNarrative(process).objectDescription}`),
    body('El suscrito presenta la siguiente oferta económica. Los valores se expresan en pesos colombianos, deben cubrir la totalidad de los costos directos e indirectos necesarios para ejecutar el objeto y deberán mantenerse durante la vigencia de la oferta, salvo las variaciones expresamente aceptadas mediante adenda.'),
    table(['Información del proponente', 'Dato a diligenciar'], [
      ['Nombre o razón social', '________________________________________________________________'],
      ['NIT o documento de identidad', '________________________________________________________________'],
      ['Representante legal, si aplica', '________________________________________________________________'],
      ['Régimen y responsabilidad tributaria', '________________________________________________________________'],
      ['Vigencia de la oferta', '________ días calendario contados desde el cierre del proceso'],
    ]),
    body('Diligencie cada columna. Si un ítem no genera IVA o tiene un tratamiento diferente, indique la tarifa aplicable, el valor del impuesto y el fundamento o condición tributaria en la observación correspondiente.'),
    economicOfferItemsTable(process),
    body('Observaciones tributarias, descuentos, transporte, garantía comercial, plazo de entrega u otras condiciones económicas: ________________________________________________________________________________________________________________'),
    body('Declaro que los valores unitarios, el IVA y los totales de esta oferta son consistentes entre sí; que conozco el presupuesto oficial y las especificaciones; y que, de ser aceptada la oferta, cumpliré las condiciones aquí declaradas y las previstas en la invitación.'),
    ...proponentSignature(),
  ];
}

function annexPresentationLetter(process: ProcessDetail): Array<Paragraph | Table> {
  return [
    body('Ciudad y fecha: ____________________, ____ de ____________________ de ________.'),
    body('Señores', { after: 25 }),
    body(process.institutionName, { after: 25 }),
    body('Fondo de Servicios Educativos', { after: 90 }),
    body(`Referencia: Proceso No. ${processNumber(process)}`, { after: 25 }),
    body(`Objeto: ${createMarketStudyNarrative(process).objectDescription}`),
    body('Yo, ________________________________________, identificado(a) con ________________________________, actuando en nombre propio / en calidad de representante legal de ________________________________________, identificado(a) con NIT o documento No. ________________________________, presento oferta para el proceso de la referencia.'),
    body('Con la presentación de esta carta declaro que:'),
    bullet('Conozco y acepto íntegramente la invitación pública, sus estudios previos, anexos, adendas, cronograma y especificaciones técnicas.'),
    bullet('La información, documentos y valores que acompaño son veraces, completos y suficientes para evaluar la oferta.'),
    bullet('Cuento con capacidad jurídica, técnica, financiera y operativa para cumplir el objeto en las condiciones y plazo que determine la Institución Educativa.'),
    bullet('Mantendré la oferta vigente durante ________ días calendario contados a partir del cierre, y aceptaré las verificaciones y aclaraciones permitidas por el reglamento aplicable.'),
    bullet('Acepto que las comunicaciones se remitan al correo ________________________________________ y al teléfono ________________________________________.') ,
    body('Adjunto la oferta técnica y económica, los documentos habilitantes y los anexos suscritos. Solicito que la propuesta sea evaluada conforme a las reglas objetivas de la invitación.'),
    ...proponentSignature(),
  ];
}

function annexDisqualifications(process: ProcessDetail): Array<Paragraph | Table> {
  return [
    body('Ciudad y fecha: ____________________, ____ de ____________________ de ________.'),
    body(`Yo, ________________________________________, identificado(a) con ________________________________, en nombre propio / como representante legal de ________________________________________, con NIT o documento No. ________________________________, bajo la gravedad de juramento declaro para el proceso No. ${processNumber(process)} que:`),
    bullet('No me encuentro incurso(a), ni la persona que represento se encuentra incursa, en causales de inhabilidad, incompatibilidad, prohibición o conflicto de interés que impidan presentar oferta, ser aceptado(a) o contratar.'),
    bullet('No he suministrado información falsa, incompleta o inducente a error, y los documentos que presento corresponden a la realidad.'),
    bullet('No tengo sanciones, impedimentos o situaciones que deban revelarse y que afecten la capacidad para ejecutar el objeto; si existe una situación relevante, la describo en documento anexo.'),
    bullet('Me comprometo a informar de inmediato a la Institución Educativa cualquier circunstancia sobreviniente que afecte esta declaración durante el proceso o la ejecución.'),
    bullet('Entiendo que la Institución Educativa podrá verificar la información y aplicar las consecuencias previstas en el reglamento, la invitación y las normas aplicables.'),
    ...proponentSignature(),
  ];
}

function annexTransparencyCommitment(process: ProcessDetail): Array<Paragraph | Table> {
  return [
    body('Ciudad y fecha: ____________________, ____ de ____________________ de ________.'),
    body(`Yo, ________________________________________, identificado(a) con ________________________________, en nombre propio / como representante legal de ________________________________________, suscribo el presente compromiso de transparencia para el proceso No. ${processNumber(process)}.`),
    body('Me comprometo a:'),
    bullet('Presentar una oferta preparada de manera independiente, sin acuerdos, prácticas o comunicaciones orientadas a restringir la competencia o alterar la selección objetiva.'),
    bullet('Abstenerme de ofrecer, prometer, entregar, solicitar o aceptar pagos, dádivas, favores o beneficios indebidos relacionados con el proceso.'),
    bullet('Canalizar observaciones, solicitudes y comunicaciones únicamente por los medios institucionales definidos en la invitación.'),
    bullet('Informar a la Institución Educativa cualquier hecho que pueda comprometer la transparencia, la imparcialidad o la libre concurrencia.'),
    bullet('Conservar y aportar los soportes de la oferta cuando sean requeridos dentro de los límites del reglamento y las normas aplicables.'),
    body('Reconozco que el incumplimiento de este compromiso puede generar las consecuencias previstas en la invitación, el reglamento institucional y las normas aplicables.'),
    ...proponentSignature(),
  ];
}

type ContractContext = {
  sectorName: string;
  sectorDescription: string;
  institutionalPurpose: string;
  deliveryDescription: string;
  contractType: string;
};

function contractContext(process: ProcessDetail): ContractContext {
  const itemText = process.marketStudy.comparisons.map((item) => item.description).join(' ').toLocaleLowerCase('es-CO');
  if (/(papel|resma|lapicero|marcador|carpeta|agenda|tóner|toner|grapa|cuaderno|cinta|papeler|útil|util|suministro)/iu.test(itemText)) {
    return {
      sectorName: 'comercialización y distribución de papelería, útiles escolares y suministros de oficina',
      sectorDescription: 'El sector reúne personas naturales comerciantes y empresas que adquieren, distribuyen y entregan bienes de papelería y oficina. La capacidad relevante para este proceso comprende disponibilidad de inventario, logística de entrega, calidad de los bienes, continuidad de suministro y facturación conforme al régimen tributario aplicable.',
      institutionalPurpose: 'La disponibilidad oportuna de estos elementos apoya las actividades académicas, pedagógicas, administrativas y de atención a la comunidad educativa.',
      deliveryDescription: 'La entrega deberá ser integral, en las cantidades requeridas, con empaques y presentación aptos para uso institucional, y estará sujeta a verificación física de referencias, cantidades, estado y calidad antes del recibo a satisfacción.',
      contractType: 'contrato de suministro',
    };
  }
  if (/(software|plataforma|licencia|nube|cloud|sistema)/iu.test(itemText)) {
    return {
      sectorName: 'tecnologías de la información y servicios de software',
      sectorDescription: 'El sector comprende proveedores de licenciamiento, plataformas, soporte y servicios tecnológicos. La capacidad relevante incluye disponibilidad de la solución, continuidad, soporte, protección de la información y condiciones de acceso durante el plazo contractual.',
      institutionalPurpose: 'La solución requerida apoya la continuidad de los procesos académicos, administrativos o de gestión institucional definidos por la IE.',
      deliveryDescription: 'La ejecución comprende habilitación, acceso, soporte, entrega de evidencias de funcionamiento y las actividades de transferencia o capacitación que se determinen expresamente en las especificaciones.',
      contractType: 'contrato de prestación de servicios o suministro tecnológico, según el objeto definitivo',
    };
  }
  return {
    sectorName: 'bienes y servicios relacionados con el objeto institucional requerido',
    sectorDescription: 'El sector se determina por los bienes o servicios identificados en la matriz comparativa. La IE verificará que los eventuales proponentes tengan capacidad jurídica, técnica, operativa y logística suficiente para atender las especificaciones y el plazo del proceso.',
    institutionalPurpose: 'La contratación busca atender una necesidad institucional y contribuir a la continuidad de las actividades académicas, administrativas, pedagógicas y operativas de la IE.',
    deliveryDescription: 'La ejecución deberá acreditarse mediante la entrega o prestación conforme a las especificaciones, cantidades, plazo, evidencias y condiciones que se definan en la invitación y el documento contractual.',
    contractType: 'tipo contractual por definir según el objeto definitivo',
  };
}

function contractorObligations(context: ContractContext): Paragraph[] {
  return [
    bullet('Ejecutar el objeto contratado con autonomía técnica y administrativa, de conformidad con la invitación, la oferta aceptada, las especificaciones y las instrucciones impartidas por la supervisión dentro de sus competencias.'),
    bullet(`Cumplir la entrega o prestación en forma completa, oportuna y verificable. ${context.deliveryDescription}`),
    bullet('Aportar bienes, personal, equipos, transporte, empaques, insumos, soportes y recursos necesarios para la correcta ejecución, salvo aquellos que el documento contractual asigne expresamente a la Institución Educativa.'),
    bullet('Mantener durante la ejecución las calidades, permisos, registros, licencias, afiliaciones y condiciones declaradas en la oferta cuando sean exigibles por la naturaleza del objeto.'),
    bullet('Presentar factura electrónica, documento equivalente o cuenta de cobro, RUT actualizado y los soportes tributarios, laborales y de seguridad social exigibles para el pago.'),
    bullet('Informar por escrito y oportunamente cualquier hecho que pueda retrasar, impedir o afectar la ejecución, proponiendo las medidas de manejo correspondientes sin trasladar a la IE riesgos que le sean imputables.'),
    bullet('Corregir, cambiar, reponer o subsanar sin costo adicional los bienes, servicios o entregables que no cumplan las especificaciones, cantidades, calidad o condiciones ofrecidas.'),
    bullet('Guardar reserva sobre la información institucional conocida durante la ejecución, cuando la naturaleza del objeto lo exija, y abstenerse de utilizarla para fines distintos del contrato.'),
  ];
}

function institutionObligations(): Paragraph[] {
  return [
    bullet('Definir las condiciones técnicas y jurídicas definitivas, conservar la evidencia del proceso y dar respuesta a las observaciones recibidas por el canal institucional.'),
    bullet('Expedir y verificar los soportes presupuestales, contractuales y de publicación que correspondan antes de iniciar la ejecución.'),
    bullet('Designar o identificar la supervisión, facilitar la coordinación necesaria para la ejecución y verificar los entregables o bienes recibidos.'),
    bullet('Tramitar el pago una vez se acrediten la ejecución, el recibo a satisfacción y los documentos exigibles, aplicando las retenciones, deducciones y descuentos que correspondan.'),
    bullet('Adelantar las actuaciones de requerimiento, corrección, recibo o incumplimiento que procedan con fundamento en el expediente, el reglamento institucional y las normas aplicables.'),
  ];
}

function legalFoundation(process: ProcessDetail): string {
  return `El documento se fundamenta en los artículos 2, 67 y 209 de la Constitución Política; la Ley 115 de 1994 en lo relativo a la organización del servicio educativo; el artículo 13 de la Ley 715 de 2001 para la administración y contratación con recursos del Fondo de Servicios Educativos; el Decreto 1075 de 2015 y las disposiciones aplicables a los Fondos de Servicios Educativos; ${regulationDescription(process)}; y las normas civiles, comerciales, tributarias y de contratación que resulten aplicables según la naturaleza y cuantía del proceso.`;
}

function preliminaryStudy(process: ProcessDetail, context: PrecontractualDocumentContext): Array<Paragraph | Table> {
  const narrative = createMarketStudyNarrative(process); const budget = createMarketStudyBudget(process); const regulation = regulationDescription(process); const contract = contractContext(process);
  return [
    ...header(process, 'ESTUDIOS PREVIOS'),
    body(`Proceso No. ${processNumber(process)}`, { center: true, bold: true, after: 100 }),
    body('Documento de planeación contractual', { center: true, bold: true, after: 180 }),
    identificationTable(process, context),
    heading('Considerandos'),
    body(`Que ${process.institutionName} administra recursos del Fondo de Servicios Educativos y, al contratar con cargo a ellos, debe observar los principios de igualdad, moralidad, imparcialidad, publicidad, economía, eficacia, celeridad, responsabilidad y selección objetiva que orientan la función administrativa y el reglamento institucional.`),
    body(`Que la planeación debe establecer la necesidad, el objeto, las especificaciones, el análisis del sector, el presupuesto, los riesgos, las condiciones de ejecución y la disponibilidad presupuestal, atendiendo a ${regulation}.`),
    body(`Que el estudio de mercado aprobado documenta ${process.quotations.length} cotización(es), ${process.marketStudy.comparisons.length} grupo(s) de ítems comparables y un presupuesto de referencia; dicha evidencia sirve para estructurar el proceso, pero no selecciona proveedor ni sustituye la evaluación de las ofertas que se presenten.`),
    heading('1. Identificación del proceso y planeación institucional'),
    body(`Los presentes estudios previos sustentan la decisión de estructurar el proceso contractual identificado con el consecutivo ${processNumber(process)}, asignado automáticamente y de forma independiente para esta Institución Educativa. Su incorporación al Plan Anual de Adquisiciones o al instrumento institucional equivalente, el proyecto PEI/POAI asociado y el rubro presupuestal deberán verificarse antes de publicar.`),
    table(['Elemento', 'Información disponible / actuación requerida'], [
      ['Institución Educativa', process.institutionName], ['Consecutivo del proceso', processNumber(process)], ['Documento presupuestal', cdpDescription(context)], ['Archivo de soporte', context.cdpOriginalName], ['Reglamento aplicable', regulation], ['Tipo contractual', 'Suministro, prestación de servicios u otro tipo que debe corresponder exactamente al objeto definitivo.'],
    ]),
    heading('2. Fundamento jurídico y reglamentario'),
    body(legalFoundation(process)),
    body('La autonomía del Fondo de Servicios Educativos no elimina el deber de planeación ni la obligación de sujetarse al procedimiento aprobado por el Consejo Directivo. Por ello, el reglamento vinculado al expediente gobierna las formalidades, requisitos, autorizaciones, garantías, publicación y demás variables propias de la IE.'),
    body('Cuando la cuantía y el régimen aplicable exijan un trámite de mínima cuantía u otro procedimiento especial, la IE deberá ajustar el cronograma, la convocatoria, la evaluación y la aceptación al marco correspondiente, sin reducir los términos mínimos de publicidad, observaciones, ofertas o traslado de evaluación.'),
    heading('3. Descripción de la necesidad'),
    body(narrative.demandAnalysis),
    body(contract.institutionalPurpose),
    body('La necesidad no se satisface con la sola existencia de cotizaciones. La IE debe verificar antes de publicar que las cantidades, las condiciones de entrega y las especificaciones responden al requerimiento institucional, que no fraccionan indebidamente el objeto y que existe soporte presupuestal suficiente.'),
    heading('4. Objeto, alcance y tipo de contrato'),
    body(narrative.objectDescription),
    body(`La naturaleza preliminar corresponde a ${contract.contractType}. El alcance comprende la entrega o prestación integral de los ítems definidos, con sus cantidades, calidad y condiciones técnicas. La contratación no admite sustituciones, componentes o condiciones que modifiquen el objeto sin que se documenten y se incorporen mediante el instrumento procedente antes de la presentación de ofertas.`),
    heading('5. Especificaciones técnicas y clasificación de los bienes o servicios'),
    body('La siguiente relación se deriva de los grupos comparables incluidos en el estudio de mercado aprobado. La IE debe complementar características de presentación, compatibilidad, marca de referencia permitida, garantía técnica, lugar de entrega y demás condiciones estrictamente necesarias antes de publicar.'),
    specificationTable(process),
    heading('6. Análisis del sector: demanda, oferta y fuentes examinadas'),
    body(`Definición del sector: el objeto se ubica en el sector de ${contract.sectorName}. ${contract.sectorDescription}`),
    body(`Análisis de la demanda: ${narrative.demandAnalysis}`),
    body(`Análisis de la oferta: ${narrative.supplyAnalysis}`),
    body(`Se examinaron ${process.quotations.length} cotización(es). La comparación se limita a los bienes o servicios con descripción y cantidad equivalentes; por tanto, la información restante se conserva como evidencia del expediente pero no altera el presupuesto de referencia ni constituye una lista de oferentes habilitados.`),
    quoteAnalysisTable(process),
    heading('7. Metodología económica y presupuesto oficial'),
    body('Para cada ítem comparable se toma el valor unitario identificado en cada cotización, se verifica que descripción y cantidad sean equivalentes y se calcula el promedio aritmético simple de los valores unitarios comparables. El presupuesto se obtiene al multiplicar ese valor de referencia por la cantidad requerida. Esta metodología permite identificar un valor de referencia, no fija un precio de adjudicación ni obliga a aceptar una oferta que no cumpla los requisitos jurídicos y técnicos.'),
    body(`El presupuesto base de referencia es ${currency(budget.baseEstimate)}.`),
    ...(budget.totalEstimate === null ? [body(budget.taxNote)] : [body(`Con la evidencia tributaria homogénea identificada en la matriz, el IVA estimado es ${currency(budget.taxEstimate)} y el total de referencia es ${currency(budget.totalEstimate)}.`)]),
    body(`La base tributaria y las condiciones económicas registradas son: ${narrative.taxBasis}`),
    heading('8. Disponibilidad presupuestal, forma de pago y plazo'),
    body(`El proceso cuenta con ${cdpDescription(context)}, contenido en ${context.cdpOriginalName}. Antes de publicar, la IE deberá confirmar rubro, fuente, apropiación, vigencia y suficiencia del CDP frente al presupuesto oficial definitivo.`),
    body('El pago se realizará contra recibo a satisfacción, factura, documento equivalente o cuenta de cobro y verificación de los documentos exigibles. La obligación de pago se subordina a la apropiación y disponibilidad presupuestal, al cumplimiento del objeto y a la acreditación de las obligaciones tributarias, de seguridad social y demás soportes que correspondan.'),
    body('No se incorporan anticipos, pagos parciales, plazo de ejecución, lugar de entrega, periodicidad ni condiciones logísticas que no estén definidas por la IE. Estos elementos deberán expresarse en la invitación y en el documento de aceptación o contrato, de modo que puedan ser evaluados, supervisados y exigidos.'),
    heading('9. Modalidad, requisitos habilitantes y criterio de selección'),
    body(`La modalidad y la regla de selección se determinan por la cuantía, el objeto, ${regulation} y las normas aplicables. La IE deberá justificar en el expediente que los requisitos son proporcionales a la naturaleza, valor y complejidad del objeto y que no restringen injustificadamente la participación.`),
    body('La selección se realizará con aplicación sucesiva de las verificaciones jurídicas, técnicas y económicas. La oferta que resulte favorable deberá cumplir la totalidad de las condiciones habilitantes y técnicas, presentar una propuesta económica consistente y ajustarse al presupuesto oficial y a la regla objetiva definida para el proceso.'),
    proposalRequirementsTable(),
    heading('10. Obligaciones del futuro contratista'),
    ...contractorObligations(contract),
    heading('11. Obligaciones de la Institución Educativa'),
    ...institutionObligations(),
    heading('12. Tipificación, estimación y asignación de riesgos'),
    body('La matriz identifica los hechos previsibles que pueden alterar la selección o la ejecución, su posible consecuencia, la parte que debe administrarlos y la medida de tratamiento. La estimación final, controles y distribución deberán adecuarse al objeto definitivo y a las exigencias del reglamento institucional; no se transfiere a un proponente un riesgo que sea propio de la planeación, de la disponibilidad presupuestal o de las decisiones de la IE.'),
    detailedRiskTable(),
    heading('13. Garantías, supervisión, impuestos y publicidad'),
    guaranteeAndSupervisionTable(process),
    body('La IE debe dejar expresamente definido, antes de publicar, si exige garantías, sus amparos, porcentaje y vigencia, de acuerdo con el reglamento, el valor, el plazo y los riesgos. Asimismo deberá señalar el supervisor, las retenciones, estampillas, descuentos y demás cargas aplicables sin alterar el precio ofertado con cálculos no documentados.'),
    heading('14. Cronograma precontractual de referencia'),
    body('El cronograma se calcula desde el día hábil colombiano siguiente a la generación de este documento. Es una referencia mínima para el trámite que corresponda; la IE deberá completar horas, canal de recepción y ampliar términos si su reglamento, el medio de publicación o las condiciones del proceso lo exigen.'),
    scheduleTable(context),
    heading('15. Conclusión'),
    body('De acuerdo con la necesidad, las especificaciones, el estudio de mercado y el CDP relacionados, se cuenta con información para estructurar el proceso. La decisión de publicar, evaluar, aceptar oferta y comprometer recursos corresponde a la Institución Educativa mediante las actuaciones y autorizaciones que procedan.'),
    ...signature(process, context.generatedAt),
  ];
}

function publicInvitation(process: ProcessDetail, context: PrecontractualDocumentContext): Array<Paragraph | Table> {
  const narrative = createMarketStudyNarrative(process); const budget = createMarketStudyBudget(process); const regulation = regulationDescription(process); const contract = contractContext(process);
  return [
    ...header(process, 'INVITACIÓN PÚBLICA'),
    body(`Proceso No. ${processNumber(process)}`, { center: true, bold: true, after: 180 }),
    identificationTable(process, context),
    heading('Considerandos'),
    body(`${process.institutionName}, por medio de la presente invitación, convoca a presentar ofertas para satisfacer una necesidad institucional financiada con recursos del Fondo de Servicios Educativos. La invitación, los estudios previos, el estudio de mercado, el CDP, los anexos, las observaciones, las respuestas y las adendas integran los documentos del proceso.`),
    body(legalFoundation(process)),
    body(`El proponente debe revisar integralmente estos documentos antes de ofertar. La presentación de la propuesta supone que conoce el objeto, el presupuesto, las especificaciones, los requisitos, el cronograma y las condiciones de ejecución. La omisión de documentos o información sustancialmente requerida será asumida por el proponente, sin perjuicio de las reglas de subsanación que correspondan.`),
    heading('CAPÍTULO I. INFORMACIÓN GENERAL DEL PROCESO'),
    heading('1. Objeto, alcance y modalidad'),
    body(narrative.objectDescription),
    body(`La naturaleza prevista es ${contract.contractType}. La modalidad se determina por la cuantía, el objeto, ${regulation} y las normas aplicables. Podrán participar personas naturales, personas jurídicas y formas asociativas legalmente habilitadas que cumplan las condiciones de esta invitación y no estén incursas en inhabilidades, incompatibilidades, conflictos de interés o prohibiciones para contratar.`),
    body(`El alcance contractual comprende la ejecución integral de las especificaciones y cantidades relacionadas. ${contract.deliveryDescription}`),
    heading('2. Presupuesto oficial, CDP y condiciones tributarias'),
    body(`El presupuesto base de referencia es ${currency(budget.baseEstimate)}.${budget.totalEstimate === null ? ` ${budget.taxNote}` : ` El total estimado de referencia con IVA es ${currency(budget.totalEstimate)}.`} El soporte de disponibilidad es ${cdpDescription(context)}, incorporado en ${context.cdpOriginalName}.`),
    body(`Tratamiento tributario documentado: ${narrative.taxBasis}. El valor propuesto deberá comprender todos los costos, gastos, transporte, seguros, cargas, impuestos y obligaciones que sean necesarios para ejecutar el objeto, excepto los que la invitación determine expresamente a cargo de la IE.`),
    body('El proponente debe discriminar valores unitarios antes de IVA, tarifa y valor del impuesto cuando aplique, totales por ítem y total general. La IE practicará en el pago las retenciones, deducciones, tasas, estampillas y demás descuentos que correspondan conforme al RUT, la naturaleza del pago, las normas vigentes y los soportes aportados.'),
    heading('3. Veedurías ciudadanas, transparencia y reglas de participación'),
    body('Se convoca a las veedurías ciudadanas, organizaciones de control social y demás interesados a acompañar el proceso dentro de las facultades legales. Los participantes deberán actuar con buena fe, transparencia y moralidad, abstenerse de acuerdos restrictivos, pagos indebidos o actuaciones que afecten la selección objetiva, e informar cualquier hecho relevante por los canales institucionales.'),
    bullet('Las observaciones a la invitación se recibirán únicamente por el canal institucional, dentro del término del cronograma. La IE emitirá respuesta motivada y, de ser necesario, expedirá adenda antes del inicio del plazo de ofertas.'),
    bullet('Las adendas hacen parte de la invitación. Cuando modifiquen requisitos, especificaciones, presupuesto o fechas, deberán incorporar la actualización correspondiente y respetar el reglamento y los plazos aplicables.'),
    bullet('La oferta se presentará completa, legible, firmada cuando corresponda y acompañada de los documentos exigidos, por el canal, fecha y hora que informe la publicación definitiva. No se evaluarán ofertas presentadas después del cierre.'),
    bullet('Las consultas personales, verbales o telefónicas no modifican la invitación ni generan obligaciones para la IE; solo los documentos publicados en el expediente pueden precisarla o modificarla.'),
    heading('4. Especificaciones técnicas y condiciones de entrega'),
    body('El proponente deberá cotizar la totalidad de los ítems obligatorios, excepto si la IE define lotes o reglas distintas antes de publicar. Las cantidades, códigos y descripciones siguientes son parte integral de la oferta y determinan el alcance mínimo verificable.'),
    specificationTable(process),
    body('El plazo de ejecución, lugar de entrega, horario, responsable de recibo, condiciones de transporte, instalación, capacitación o garantía técnica se deben completar en la publicación definitiva conforme al objeto. La falta de un dato operativo no autoriza a inferirlo de una cotización.'),
    heading('CAPÍTULO II. REQUISITOS HABILITANTES Y CONTENIDO DE LA OFERTA'),
    heading('5. Documentos jurídicos, técnicos y económicos'),
    body('Los requisitos habilitantes se verifican como cumple o no cumple, salvo que la IE defina una regla objetiva adicional permitida por su reglamento. El proponente deberá presentar los documentos legibles, vigentes y coherentes con la persona que ofrece, el objeto y las condiciones del proceso. Los requisitos no podrán modificarse después de iniciado el plazo de presentación de ofertas salvo mediante adenda válida.'),
    proposalRequirementsTable(),
    heading('6. Oferta económica y vigencia'),
    body('La oferta debe ser clara, legible y estar firmada cuando corresponda. El precio total deberá coincidir con la suma de los valores unitarios, cantidades e IVA informado. La vigencia, el plazo propuesto, las condiciones de entrega y la forma de pago deberán señalarse en la oferta y no podrán contradecir las condiciones definitivas de la IE.'),
    body('No se aceptarán valores indeterminados, expresiones como “según consumo” o condiciones que impidan comparar la oferta con las cantidades y especificaciones solicitadas. Las correcciones aritméticas solo se realizarán en los eventos expresamente permitidos por el reglamento o la invitación.'),
    heading('Anexo 1. Oferta económica'),
    ...annexEconomicOffer(process),
    heading('CAPÍTULO III. EVALUACIÓN Y SELECCIÓN OBJETIVA'),
    heading('7. Verificación, evaluación y ofertas con precio anormal'),
    body('La IE verificará, en primer lugar, la capacidad jurídica, los documentos habilitantes y el cumplimiento de las especificaciones técnicas. Sobre las ofertas que cumplan estas condiciones aplicará la regla económica objetiva prevista en el reglamento y dejará constancia en el informe de evaluación de cada requisito, verificación, solicitud de aclaración y resultado.'),
    body('La selección no se produce por el solo hecho de presentar el menor precio: debe existir cumplimiento integral de las condiciones habilitantes, técnicas y económicas de la invitación. Cuando dos o más ofertas cumplan en igualdad de condiciones, se aplicarán los criterios de desempate previstos en el reglamento institucional y las normas aplicables.'),
    body('Si se identifica una oferta con precio aparentemente anormalmente bajo, inconsistente o insuficiente para cubrir el objeto, la IE podrá solicitar explicación y soportes. La decisión deberá motivarse con la respuesta del proponente, la evidencia del estudio de mercado y las reglas aplicables, sin utilizar este mecanismo para alterar arbitrariamente las condiciones de selección.'),
    heading('8. Causales de rechazo, desempate y declaratoria'),
    bullet('La oferta será rechazada cuando sea extemporánea, no esté firmada si la firma es exigible, provenga de persona inhabilitada, incompatible o sin capacidad para contratar, o se presente por un canal diferente al indicado sin autorización institucional.'),
    bullet('También será rechazada cuando omita un requisito no subsanable, incumpla una especificación obligatoria, presente cotización parcial sin que se permitan lotes, supere el presupuesto oficial, contenga valores indeterminados o inconsistentes que impidan su comparación, o incorpore información falsa.'),
    bullet('Será causal de rechazo la manipulación, el acuerdo restrictivo, el conflicto de interés no revelado o cualquier actuación que comprometa la transparencia o la selección objetiva, sin perjuicio de las acciones que procedan.'),
    bullet('La IE podrá declarar desierto el proceso si no se recibe oferta, si ninguna oferta cumple las condiciones exigidas o si se presenta otra causa prevista en el reglamento o las normas aplicables. La subsanación, el desempate y la decisión de aceptación o declaratoria deberán constar de manera motivada en el expediente.'),
    heading('CAPÍTULO IV. CONDICIONES DE EJECUCIÓN'),
    heading('9. Obligaciones, supervisión, riesgos y garantías'),
    body('Las siguientes obligaciones hacen parte de las condiciones mínimas de ejecución y deberán incorporarse en el documento de aceptación o contrato, junto con las obligaciones específicas que demande el objeto.'),
    ...contractorObligations(contract),
    body('La IE, por su parte, deberá definir las condiciones definitivas, designar supervisión, permitir la coordinación razonable de la ejecución, verificar el cumplimiento y tramitar el pago conforme a las condiciones aceptadas.'),
    ...institutionObligations(),
    detailedRiskTable(),
    guaranteeAndSupervisionTable(process),
    heading('10. Perfeccionamiento, ejecución y pago'),
    body('La aceptación de la oferta o el documento contractual correspondiente deberá contener como mínimo las condiciones aceptadas, valor, plazo, forma de pago, lugar, supervisor, obligaciones, garantías cuando se exijan, régimen tributario y documentos de soporte. La ejecución inicia solo cuando se cumplan los requisitos institucionales, presupuestales y de legalización aplicables.'),
    body('El contratista no podrá ceder total o parcialmente las obligaciones sin autorización previa y escrita de la IE cuando el reglamento o el documento contractual lo requiera. Deberá mantener indemne a la IE frente a reclamaciones de terceros causadas por hechos u omisiones imputables a su ejecución, dentro de los límites legales aplicables.'),
    heading('CAPÍTULO V. CRONOGRAMA Y ANEXOS'),
    heading('11. Cronograma del proceso'),
    body('Las fechas se calculan desde el día hábil colombiano siguiente a la generación. La IE debe fijar horas de apertura y cierre, canal de recepción y los términos que su reglamento exija. Los plazos se ampliarán cuando corresponda para respetar los mínimos de publicidad y participación.'),
    scheduleTable(context),
    body('La presente invitación se expide para los fines del proceso y deberá publicarse solo después de completar sus variables institucionales y surtir las aprobaciones internas que correspondan.'),
    ...signature(process, context.generatedAt),
    heading('Anexo 2. Carta de presentación'),
    ...annexPresentationLetter(process),
    heading('Anexo 3. Declaración de inhabilidades e incompatibilidades'),
    ...annexDisqualifications(process),
    heading('Anexo 4. Compromiso de transparencia'),
    ...annexTransparencyCommitment(process),
  ];
}

export async function createPrecontractualDraftDocx(process: ProcessDetail, kind: PrecontractualDocumentKind, context: PrecontractualDocumentContext): Promise<Buffer> {
  const title = kind === 'PRELIMINARY_STUDY' ? 'Estudio previo o de conveniencia' : 'Invitación pública';
  const children = kind === 'PRELIMINARY_STUDY' ? preliminaryStudy(process, context) : publicInvitation(process, context);
  return Packer.toBuffer(new Document({ creator: process.institutionName, title, description: title, sections: [{ properties: { page: { margin: { top: 1050, right: 1050, bottom: 1050, left: 1050 } } }, children }] }));
}
