#!/usr/bin/env node
// Poda segura del CSS heredado de LEXCON IAG.
// Uso (simulación): node scripts/prune-legacy-css.mjs --file src/app/ui.css --eliminar '^\.workspace' --quitar-important
// Con --write reescribe el archivo. Sin --write solo informa.
//
// Límites del analizador (es deliberadamente sencillo):
//  - No admite comentarios dentro de la cabecera de una regla, ni dentro de su cuerpo si contienen llaves, comillas o paréntesis.
//  - No admite anidamiento de reglas (CSS nesting): una regla anidada se trata como parte del cuerpo de la externa.
//  - No interpreta comillas escapadas (\" o \') dentro de cadenas.
//  - Reconoce !important solo como marcador final de una declaración (no dentro de cadenas ni seguido de un comentario).
// Falla de forma segura: un comentario o bloque sin cerrar lanza un error, y si lo anterior desequilibra las llaves la guarda
// `llavesEquilibradas` aborta con código 1 antes de escribir. Aun así, revise la simulación y el diff antes de usar --write.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Divide por un separador de nivel superior, respetando paréntesis, corchetes y comillas. */
function dividir(texto, separador) {
  const partes = []; let profundidad = 0; let actual = ''; let comilla = null;
  for (const caracter of texto) {
    if (comilla) { actual += caracter; if (caracter === comilla) comilla = null; continue; }
    if (caracter === '"' || caracter === "'") { comilla = caracter; actual += caracter; continue; }
    if (caracter === '(' || caracter === '[') profundidad++;
    if (caracter === ')' || caracter === ']') profundidad--;
    if (caracter === separador && profundidad === 0) { partes.push(actual); actual = ''; } else actual += caracter;
  }
  partes.push(actual);
  return partes;
}

/** Lee el cuerpo de un bloque {...} desde `inicio` (posición de la llave de apertura). */
function cierreDeBloque(css, inicio) {
  let profundidad = 0; let comilla = null;
  for (let i = inicio; i < css.length; i++) {
    const c = css[i];
    if (comilla) { if (c === comilla) comilla = null; continue; }
    if (c === '"' || c === "'") { comilla = c; continue; }
    if (c === '(') { let p = 1; i++; while (i < css.length && p > 0) { if (css[i] === '(') p++; else if (css[i] === ')') p--; else if (css[i] === '"' || css[i] === "'") { const q = css[i]; i++; while (i < css.length && css[i] !== q) i++; } i++; } i--; continue; }
    if (c === '{') profundidad++;
    if (c === '}') { profundidad--; if (profundidad === 0) return i; }
  }
  throw new Error('Bloque CSS sin cerrar');
}

function analizar(css) {
  const nodos = []; let i = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { let j = i; while (j < css.length && /\s/.test(css[j])) j++; nodos.push({ tipo: 'espacio', crudo: css.slice(i, j) }); i = j; continue; }
    if (css.startsWith('/*', i)) {
      const cierre = css.indexOf('*/', i + 2);
      if (cierre === -1) throw new Error('Comentario sin cerrar');
      nodos.push({ tipo: 'comentario', crudo: css.slice(i, cierre + 2) }); i = cierre + 2; continue;
    }
    let j = i; let comilla = null; let parentesis = 0;
    while (j < css.length) {
      const c = css[j];
      if (comilla) { if (c === comilla) comilla = null; j++; continue; }
      if (c === '"' || c === "'") { comilla = c; j++; continue; }
      if (c === '(') parentesis++;
      if (c === ')') parentesis--;
      if (parentesis === 0 && (c === '{' || c === ';')) break;
      j++;
    }
    if (css[j] === ';' || j >= css.length) { nodos.push({ tipo: 'sentencia', crudo: css.slice(i, j + 1) }); i = j + 1; continue; }
    const cabecera = css.slice(i, j).trim();
    const fin = cierreDeBloque(css, j);
    const cuerpo = css.slice(j + 1, fin);
    const crudo = css.slice(i, fin + 1);
    // `prefijo` conserva el texto original previo a la llave (p. ej. "@layer legacy ") para no alterar el formato al reescribir.
    if (/^@(media|supports|layer|container)\b/i.test(cabecera)) nodos.push({ tipo: 'contenedor', cabecera, prefijo: css.slice(i, j), hijos: analizar(cuerpo), crudo });
    else if (cabecera.startsWith('@')) nodos.push({ tipo: 'arroba', crudo });
    else nodos.push({ tipo: 'regla', cabecera, cuerpo, crudo });
    i = fin + 1;
  }
  return nodos;
}

/** Una declaración es !important solo si el marcador es lo último que lleva (no dentro de una cadena como content:"!important"). */
function esImportant(declaracion) { return /!\s*important\s*$/i.test(declaracion.trim()); }

