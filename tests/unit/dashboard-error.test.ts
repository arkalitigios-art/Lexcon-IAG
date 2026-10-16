import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: (props: { href: string; children?: unknown; className?: string }) => ({ link: props.href, className: props.className, children: props.children }) }));

import ErrorDelPanel from '../../src/app/dashboard/error';

const fuente = readFileSync(join(__dirname, '../../src/app/dashboard/error.tsx'), 'utf8');

/** Recorre el árbol de elementos React devuelto y reúne todo el texto y las propiedades. */
function textos(nodo: unknown, acumulado: string[] = []): string[] {
  if (typeof nodo === 'string' || typeof nodo === 'number') acumulado.push(String(nodo));
  else if (Array.isArray(nodo)) nodo.forEach((hijo) => textos(hijo, acumulado));
  else if (nodo && typeof nodo === 'object') {
    const elemento = nodo as { props?: { children?: unknown }; children?: unknown };
    textos(elemento.props?.children, acumulado);
    textos(elemento.children, acumulado);
  }
  return acumulado;
}

describe('error del panel (dashboard/error.tsx)', () => {
  it('es un componente de cliente y usa la función retry de esta versión de Next.js', () => {
    expect(fuente.trimStart().startsWith("'use client'")).toBe(true);
    expect(fuente).toMatch(/retry/);
  });

  it('no muestra el mensaje del error, pero sí el código de referencia', () => {
    const error = Object.assign(new Error('detalle del proveedor: clave secreta'), { digest: 'abc123' });
    const salida = textos(ErrorDelPanel({ error, retry: () => {} })).join(' ');
    expect(salida).not.toContain('detalle del proveedor');
    expect(salida).not.toContain('clave secreta');
    expect(salida).toContain('Código de referencia');
    expect(salida).toContain('abc123');
  });

  it('sin digest no muestra el código de referencia', () => {
    const salida = textos(ErrorDelPanel({ error: new Error('x'), retry: () => {} })).join(' ');
    expect(salida).not.toContain('Código de referencia');
  });

  it('el botón de reintento invoca retry', () => {
    const retry = vi.fn();
    const arbol = ErrorDelPanel({ error: new Error('x'), retry }) as unknown;
    const botones: Array<{ onClick?: () => void }> = [];
    (function buscar(nodo: unknown) {
      if (Array.isArray(nodo)) nodo.forEach(buscar);
      else if (nodo && typeof nodo === 'object') {
        const elemento = nodo as { type?: unknown; props?: { onClick?: () => void; children?: unknown } };
        if (elemento.type === 'button' && elemento.props) botones.push(elemento.props);
        buscar(elemento.props?.children);
      }
    })(arbol);
    expect(botones).toHaveLength(1);
    botones[0].onClick?.();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
