import type { ProcessDetail } from '@/modules/processes/process-queries';
import { createMarketStudyClassifications, createMarketStudyNarrative } from '@/modules/automation/market-study-narrative';
import { createMarketStudyBudget, taxTreatmentLabel } from '@/modules/automation/market-study-financials';
import { marketStudyRevisionDirectives } from '@/modules/automation/market-study-revisions';

function sourceLabel(source: string, quotations: ProcessDetail['quotations']): string {
  return quotations.find((quote) => quote.originalName === source)?.supplierName ?? source.replace(/\.(pdf|docx)$/i, '').replaceAll('_', ' ');
}

function currency(value: string | number | null): string {
  if (value === null) return 'No identificado';
  if (typeof value === 'string' && value.includes('$')) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(numeric) : String(value);
}

function itemLabel(value: string): string {
  return value.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
}

function matrixQuoteSummary(process: ProcessDetail, source: string): { totalValue: number | null; tax: string; treatment: string } {
  const values = process.marketStudy.comparisons.flatMap((comparison) => comparison.values.filter((value) => value.source === source));
  const totals = values.map((value) => Number(value.totalValue)).filter(Number.isFinite);
  const rates = [...new Set(values.map((value) => value.taxRate).filter((value): value is string => Boolean(value)))];
  const treatments = [...new Set(values.map((value) => value.taxTreatment))];
  return {
    totalValue: totals.length ? totals.reduce((sum, value) => sum + value, 0) : null,
    tax: rates.length > 1 ? `${rates.join(', ')} según ítem` : rates[0] ?? 'No identificado',
    treatment: treatments.length > 1 ? 'Varía según los ítems de la matriz' : treatments[0] ? taxTreatmentLabel(treatments[0]) : 'Sin datos verificables',
  };
}

