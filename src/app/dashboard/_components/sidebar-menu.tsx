'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavigationItem } from './workspace-shell';

export function SidebarMenu({ items, activePath }: { items: NavigationItem[]; activePath: string }) {
  const menuRef = useRef<HTMLElement>(null);

  // Deja visible la opción activa desplazando SOLO el contenedor del menú. `scrollIntoView` también movía la ventana (el menú es `sticky`
  // dentro de un marco con margen) y dejaba una franja en blanco arriba. Se calcula contra la parte visible: la intersección del contenedor con la ventana.
  useEffect(() => {
    const enlace = menuRef.current?.querySelector<HTMLElement>('a.active');
    const contenedor = menuRef.current?.closest<HTMLElement>('.workspace-sidebar');
    if (!enlace || !contenedor) return;
    const margen = 12;
    const caja = contenedor.getBoundingClientRect(); const posicion = enlace.getBoundingClientRect();
    const arriba = Math.max(caja.top, 0) + margen; const abajo = Math.min(caja.bottom, window.innerHeight) - margen;
    if (posicion.top < arriba) contenedor.scrollTop -= arriba - posicion.top;
    else if (posicion.bottom > abajo) contenedor.scrollTop += posicion.bottom - abajo;
  }, [activePath]);

  return <div className="sidebar-menu"><nav className="workspace-nav" ref={menuRef}>{items.map((item) => <span className="nav-entry" key={item.href}>{item.section && <span className="nav-section">{item.section}</span>}<Link className={item.href === activePath ? 'active' : ''} aria-current={item.href === activePath ? 'page' : undefined} href={item.href}><span className="nav-symbol" aria-hidden="true">{item.icon}</span>{item.label}</Link></span>)}</nav></div>;
}
