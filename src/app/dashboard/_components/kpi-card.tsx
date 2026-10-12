import Link from 'next/link';
import type { ReactNode } from 'react';

export type TonoKpi = 'green' | 'blue' | 'amber' | 'rose';

export function KpiCard({ tono, icono, valor, etiqueta, href, accion }: { tono: TonoKpi; icono: ReactNode; valor: number; etiqueta: string; href?: string; accion?: string }) {
  const contenido = <>
    <span className="kpi-icon">{icono}</span>
    {accion && <span className="kpi-action">{accion} <span aria-hidden="true">→</span></span>}
    <span className="kpi-body"><strong className="kpi-value">{valor}</strong><span className="kpi-label">{etiqueta}</span></span>
  </>;
  return href ? <Link className={`kpi-card kpi-${tono}`} href={href}>{contenido}</Link> : <div className={`kpi-card kpi-${tono}`}>{contenido}</div>;
}
