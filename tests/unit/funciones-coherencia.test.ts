import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FUNCIONES, type ClaveFuncion, type Funcion } from '../../src/platform/features';

const SRC = resolve(__dirname, '../../src');
const leer = (relativa: string): string => readFileSync(join(SRC, relativa), 'utf8');
const relativaDe = (absoluta: string): string => absoluta.slice(SRC.length + 1).split('\\').join('/');

/** El archivo elige por sí mismo entre SQLite y Supabase. */
const RAMA_SUPABASE = /supabaseConfigurado\(|supabasePublicoConfigurado\(|persistence === 'SUPABASE'/;
/** El módulo trabaja contra Supabase. */
const USA_SUPABASE = /supabaseConfigurado\(|crearClienteSupabaseServidor|SupabaseClient/;
/** Funciones solo-SQLite exportadas por módulos que, en lo demás, sí tienen rama Supabase. */
const LLAMADAS_SOLO_SQLITE = [/\bgetProcessDetailFor\(/, /\bassignAttorney\(/];

function entradas(): string[] {
  return readdirSync(join(SRC, 'app'), { withFileTypes: true, recursive: true })
    .filter((entrada) => entrada.isFile() && (entrada.name === 'page.tsx' || entrada.name === 'route.ts'))
    .map((entrada) => relativaDe(join(entrada.parentPath, entrada.name)));
}

function resolverImportacion(desde: string, especificador: string): string | null {
  let base: string;
  if (especificador.startsWith('@/')) base = join(SRC, especificador.slice(2));
  else if (especificador.startsWith('.')) base = resolve(dirname(join(SRC, desde)), especificador);
  else return null;
  for (const candidato of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) if (existsSync(candidato)) return relativaDe(candidato);
  return null;
}

function importaciones(relativa: string): string[] {
  return [...leer(relativa).matchAll(/from\s+'([^']+)'/g)].flatMap((coincidencia) => {
    const modulo = resolverImportacion(relativa, coincidencia[1]);
    return modulo ? [modulo] : [];
  });
}

/** Una entrada depende de SQLite si lo usa directamente o importa un módulo que lo usa sin rama Supabase. */
function dependeDeSqlite(relativa: string): boolean {
  const texto = leer(relativa);
  if (RAMA_SUPABASE.test(texto)) return false;
  if (texto.includes('getSqlite') || LLAMADAS_SOLO_SQLITE.some((patron) => patron.test(texto))) return true;
  return importaciones(relativa).some((modulo) => {
    const contenido = leer(modulo);
    return contenido.includes('getSqlite') && !RAMA_SUPABASE.test(contenido);
  });
}

const funciones = Object.entries(FUNCIONES) as Array<[ClaveFuncion, Funcion]>;
const noDisponibles = funciones.filter(([, funcion]) => !funcion.disponibleConSupabase);
const disponibles = funciones.filter(([, funcion]) => funcion.disponibleConSupabase);
const manejadores = (texto: string): number => (texto.match(/^export (async )?function (GET|POST|PUT|PATCH|DELETE)\b/gm) ?? []).length;

describe('coherencia de src/platform/features.ts', () => {
  it('todas las páginas, rutas y módulos declarados existen', () => {
    const faltantes = funciones.flatMap(([, funcion]) => [...funcion.paginas, ...funcion.api, ...funcion.modulos]).filter((ruta) => !existsSync(join(SRC, ruta)));
    expect(faltantes).toEqual([]);
  });

  it('cada opción de menú declarada corresponde a una página de la misma función', () => {
    for (const [clave, funcion] of funciones) {
      for (const href of funcion.menu) expect(funcion.paginas, `${clave}: ${href}`).toContain(`app${href}/page.tsx`);
    }
  });

  it('toda página o ruta que depende de SQLite figura como función no disponible', () => {
    const declaradas = new Set(noDisponibles.flatMap(([, funcion]) => [...funcion.paginas, ...funcion.api]));
    expect(entradas().filter((ruta) => dependeDeSqlite(ruta) && !declaradas.has(ruta))).toEqual([]);
  });

  it('las páginas de funciones no disponibles llaman a exigirFuncion con su clave', () => {
    const sinGuarda = noDisponibles.flatMap(([clave, funcion]) => funcion.paginas.filter((pagina) => !leer(pagina).includes(`exigirFuncion('${clave}'`)));
    expect(sinGuarda).toEqual([]);
  });

  it('cada manejador de las rutas no disponibles responde 501 con rutaNoDisponible', () => {
    const sinGuarda = noDisponibles.flatMap(([clave, funcion]) => funcion.api.filter((ruta) => {
      const texto = leer(ruta);
      return texto.split(`rutaNoDisponible('${clave}')`).length - 1 < manejadores(texto);
    }));
    expect(sinGuarda).toEqual([]);
  });

  it('las funciones disponibles tienen rama Supabase en sus módulos y no conservan guardas', () => {
    for (const [clave, funcion] of disponibles) {
      for (const modulo of funcion.modulos) expect(USA_SUPABASE.test(leer(modulo)), `${clave}: ${modulo}`).toBe(true);
      for (const entrada of [...funcion.paginas, ...funcion.api]) {
        expect(dependeDeSqlite(entrada), `${clave}: ${entrada}`).toBe(false);
        expect(leer(entrada), `${clave}: ${entrada}`).not.toMatch(/exigirFuncion\(|rutaNoDisponible\(/);
      }
    }
  });
});
