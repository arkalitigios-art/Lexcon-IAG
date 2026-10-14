'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavigationItem } from './workspace-shell';

export function SidebarMenu({ items, activePath }: { items: NavigationItem[]; activePath: string }) {
  const listaRef = useRef<HTMLDivElement>(null);
  const desplazables = items.filter((item) => !item.pinned);
  const fijas = items.filter((item) => item.pinned);

  // Deja visible la opción activa desplazando SOLO la lista de opciones (las fijas, como "Mi cuenta", ya están siempre a la vista).
  // `scrollIntoView` también movía la ventana (el menú es `sticky` dentro de un marco con margen) y dejaba una franja en blanco arriba.
  useEffect(() => {
    const lista = listaRef.current;
    const enlace = lista?.querySelector<HTMLElement>('a.active');
    if (!lista || !enlace) return;
    const margen = 12;
    const caja = lista.getBoundingClientRect(); const posicion = enlace.getBoundingClientRect();
    if (posicion.top < caja.top + margen) lista.scrollTop -= caja.top + margen - posicion.top;
    else if (posicion.bottom > caja.bottom - margen) lista.scrollTop += posicion.bottom - (caja.bottom - margen);
  }, [activePath]);

  // Marca con data-fade-top / data-fade-bottom los bordes por los que aún hay opciones fuera de vista: el CSS difumina solo esos bordes.
  // Se recalcula al desplazar y cuando cambia el alto disponible (ventana, densidad por altura) o el contenido.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;
    const actualizar = () => {
      lista.toggleAttribute('data-fade-top', lista.scrollTop > 1);
      lista.toggleAttribute('data-fade-bottom', lista.scrollTop + lista.clientHeight < lista.scrollHeight - 1);
    };
    actualizar();
    lista.addEventListener('scroll', actualizar, { passive: true });
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(actualizar);
    observador?.observe(lista);
    // Cambiar la densidad (alto de fila) altera el alto del contenido sin cambiar el de la lista: la ventana también avisa.
    window.addEventListener('resize', actualizar);
    return () => { lista.removeEventListener('scroll', actualizar); observador?.disconnect(); window.removeEventListener('resize', actualizar); };
  }, [items]);

  const entrada = (item: NavigationItem) => <span className="nav-entry" key={item.href}>{item.section && <span className="nav-section">{item.section}</span>}<Link className={item.href === activePath ? 'active' : ''} aria-current={item.href === activePath ? 'page' : undefined} href={item.href}><span className="nav-symbol" aria-hidden="true">{item.icon}</span>{item.label}</Link></span>;

  return <div className="sidebar-menu"><nav className="workspace-nav"><div className="nav-scroll" ref={listaRef}>{desplazables.map(entrada)}</div>{fijas.length > 0 && <div className="nav-pinned">{fijas.map(entrada)}</div>}</nav></div>;
}
