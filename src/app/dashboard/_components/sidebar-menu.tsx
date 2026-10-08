'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavigationItem } from './workspace-shell';

export function SidebarMenu({ items, activePath }: { items: NavigationItem[]; activePath: string }) {
  const menuRef = useRef<HTMLElement>(null);
  function moveMenu(distance: number) { menuRef.current?.scrollBy({ top: distance, behavior: 'smooth' }); }

  useEffect(() => {
    menuRef.current?.querySelector('a.active')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [activePath]);

  return <div className="sidebar-menu"><button className="sidebar-scroll-control" type="button" onClick={() => moveMenu(-180)} aria-label="Desplazar menú hacia arriba"><span aria-hidden="true">↑</span> Subir menú</button><nav className="workspace-nav" ref={menuRef}>{items.map((item) => <span className="nav-entry" key={item.href}>{item.section && <span className="nav-section">{item.section}</span>}<Link className={item.href === activePath ? 'active' : ''} href={item.href}><span className="nav-symbol" aria-hidden="true">{item.icon}</span>{item.label}</Link></span>)}</nav><button className="sidebar-scroll-control" type="button" onClick={() => moveMenu(180)} aria-label="Desplazar menú hacia abajo">Bajar menú <span aria-hidden="true">↓</span></button></div>;
}
