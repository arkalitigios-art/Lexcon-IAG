export function phaseLabel(phase: string): string {
  const labels: Record<string, string> = { MARKET: 'Etapa de mercado', BUDGET: 'Disponibilidad presupuestal', PRECONTRACTUAL: 'Etapa precontractual', PUBLICATION: 'Publicación de la invitación', OFFERS: 'Recepción de ofertas', EVALUATION: 'Evaluación', DECISION: 'Decisión de selección', FORMALIZATION: 'Formalización', CONTRACTUAL_REVIEW: 'Revisión jurídica contractual', CONTRACTUAL_PUBLICATION: 'Publicación contractual', EXECUTION: 'Ejecución', LIQUIDATION_REVIEW: 'Revisión jurídica de liquidación', POSTCONTRACTUAL: 'Etapa poscontractual', CLOSURE: 'Cierre', CLOSED: 'Proceso cerrado' };
  return labels[phase] ?? phase;
}

export function statusLabel(status: string): string {
  if (status === 'BLOCKED_REGULATION') return 'Actuación de mercado bloqueada';
  if (status === 'BLOCKED_MARKET_DATA') return 'Cotizaciones requieren corrección';
  if (status === 'PENDING_QUOTES') return 'Pendiente de cotizaciones';
  if (status === 'CORRECTIONS_REQUESTED') return 'Correcciones solicitadas';
  if (status === 'RECEIVED') return 'Cotizaciones recibidas';
  if (status === 'PENDING_ACTION') return 'Actuación pendiente';
  if (status === 'COMPLETED') return 'Proceso cerrado';
  return status;
}

export function ProcessStatus({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
