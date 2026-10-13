import { calcularSegmentos } from '@/modules/admin/donut-segments';

export type TonoDona = 'green' | 'amber';

export function Donut({ partes, etiquetaTotal }: { partes: Array<{ etiqueta: string; valor: number; tono: TonoDona }>; etiquetaTotal: string }) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const segmentos = calcularSegmentos(partes.map((parte) => parte.valor));
  const descripcion = `${total} ${etiquetaTotal}: ${partes.map((parte) => `${parte.valor} ${parte.etiqueta.toLowerCase()}`).join(', ')}`;
  return <figure className="donut"><div className="donut-chart"><svg viewBox="0 0 140 140" role="img" aria-label={descripcion}>
    <circle className="donut-track" cx="70" cy="70" r="52" pathLength={100} />
    {segmentos.map((segmento, indice) => segmento.longitud > 0 && <circle key={partes[indice].etiqueta} className={`donut-part donut-${partes[indice].tono}`} cx="70" cy="70" r="52" pathLength={100} strokeDasharray={`${segmento.longitud} ${100 - segmento.longitud}`} strokeDashoffset={segmento.desplazamiento} />)}
  </svg><div className="donut-center" aria-hidden="true"><strong>{total}</strong><small>{etiquetaTotal}</small></div></div>
  <figcaption className="donut-legend">{partes.map((parte) => <span key={parte.etiqueta}><i className={`dot dot-${parte.tono}`} aria-hidden="true" />{parte.etiqueta} {parte.valor}</span>)}</figcaption></figure>;
}