/** Devuelve { cuerpo, quitadas }: el cuerpo sin las declaraciones !important y cuántas se quitaron. */
function quitarDeclaracionesImportant(cuerpo) {
  const declaraciones = dividir(cuerpo, ';');
  const quitadas = declaraciones.filter(esImportant).length;
  // Sin !important el cuerpo se devuelve intacto: así la poda no reformatea reglas que no cambian.
  if (quitadas === 0) return { cuerpo, quitadas };
  return { cuerpo: declaraciones.filter((declaracion) => declaracion.trim() && !esImportant(declaracion)).join(';'), quitadas };
}

function recorrer(nodos, opciones, informe, dentroDeMediaProtegido) {
  const salida = [];
  for (const nodo of nodos) {
    if (nodo.tipo === 'regla') {
      const selectores = dividir(nodo.cabecera, ',').map((s) => s.trim()).filter(Boolean);
      const conservados = selectores.filter((s) => !opciones.eliminar.some((patron) => patron.test(s)));
      let cuerpo = nodo.cuerpo; let quitadas = 0;
      const protegida = dentroDeMediaProtegido || opciones.conservarImportant.some((patron) => selectores.some((s) => patron.test(s)));
      if (opciones.quitarImportant && !protegida) ({ cuerpo, quitadas } = quitarDeclaracionesImportant(cuerpo));
      if (conservados.length < selectores.length) informe.eliminados.push(...selectores.filter((s) => !conservados.includes(s)));
      const quedoVacia = cuerpo !== nodo.cuerpo && !cuerpo.trim();
      if (conservados.length === 0 || quedoVacia) { if (conservados.length > 0) informe.eliminados.push(`${selectores.join(',')}${SUFIJO_SOLO_IMPORTANT}`); continue; }
      if (quitadas > 0) informe.importantQuitados.push(`${conservados.join(',')} (−${quitadas} !important)`);
      if (conservados.length === selectores.length && cuerpo === nodo.cuerpo) salida.push(nodo);
      else salida.push({ tipo: 'regla', cabecera: conservados.join(','), cuerpo, crudo: `${conservados.join(',')}{${cuerpo}}` });
    } else if (nodo.tipo === 'contenedor') {
      const protegido = dentroDeMediaProtegido || opciones.conservarMedia.some((patron) => patron.test(nodo.cabecera));
      const hijos = recorrer(nodo.hijos, opciones, informe, protegido);
      if (!hijos.some((hijo) => hijo.tipo !== 'espacio' && hijo.tipo !== 'comentario')) continue;
      salida.push({ tipo: 'contenedor', cabecera: nodo.cabecera, prefijo: nodo.prefijo, hijos, crudo: `${nodo.prefijo}{${escribir(hijos)}}` });
    } else salida.push(nodo);
  }
  return salida;
}

function escribir(nodos) { return nodos.map((nodo) => nodo.crudo).join(''); }

const SUFIJO_SOLO_IMPORTANT = ' (solo !important)';

/**
 * Devuelve { css, eliminados, importantQuitados }. Exportada para las pruebas.
 * - eliminados: selectores eliminados por patrón y reglas descartadas por contener solo !important (estas, con el sufijo " (solo !important)").
 * - importantQuitados: reglas que conservan su selector pero pierden declaraciones, como "selector (−N !important)".
 */
export function prunar(css, { eliminar = [], quitarImportant = false, conservarImportant = [], conservarMedia = [] } = {}) {
  const informe = { eliminados: [], importantQuitados: [] };
  const resultado = recorrer(analizar(css), { eliminar, quitarImportant, conservarImportant, conservarMedia }, informe, false);
  return { css: escribir(resultado), eliminados: informe.eliminados, importantQuitados: informe.importantQuitados };
}

/** Comprueba que las llaves del CSS quedan equilibradas, ignorando comentarios y cadenas. Exportada para las pruebas. */
export function llavesEquilibradas(css) {
  let profundidad = 0; let comilla = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (comilla) { if (c === '\\') i++; else if (c === comilla) comilla = null; continue; }
    if (c === '/' && css[i + 1] === '*') { const fin = css.indexOf('*/', i + 2); if (fin === -1) return false; i = fin + 1; continue; }
    if (c === '"' || c === "'") { comilla = c; continue; }
    if (c === '{') profundidad++;
    if (c === '}' && --profundidad < 0) return false;
  }
  return profundidad === 0 && comilla === null;
}

const INDICADORES_SIN_VALOR = ['--quitar-important', '--write'];
const INDICADORES_VALIDOS = ['--file', '--eliminar', '--quitar-important', '--conservar-important', '--conservar-media', '--write'];

/** Convierte un valor de la línea de órdenes en RegExp; rechaza las inválidas y las que coinciden con la cadena vacía (afectarían a todo). */
function expresion(indicador, valor) {
  let regExp;
  try { regExp = new RegExp(valor); } catch (error) { throw new Error(`${indicador}: expresión regular inválida "${valor}" (${error.message}).`); }
  if (regExp.test('')) throw new Error(`${indicador}: el patrón "${valor}" coincide con la cadena vacía y afectaría a todo el CSS; use uno más específico.`);
  return regExp;
}

