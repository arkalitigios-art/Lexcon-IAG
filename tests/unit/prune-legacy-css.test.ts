import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { leerArgumentos, llavesEquilibradas, prunar } from '../../scripts/prune-legacy-css.mjs';

const normal = (css: string) => css.replace(/\s+/g, ' ').replace(/ ?([{};:,]) ?/g, '$1').trim();

describe('poda del CSS heredado', () => {
  it('elimina las reglas cuyos selectores coinciden y conserva el resto', () => {
    const { css } = prunar('.workspace{color:red}.surface{color:blue}', { eliminar: [/^\.workspace/] });
    expect(normal(css)).toBe('.surface{color:blue}');
  });

  it('en listas de selectores solo quita los que coinciden', () => {
    const { css } = prunar('.workspace-nav a, .surface p{color:red}', { eliminar: [/^\.workspace/] });
    expect(normal(css)).toBe('.surface p{color:red}');
  });

  it('recorre @media y descarta los bloques que quedan vacíos', () => {
    const { css } = prunar('@media (max-width:700px){.workspace{display:block}}.surface{margin:0}', { eliminar: [/^\.workspace/] });
    expect(normal(css)).toBe('.surface{margin:0}');
  });

  it('quita solo las declaraciones con !important y conserva las demás', () => {
    const { css } = prunar('.status{color:red!important;margin:0;border:1px solid red !important}', { quitarImportant: true });
    expect(normal(css)).toBe('.status{margin:0}');
  });

  it('descarta la regla si todas sus declaraciones eran !important', () => {
    const { css } = prunar('.integrity-metric{background:#000!important}.surface{margin:0}', { quitarImportant: true });
    expect(normal(css)).toBe('.surface{margin:0}');
  });

  it('respeta las excepciones de !important', () => {
    const { css } = prunar('.evaluation-member-row label{grid-column:auto !important}', { quitarImportant: true, conservarImportant: [/^\.evaluation-member-row/] });
    expect(normal(css)).toBe('.evaluation-member-row label{grid-column:auto !important}');
  });

  it('conserva !important dentro de prefers-reduced-motion', () => {
    const origen = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}';
    const { css } = prunar(origen, { quitarImportant: true, conservarMedia: [/prefers-reduced-motion/] });
    expect(normal(css)).toBe(normal(origen));
  });

  it('no se confunde con ; ni comas dentro de paréntesis o comillas', () => {
    const origen = ".a{background:url(\"data:image/svg+xml;utf8,<svg a='1,2'/>\")}.b:is(.x,.y){color:red}";
    const { css } = prunar(origen, { eliminar: [/^\.zzz/] });
    expect(normal(css)).toBe(normal(origen));
  });

  it('conserva los comentarios y contabiliza lo eliminado', () => {
    const { css, eliminados } = prunar('/* capa */.workspace{color:red}', { eliminar: [/^\.workspace/] });
    expect(css).toContain('/* capa */');
    expect(eliminados).toEqual(['.workspace']);
  });

  it('atraviesa @layer', () => {
    const { css } = prunar('@layer legacy{.workspace{color:red}.surface{color:blue}}', { eliminar: [/^\.workspace/] });
    expect(normal(css)).toBe('@layer legacy{.surface{color:blue}}');
  });

  // Pruebas añadidas para el envoltorio real `@layer legacy { ... }` de globals.css y ui.css.
  it('conserva literalmente la cabecera "@layer legacy {" y el formato de las reglas intactas', () => {
    const origen = '@layer legacy {\r\n.workspace { color: red; }\r\n.surface { color: blue; margin: 0; }\r\n}\r\n';
    const { css } = prunar(origen, { eliminar: [/^\.workspace/], quitarImportant: true });
    expect(css).toBe('@layer legacy {\r\n\r\n.surface { color: blue; margin: 0; }\r\n}\r\n');
    expect(llavesEquilibradas(css)).toBe(true);
  });

  it('sin opciones devuelve el CSS idéntico', () => {
    const origen = '@layer legacy {\n.a, .b { color: red; }\n@media (max-width: 700px) { .c { margin: 0; } }\n}\n';
    expect(prunar(origen).css).toBe(origen);
  });

  it('es idempotente: una segunda pasada no cambia nada', () => {
    const origen = '@layer legacy {.workspace,.surface{color:red!important;margin:0}@media (max-width:700px){.workspace{display:block}.x{top:0!important}}}';
    const opciones = { eliminar: [/^\.workspace/], quitarImportant: true };
    const primera = prunar(origen, opciones);
    const segunda = prunar(primera.css, opciones);
    expect(segunda.css).toBe(primera.css);
    expect(segunda.eliminados).toEqual([]);
    expect(llavesEquilibradas(primera.css)).toBe(true);
  });

  it('detecta llaves sin equilibrar e ignora las que están en cadenas o comentarios', () => {
    expect(llavesEquilibradas('.a{color:red}')).toBe(true);
    expect(llavesEquilibradas('.a{content:"}"}/* { */')).toBe(true);
    expect(llavesEquilibradas('.a{color:red')).toBe(false);
    expect(llavesEquilibradas('.a{color:red}}')).toBe(false);
  });

  // Robustez añadida tras la revisión de la Tarea 3.
  it('lanza un error claro ante un comentario sin cerrar en lugar de colgarse', () => {
    expect(() => prunar('.k{a:b}/* nope', {})).toThrow('Comentario sin cerrar');
    expect(() => prunar('/* nope', {})).toThrow('Comentario sin cerrar');
  });

  it('solo trata como !important el marcador final de la declaración', () => {
    const origen = '.a{content:"!important";font-family:"a !important b";color:red!important;margin:0}';
    const { css } = prunar(origen, { quitarImportant: true });
    expect(normal(css)).toBe('.a{content:"!important";font-family:"a !important b";margin:0}');
  });

  it('quita !important también de propiedades personalizadas', () => {
    const { css } = prunar('.a{--x: a !important;--y:b;margin:0}', { quitarImportant: true });
    expect(normal(css)).toBe('.a{--y:b;margin:0}');
  });

  it('informa de las reglas que conservan el selector pero pierden declaraciones !important', () => {
    const origen = '.a{color:red!important;margin:0;top:0 !important}.b{margin:0}.c{x:y!important}.workspace,.d{color:red!important;margin:0}.evaluation-member-row{a:b!important}';
    const { css, eliminados, importantQuitados } = prunar(origen, { eliminar: [/^\.workspace/], quitarImportant: true, conservarImportant: [/^\.evaluation-member-row/] });
    expect(importantQuitados).toEqual(['.a (−2 !important)', '.d (−1 !important)']);
    expect(eliminados).toEqual(['.c (solo !important)', '.workspace']);
    expect(normal(css)).toBe('.a{margin:0}.b{margin:0}.d{margin:0}.evaluation-member-row{a:b!important}');
  });

  it('no informa nada en importantQuitados cuando no se pide quitar !important', () => {
    const { importantQuitados } = prunar('.a{color:red!important}', {});
    expect(importantQuitados).toEqual([]);
  });
});