export function MarketStudyDocument({ process, status }: { process: ProcessDetail; status: string }) {
  const sources = [...new Set(process.marketStudy.comparisons.flatMap((comparison) => comparison.values.map((value) => value.source)))];
  const regulation = process.marketStudy.regulationVersion
    ? `Versión ${process.marketStudy.regulationVersion}${process.marketStudy.regulationName ? ` · ${process.marketStudy.regulationName}` : ''}`
    : 'Sin versión institucional vinculada';
  const budget = createMarketStudyBudget(process);
  const narrative = createMarketStudyNarrative(process);
  const classifications = createMarketStudyClassifications(process);
  const revisions = marketStudyRevisionDirectives(process);
  const statusLabel = status === 'APPROVED' ? 'Aprobado jurídicamente' : status === 'CORRECTIONS_REQUESTED' ? 'Correcciones solicitadas' : 'Pendiente de revisión jurídica';

  const city = process.institutionCity.trim() || 'Ciudad pendiente de actualización institucional';
  return <article className="market-study-document" aria-labelledby="market-study-title">
    <header className="market-study-document-header">
      <div><p className="section-kicker">Documento de estudio de mercado</p><h2 id="market-study-title">Estudio de mercado</h2><p>Fondo de Servicios Educativos · {process.institutionName} · {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p></div>
      <div className="document-actions"><span className="document-status">{statusLabel}</span><a className="secondary-button document-print-button" href={`/api/processes/${process.id}/market-study-document`}>Descargar Word</a></div>
    </header>

    <section className="market-study-summary" aria-label="Resumen del documento"><div><small>Fuentes procesadas</small><strong>{process.quotations.length}</strong><span>cotizaciones</span></div><div><small>Ítems comparables</small><strong>{process.marketStudy.comparisons.length}</strong><span>grupos analizados</span></div><div><small>Presupuesto base estimado</small><strong>{currency(budget.baseEstimate)}</strong><span>{budget.totalEstimate === null ? 'antes de IVA' : `IVA estimado: ${currency(budget.taxEstimate)} · total con IVA: ${currency(budget.totalEstimate)}`}</span></div></section>

    <section><h3>1. Identificación del estudio</h3><dl className="market-document-data"><div><dt>Institución Educativa</dt><dd>{process.institutionName}</dd></div><div><dt>Ciudad o municipio</dt><dd>{city}</dd></div><div><dt>Fase del expediente</dt><dd>Estudio de mercado</dd></div><div><dt>Fecha de elaboración</dt><dd>{new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</dd></div><div><dt>Contexto institucional vinculado</dt><dd>{regulation}</dd></div></dl></section>

    <section><h3>2. Considerandos y fundamentos jurídicos y normativos</h3><p>Que el artículo 209 de la Constitución Política establece que la función administrativa está al servicio de los intereses generales y se desarrolla con fundamento en los principios de igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad.</p><p>Que la Ley 715 de 2001 regula los Fondos de Servicios Educativos y su administración, y que el Decreto 1075 de 2015 compila la reglamentación aplicable al manejo de dichos fondos.</p><p>Que la Institución Educativa adelanta sus actuaciones conforme al reglamento o manual de contratación institucional vinculado al expediente: {regulation}.</p><p>Que, para establecer una referencia económica del proceso, se examinaron las cotizaciones allegadas y se estructuraron los valores unitarios identificables, las cantidades y los ítems comparables.</p></section>

    <section><h3>3. Objeto del estudio</h3><p>{narrative.objectDescription}</p></section>

    <section><h3>4. Clasificación del bien o servicio</h3><p>La clasificación se organiza por cada bien o servicio identificado en la matriz comparativa. Los códigos se presentan para la validación institucional dentro del expediente.</p><div className="market-matrix classification-matrix"><table><thead><tr><th>Ítem</th><th>Descripción del bien o servicio</th><th>Código UNSPSC</th><th>Clasificación</th><th>Unidad de medida</th></tr></thead><tbody>{classifications.map((classification) => <tr key={`${classification.item}-${classification.description}`}><td>{classification.item}</td><td>{classification.description}</td><td>{classification.code}</td><td>{classification.classification}</td><td>{classification.unit}</td></tr>)}</tbody></table></div></section>

    <section><h3>5. Análisis de oferta y demanda</h3><p><strong>Demanda institucional.</strong> {narrative.demandAnalysis}</p><p><strong>Oferta observada.</strong> {narrative.supplyAnalysis}</p></section>

    <section><h3>6. Antecedentes y fuentes examinadas</h3><p>La Institución Educativa aportó las siguientes cotizaciones. Los originales privados permanecen vinculados al expediente y el estudio solo incorpora los campos estructurados.</p>{revisions.sourcesAsTable ? <div className="market-matrix source-summary-table"><table><thead><tr><th>No.</th><th>Proveedor</th><th>Cotización comparada</th><th>Fecha de recepción</th></tr></thead><tbody>{process.quotations.map((quote, index) => <tr key={quote.quoteId}><td>{index + 1}</td><td>{quote.supplierName ?? 'Proveedor por verificar'}</td><td>{quote.originalName}</td><td>{new Date(quote.createdAt).toLocaleDateString('es-CO')}</td></tr>)}</tbody></table></div> : <ol className="market-source-list">{process.quotations.map((quote) => <li key={quote.quoteId}><strong>{quote.supplierName ?? 'Proveedor por verificar'}</strong><span>{quote.originalName} · recibido el {new Date(quote.createdAt).toLocaleDateString('es-CO')}</span></li>)}</ol>}</section>

    <section><h3>7. Metodología aplicada</h3><p>Se comparan únicamente registros provenientes de fuentes distintas que contienen la misma descripción normalizada y la misma cantidad. Para cada grupo se calcula el promedio aritmético simple de los valores unitarios comparables: suma de los valores unitarios ÷ número de cotizaciones comparables. El resultado se redondea al peso colombiano para su presentación. El rango mínimo–máximo se conserva como indicador de dispersión.</p></section>

    <section><h3>8. Matriz comparativa de mercado</h3>{process.marketStudy.comparisons.length ? <div className="market-matrix"><table><thead><tr><th>Ítem</th><th>Cantidad</th>{sources.map((source) => <th key={source}>{sourceLabel(source, process.quotations)}</th>)}<th>Promedio unitario base (sin IVA)</th><th>Rango unitario base (sin IVA)</th><th>Valor base estimado</th></tr></thead><tbody>{process.marketStudy.comparisons.map((comparison) => { const estimate = Math.round(Number(comparison.arithmeticMean) * Number(comparison.quantity)); return <tr key={`${comparison.description}-${comparison.quantity}`}><td><strong>{itemLabel(comparison.description)}</strong></td><td>{comparison.quantity}</td>{sources.map((source) => { const value = comparison.values.find((item) => item.source === source); return <td key={source}>{value ? <><strong>Base sin IVA: {currency(value.unitValue)}</strong><small className="tax-field">IVA informado: {value.taxRate ?? 'No identificado'}</small><small>{taxTreatmentLabel(value.taxTreatment)}</small><small>{value.taxTreatment === 'INCLUDED_IN_REPORTED_TOTAL' ? 'Total reportado (incluye IVA)' : value.taxTreatment === 'EXCLUDED_FROM_REPORTED_TOTAL' ? 'Total reportado (sin IVA)' : 'Total reportado'}: {currency(value.totalValue)}</small></> : <span className="not-compared">No comparable</span>}</td>; })}<td><strong>{currency(comparison.arithmeticMean)}</strong><small>base sin IVA de {comparison.values.length} cotizaciones comparables</small></td><td><strong>{currency(comparison.minimum)}</strong><small>hasta {currency(comparison.maximum)}</small></td><td><strong>{currency(estimate)}</strong><small>promedio base × cantidad</small></td></tr>; })}</tbody><tfoot><tr><th colSpan={2}>Total de ítems comparables</th>{sources.map((source) => { const summary = matrixQuoteSummary(process, source); return <td key={source}><strong>{currency(summary.totalValue)}</strong><small>IVA: {summary.tax}</small><small>{summary.treatment}</small></td>; })}<td colSpan={3}>Sumatoria de los ítems de esta matriz</td></tr><tr><th colSpan={2 + sources.length}>Presupuesto base estimado (sin IVA)</th><th colSpan={3}>{currency(budget.baseEstimate)}</th></tr>{budget.totalEstimate !== null && <tr><th colSpan={2 + sources.length}>IVA estimado y total con IVA</th><th colSpan={3}>{currency(budget.taxEstimate)} · {currency(budget.totalEstimate)}</th></tr>}</tfoot></table></div> : <p className="notice">LEXCON no encontró al menos dos fuentes con el mismo ítem y cantidad para generar la matriz comparativa.</p>}</section>


    <section><h3>9. Presupuesto estimado</h3><p>Con los {process.marketStudy.comparisons.length} grupo(s) de ítems comparables identificados, el presupuesto base estimado, antes de IVA, es de <strong>{currency(budget.baseEstimate)}</strong>.</p>{budget.totalEstimate !== null && <p>El IVA estimado es <strong>{currency(budget.taxEstimate)}</strong>; el total estimado con IVA es <strong>{currency(budget.totalEstimate)}</strong>.</p>}<p>{budget.taxNote} {narrative.taxBasis}</p></section>

    <section><h3>10. Conclusión</h3><p>El presente estudio consolida {process.quotations.length} cotización(es) y {process.marketStudy.comparisons.length} grupo(s) de ítems comparables. La cifra base estimada es una referencia técnica de mercado y no constituye selección de proveedor ni decisión de contratación.</p></section>

    <section className="market-study-signature"><p>Se expide en {city}, a los {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}.</p><div>________________________________________<strong>{process.responsibleName}</strong><span>Rector(a) / Ordenador(a) del gasto</span></div></section>

    <footer><strong>Estudio de mercado.</strong><span>La referencia económica se fundamenta en la evidencia documental enlazada al expediente.</span></footer>
  </article>;
}
