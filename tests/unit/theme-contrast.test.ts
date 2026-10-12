import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '../../src/app/styles/tokens.css'), 'utf8');

function token(nombre: string): string {
  const coincidencia = css.match(new RegExp(`(?<![\\w-])${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!coincidencia) throw new Error(`Falta el token ${nombre}`);
  return coincidencia[1];
}

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

// Pares de texto y fondo que la interfaz usa. Texto normal: mínimo 4,5:1 (WCAG AA).
const PARES: Array<[string, string]> = [
  ['--ink', '--surface-page'], ['--ink', '--surface-page-2'], ['--ink', '--surface-card'],
  ['--ink-muted', '--surface-page'], ['--ink-muted', '--surface-page-2'], ['--ink-muted', '--surface-card'], ['--ink-muted', '--surface-field'],
  ['--accent', '--surface-card'], ['--accent', '--surface-page'], ['--accent', '--accent-soft'], ['--accent-ink', '--accent'],
  ['--on-petrol', '--petrol-800'], ['--on-petrol', '--petrol-900'], ['--on-petrol-muted', '--petrol-800'], ['--on-petrol-muted', '--petrol-900'],
  ['--good', '--good-soft'], ['--warn', '--warn-soft'], ['--danger', '--danger-soft'], ['--info', '--info-soft'], ['--danger-ink', '--danger'],
  ['--kpi-green-ink', '--kpi-green-a'], ['--kpi-green-ink', '--kpi-green-b'],
  ['--kpi-blue-ink', '--kpi-blue-a'], ['--kpi-blue-ink', '--kpi-blue-b'],
  ['--kpi-amber-ink', '--kpi-amber-a'], ['--kpi-amber-ink', '--kpi-amber-b'],
  ['--kpi-rose-ink', '--kpi-rose-a'], ['--kpi-rose-ink', '--kpi-rose-b'],
];

// Bordes de controles de formulario (WCAG 1.4.11, componentes de interfaz): mínimo 3:1 contra el fondo que los rodea.
const BORDES_DE_CONTROL: Array<[string, string]> = [
  ['--line-field', '--surface-field'], ['--line-field', '--surface-card'],
];

// Cada comprobación lleva su propio mínimo: [primer plano, fondo, mínimo].
const COMPROBACIONES: Array<[string, string, number]> = [
  ...PARES.map(([texto, fondo]): [string, string, number] => [texto, fondo, 4.5]),
  ...BORDES_DE_CONTROL.map(([borde, fondo]): [string, string, number] => [borde, fondo, 3]),
];

describe('contraste del tema Esmeralda', () => {
  it.each(COMPROBACIONES)('%s sobre %s cumple %s:1', (primerPlano, fondo, minimo) => {
    expect(contraste(token(primerPlano), token(fondo))).toBeGreaterThanOrEqual(minimo);
  });
});