describe('argumentos de la línea de órdenes', () => {
  it('interpreta los argumentos válidos', () => {
    const opciones = leerArgumentos(['--file', 'src/app/ui.css', '--eliminar', '^\\.workspace', '--eliminar', '^\\.wordmark', '--quitar-important', '--conservar-important', '^\\.evaluation-member-row', '--conservar-media', 'prefers-reduced-motion', '--write']);
    expect(opciones.archivo).toBe('src/app/ui.css');
    expect(opciones.eliminar.map(String)).toEqual([String(/^\.workspace/), String(/^\.wordmark/)]);
    expect(opciones.quitarImportant).toBe(true);
    expect(opciones.conservarImportant.map(String)).toEqual([String(/^\.evaluation-member-row/)]);
    expect(opciones.conservarMedia.map(String)).toEqual([String(/prefers-reduced-motion/)]);
    expect(opciones.guardar).toBe(true);
  });

  it('por defecto es una simulación sin opciones activas', () => {
    const opciones = leerArgumentos(['--file', 'a.css']);
    expect(opciones).toMatchObject({ archivo: 'a.css', eliminar: [], quitarImportant: false, conservarImportant: [], conservarMedia: [], guardar: false });
  });

  it('rechaza un indicador con valor al que le falta el valor', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--eliminar'])).toThrow(/--eliminar/);
    expect(() => leerArgumentos(['--file'])).toThrow(/--file/);
    expect(() => leerArgumentos(['--file', 'a.css', '--conservar-important'])).toThrow(/--conservar-important/);
    expect(() => leerArgumentos(['--file', 'a.css', '--conservar-media'])).toThrow(/--conservar-media/);
  });

  it('rechaza un valor que empieza por --', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--eliminar', '--write'])).toThrow(/--eliminar/);
    expect(() => leerArgumentos(['--file', '--write'])).toThrow(/--file/);
  });

  it('rechaza indicadores desconocidos y argumentos sueltos, y lista los válidos', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--bogus'])).toThrow(/--bogus[\s\S]*--file[\s\S]*--eliminar[\s\S]*--quitar-important[\s\S]*--conservar-important[\s\S]*--conservar-media[\s\S]*--write/);
    expect(() => leerArgumentos(['--file', 'a.css', 'suelto'])).toThrow(/suelto/);
    expect(() => leerArgumentos(['--file=a.css'])).toThrow(/--file=a\.css/);
  });

  it('hace imposible un patrón que coincida con todo', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--eliminar', ''])).toThrow(/vac/);
    expect(() => leerArgumentos(['--file', 'a.css', '--eliminar', '.*'])).toThrow(/vac/);
    expect(() => leerArgumentos(['--file', 'a.css', '--conservar-media', '^'])).toThrow(/vac/);
  });

  it('rechaza una expresión regular inválida con un mensaje claro', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--eliminar', '(sin cerrar'])).toThrow(/expresi/);
  });

  it('rechaza repetir --file', () => {
    expect(() => leerArgumentos(['--file', 'a.css', '--file', 'b.css'])).toThrow(/--file/);
  });
});
