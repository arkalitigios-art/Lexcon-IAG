'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { KeepSessionAlive } from './keep-session-alive';

/**
 * Marco del espacio de trabajo. Solo gestiona si el menú lateral está abierto
 * (relevante hasta 900 px); el contenido llega ya renderizado desde el servidor.
 *
 * Accesibilidad del panel desplegable: al abrirlo el foco pasa al enlace de la sección activa (o, si no hay, al primero)
 * y la zona principal queda inerte (el teclado y los lectores de pantalla no salen del panel). Escape, el fondo oscurecido,
 * elegir una opción o ensanchar la ventana por encima de 900 px lo cierran. El foco vuelve al botón de menú solo cuando
 * se cierra con Escape o con el fondo; al elegir una opción no se le quita al destino (un enlace de ancla de la misma
 * página dejaría el foco arriba del todo). Cerrado, el panel se oculta con CSS (`visibility`) para que sus enlaces no
 * reciban el foco fuera de pantalla.
 */
export function WorkspaceFrame({ sidebar, topbar, idUsuario, children }: { sidebar: ReactNode; topbar: ReactNode; idUsuario: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const panel = useRef<HTMLElement>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);
  const devolverFoco = useRef(false);

  function cerrarYDevolverFoco() { devolverFoco.current = true; setAbierto(false); }

  useEffect(() => { setAbierto(false); }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') { devolverFoco.current = true; setAbierto(false); } };
    const movil = window.matchMedia('(max-width: 900px)');
    const cerrarSiDejaDeSerMovil = () => { if (!movil.matches) setAbierto(false); };
    window.addEventListener('keydown', cerrarConEscape);
    movil.addEventListener('change', cerrarSiDejaDeSerMovil);
    return () => {
      window.removeEventListener('keydown', cerrarConEscape);
      movil.removeEventListener('change', cerrarSiDejaDeSerMovil);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      estabaAbierto.current = true;
      const destino = panel.current?.querySelector<HTMLElement>('a[aria-current="page"]') ?? panel.current?.querySelector<HTMLElement>('a[href]');
      destino?.focus();
      return;
    }
    if (!estabaAbierto.current) return;
    estabaAbierto.current = false;
    if (devolverFoco.current) botonMenu.current?.focus();
    devolverFoco.current = false;
  }, [abierto]);

  return <main className="workspace" data-menu={abierto ? 'open' : 'closed'}>
    {/* El clic llega aquí desde cualquier enlace del menú (también los de ancla, que no cambian la ruta): elegir una opción cierra el panel sin quitarle el foco al destino. */}
    <aside id="workspace-sidebar" className="workspace-sidebar" aria-label="Navegación principal" ref={panel} onClick={(evento) => { if ((evento.target as Element).closest('a')) { devolverFoco.current = false; setAbierto(false); } }}>{sidebar}</aside>
    <button type="button" className="workspace-scrim" aria-label="Cerrar menú" tabIndex={abierto ? 0 : -1} onClick={cerrarYDevolverFoco} />
    <section className="workspace-main" inert={abierto}>
      <header className="workspace-topbar">
        <button type="button" className="menu-button" ref={botonMenu} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto} aria-controls="workspace-sidebar" onClick={() => { if (abierto) cerrarYDevolverFoco(); else setAbierto(true); }}><Icon name={abierto ? 'close' : 'menu'} /></button>
        {topbar}
      </header>
      <section className="workspace-content">{children}</section>
    </section>
    <KeepSessionAlive idUsuario={idUsuario} />
  </main>;
}
