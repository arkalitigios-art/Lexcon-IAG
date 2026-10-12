'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavigationItem } from './workspace-shell';

export function SidebarMenu({ items, activePath }: { items: NavigationItem[]; activePath: string }) {
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector('a.active')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [activePath]);

  return <div className="sidebar-menu"><nav className="workspace-nav" ref={menuRef}>{items.map((item) => <span className="nav-entry" key={item.href}>{item.section && <span className="nav-section">{item.section}</span>}<Link className={item.href === activePath ? 'active' : ''} aria-current={item.href === activePath ? 'page' : undefined} href={item.href}><span className="nav-symbol" aria-hidden="true">{item.icon}</span>{item.label}</Link></span>)}</nav></div>;
}