/**
 * Interpreta los argumentos de la línea de órdenes (sin `node` ni la ruta del script). Función pura, exportada para las pruebas.
 * Lanza un Error con un mensaje en español ante indicadores desconocidos, valores ausentes o que empiezan por "--", valores vacíos,
 * expresiones regulares inválidas o que coinciden con la cadena vacía, o --file repetido. No comprueba que falte --file.
 */
export function leerArgumentos(argv) {
  const opciones = { archivo: undefined, eliminar: [], quitarImportant: false, conservarImportant: [], conservarMedia: [], guardar: false };
  for (let i = 0; i < argv.length; i++) {
    const indicador = argv[i];
    if (!indicador.startsWith('--')) throw new Error(`Argumento inesperado "${indicador}". Indicadores válidos: ${INDICADORES_VALIDOS.join(', ')}.`);
    if (!INDICADORES_VALIDOS.includes(indicador)) throw new Error(`Indicador desconocido "${indicador}". Indicadores válidos: ${INDICADORES_VALIDOS.join(', ')}.`);
    if (INDICADORES_SIN_VALOR.includes(indicador)) {
      if (indicador === '--quitar-important') opciones.quitarImportant = true; else opciones.guardar = true;
      continue;
    }
    const valor = argv[++i];
    if (valor === undefined) throw new Error(`${indicador} requiere un valor.`);
    if (valor.startsWith('--')) throw new Error(`${indicador} requiere un valor, pero lo siguiente es el indicador "${valor}".`);
    if (!valor.trim()) throw new Error(`${indicador}: el valor no puede estar vacío.`);
    if (indicador === '--file') {
      if (opciones.archivo !== undefined) throw new Error('--file solo puede indicarse una vez.');
      opciones.archivo = valor;
    } else if (indicador === '--eliminar') opciones.eliminar.push(expresion(indicador, valor));
    else if (indicador === '--conservar-important') opciones.conservarImportant.push(expresion(indicador, valor));
    else opciones.conservarMedia.push(expresion(indicador, valor));
  }
  return opciones;
}

const contarImportant = (css) => (css.match(/!\s*important/gi) ?? []).length;
const unicos = (lista) => [...new Set(lista)];

function listar(titulo, lista) {
  const unica = unicos(lista);
  if (unica.length === 0) return;
  console.log(`\n${titulo}`);
  console.log(unica.slice(0, 400).join('\n'));
  if (unica.length > 400) console.log(`... y ${unica.length - 400} más`);
}

function ejecutar() {
  let opciones;
  try { opciones = leerArgumentos(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; return; }
  const { archivo } = opciones;
  if (!archivo) { console.error('Falta --file <ruta.css>'); process.exitCode = 2; return; }
  const original = readFileSync(archivo, 'utf8');
  let resultado;
  try { resultado = prunar(original, opciones); } catch (error) { console.error(`${archivo}: no se pudo analizar el CSS (${error.message}); no se escribe nada.`); process.exitCode = 1; return; }
  const { css, eliminados, importantQuitados } = resultado;
  const soloImportant = eliminados.filter((entrada) => entrada.endsWith(SUFIJO_SOLO_IMPORTANT));
  const porSelector = eliminados.filter((entrada) => !entrada.endsWith(SUFIJO_SOLO_IMPORTANT));
  console.log(`${archivo}: ${original.length} -> ${css.length} caracteres.`);
  console.log(`Selectores eliminados por patrón: ${porSelector.length} en total, ${unicos(porSelector).length} únicos.`);
  console.log(`Reglas descartadas por contener solo !important: ${soloImportant.length} en total, ${unicos(soloImportant).length} únicas.`);
  console.log(`Reglas que conservan su selector pero pierden declaraciones !important: ${importantQuitados.length} en total, ${unicos(importantQuitados).length} únicas.`);
  if (opciones.quitarImportant) console.log(`Declaraciones !important: ${contarImportant(original)} -> ${contarImportant(css)}.`);
  if (!llavesEquilibradas(css)) {
    const motivo = llavesEquilibradas(original)
      ? 'la poda dejaría llaves sin equilibrar (el CSS usa una construcción que el analizador no admite)'
      : 'el archivo original ya tiene llaves, comentarios o comillas sin equilibrar';
    console.error(`${archivo}: ${motivo}; no se escribe nada.`);
    process.exitCode = 1;
    return;
  }
  if (!opciones.guardar) {
    listar('Selectores eliminados por patrón:', porSelector);
    listar('Reglas descartadas por contener solo !important:', soloImportant);
    listar('Reglas que pierden declaraciones !important (se conserva el selector):', importantQuitados);
    console.log('\n(simulación: use --write para guardar)');
    return;
  }
  writeFileSync(archivo, css);
  console.log('Archivo reescrito.');
}

const esPrincipal = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');
if (esPrincipal) ejecutar();
