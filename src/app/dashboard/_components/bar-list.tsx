export function BarList({ elementos, vacio }: { elementos: Array<{ etiqueta: string; valor: number }>; vacio: string }) {
  if (!elementos.length) return <p className="chart-empty">{vacio}</p>;
  const maximo = Math.max(1, ...elementos.map((elemento) => elemento.valor));
  return <ul className="bar-list">{elementos.map((elemento, indice) => <li key={elemento.etiqueta}>
    <div className="bar-list-head"><span>{elemento.etiqueta}</span><strong>{elemento.valor}</strong></div>
    <div className="bar-track" aria-hidden="true"><div className={`bar-fill bar-fill-${indice % 2}`} style={{ width: `${(elemento.valor / maximo) * 100}%` }} /></div>
  </li>)}</ul>;
}
