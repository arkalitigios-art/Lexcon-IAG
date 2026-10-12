export interface SegmentoDona { valor: number; longitud: number; desplazamiento: number }

/** Reparte 100 unidades de trazo entre valores no negativos. */
export function calcularSegmentos(valores: readonly number[]): SegmentoDona[] {
  const limpios = valores.map((valor) => Math.max(0, valor));
  const total = limpios.reduce((suma, valor) => suma + valor, 0);
  if (total === 0) return limpios.map(() => ({ valor: 0, longitud: 0, desplazamiento: 0 }));
  let acumulado = 0;
  return limpios.map((valor) => {
    const longitud = (valor / total) * 100;
    const segmento = { valor, longitud, desplazamiento: acumulado === 0 ? 0 : -acumulado };
    acumulado += longitud;
    return segmento;
  });
}
