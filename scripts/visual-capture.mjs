#!/usr/bin/env node
// Captura PNG de las pantallas de LEXCON IAG a varios anchos y detecta desbordes horizontales.
// Uso: node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/antes
//      [--widths 390,820,1280,1440] [--roles publico,admin,abogado,rector,apoyo]
//      [--sizes 1366x650,1536x730,390x844] [--modo pagina|ventana] [--routes /dashboard/admin,/dashboard/account]
// --sizes: lista ANCHOxALTO en px CSS (ventana visible). Sustituye a --widths y fija también el alto, para comprobar portátiles de poca altura.
// --modo: "pagina" (por defecto) captura la página entera; "ventana" captura solo lo visible en la ventana (así se ve el marco como lo vería la persona usuaria).
// --routes: limita la captura a esas rutas (las de cada rol que no figuren se omiten; no se descubren enlaces adicionales).
// Con --sizes se añaden al resumen (resumen.json) las medidas del marco: desplazamientos verticales, menú lateral y pie visibles.
// Requiere Chrome o Edge instalado (CHROME_PATH para indicar otra ruta). Solo para modo local de demostración.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argumentos = Object.fromEntries(process.argv.slice(2).reduce((acc, valor, i, todos) => (valor.startsWith('--') ? [...acc, [valor.slice(2), todos[i + 1]]] : acc), []));
const BASE = argumentos.base ?? 'http://localhost:3100';
const SALIDA = argumentos.out ?? 'tmp/visual/captura';
// Cada tamaño es { ancho, alto }; sin --sizes el alto se deduce del ancho como siempre (844 / 1180 / 900).
const TAMANOS = argumentos.sizes
  ? argumentos.sizes.split(',').map((t) => { const [ancho, alto] = t.toLowerCase().split('x').map(Number); return { ancho, alto }; })
  : (argumentos.widths ?? '390,820,1280,1440').split(',').map(Number).map((ancho) => ({ ancho, alto: ancho <= 480 ? 844 : ancho <= 900 ? 1180 : 900 }));
if (TAMANOS.some((t) => !(t.ancho > 0 && t.alto > 0))) { console.error('--sizes debe ser una lista ANCHOxALTO, por ejemplo 1366x650,390x844'); process.exit(2); }
const SOLO_VENTANA = argumentos.modo === 'ventana';
const SOLO_RUTAS = argumentos.routes ? argumentos.routes.split(',') : null;
// Medidas del marco de escritorio: desplazamientos verticales, menú lateral y pie fijados dentro de la ventana (solo si existe `.workspace`).
const MEDIR_MARCO = `(() => {
  const marco = document.querySelector('.workspace'); if (!marco) return null;
  const caja = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
  const nav = document.querySelector('.nav-scroll'); const pie = document.querySelector('.sidebar-footer'); const lateral = document.querySelector('.workspace-sidebar');
  const desplazables = [...document.querySelectorAll('body *')].filter((el) => { const o = getComputedStyle(el).overflowY; return (o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0; }).map((el) => el.className || el.tagName);
  return {
    paginaDesplaza: document.documentElement.scrollHeight - innerHeight,
    marco: caja(marco), navScroll: nav ? nav.scrollHeight - nav.clientHeight : null,
    pieVisible: pie ? caja(pie).bottom <= innerHeight && caja(pie).top >= 0 : null, lateral: lateral ? caja(lateral) : null,
    desplazables,
  };
})()`;
const ROLES = (argumentos.roles ?? 'publico,admin,abogado,rector,apoyo').split(',');

// Cuentas ficticias de la demostración local (también figuran en README.md). Nunca usar con Supabase.
const DEMO = {
  admin: { email: 'admin.arka@demo.invalid', password: 'ArkaAdmin.2026' },
  abogado: { email: 'abogado.arka@demo.invalid', password: 'ArkaAbogada.2026' },
  rector: { email: 'rector.horizonte@demo.invalid', password: 'Rectoria.2026' },
  apoyo: { email: 'apoyo.rioclaro@demo.invalid', password: 'ApoyoRio.2026' },
};
const RUTAS = {
  publico: ['/login', '/activate-account', '/forgot-password'],
  admin: ['/dashboard/admin', '/dashboard/admin/processes', '/dashboard/admin/assignments', '/dashboard/admin/alerts', '/dashboard/admin/institutions', '/dashboard/admin/institutions/new', '/dashboard/admin/lawyers', '/dashboard/admin/users', '/dashboard/admin/audit', '/dashboard/account'],
  abogado: ['/dashboard/attorney', '/dashboard/account'],
  rector: ['/dashboard/institution', '/dashboard/regulations', '/dashboard/account'],
  apoyo: ['/dashboard/institution', '/dashboard/regulations', '/dashboard/account'],
};
// Enlaces que se descubren al visitar una ruta y se capturan después.
const DESCUBRIR = {
  '/dashboard/admin': 'a[href^="/dashboard/processes/"]',
  '/dashboard/admin/institutions': 'a[href^="/dashboard/admin/institutions/"]:not([href$="/new"])',
  '/dashboard/attorney': 'a[href^="/dashboard/attorney/institutions/"]',
  '/dashboard/institution': 'a[href^="/dashboard/processes/"]',
};

const CANDIDATOS_CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const CHROME = CANDIDATOS_CHROME.find((ruta) => existsSync(ruta));
if (!CHROME) { console.error('No se encontró Chrome ni Edge. Defina CHROME_PATH.'); process.exit(2); }

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const puerto = 9400 + Math.floor(Math.random() * 400);
const perfil = mkdtempSync(join(tmpdir(), 'lexcon-visual-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

async function json(ruta) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`); if (r.ok) return await r.json(); } catch { /* aún no responde */ }
    await dormir(250);
  }
  throw new Error('Chrome no respondió');
}

const pagina = (await json('/json')).find((t) => t.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let idMensaje = 0; const pendientes = new Map(); const oyentes = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pendientes.has(msg.id)) { pendientes.get(msg.id)(msg); pendientes.delete(msg.id); } else if (msg.method) oyentes.slice().forEach((o) => o(msg));
};
const enviar = (method, params = {}) => new Promise((res) => { const id = ++idMensaje; pendientes.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const esperar = (evento, ms = 20000) => new Promise((res) => { const t = setTimeout(res, ms); const o = (m) => { if (m.method === evento) { clearTimeout(t); oyentes.splice(oyentes.indexOf(o), 1); res(); } }; oyentes.push(o); });
const evaluar = async (expresion) => (await enviar('Runtime.evaluate', { expression: expresion, returnByValue: true })).result.result.value;

async function iniciarSesion(rol) {
  await enviar('Network.clearBrowserCookies');
  if (rol === 'publico') return;
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(DEMO[rol]) });
  if (!r.ok) throw new Error(`No se pudo iniciar sesión como ${rol} (${r.status}). ¿Está sembrada la base local? (corepack pnpm db:seed)`);
  for (const cookie of r.headers.getSetCookie()) {
    const [par] = cookie.split(';'); const [name, ...resto] = par.split('=');
    await enviar('Network.setCookie', { name, value: resto.join('='), url: BASE });
  }
}

const nombreArchivo = (rol, ruta, ancho) => `${rol}__${ruta.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'raiz'}__${ancho}.png`;
mkdirSync(SALIDA, { recursive: true });
await enviar('Page.enable'); await enviar('Network.enable');
const resumen = []; let desbordes = 0;

for (const rol of ROLES) {
  await iniciarSesion(rol);
  const cola = RUTAS[rol].filter((ruta) => !SOLO_RUTAS || SOLO_RUTAS.includes(ruta));
  const vistas = new Set();
  while (cola.length) {
    const ruta = cola.shift();
    if (vistas.has(ruta)) continue; vistas.add(ruta);
    for (const [indice, { ancho, alto }] of TAMANOS.entries()) {
      await enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: ancho <= 480 ? 2 : 1, mobile: ancho <= 820 });
      const cargada = esperar('Page.loadEventFired');
      await enviar('Page.navigate', { url: BASE + ruta });
      await cargada;
      await evaluar('document.fonts.ready.then(() => true)');
      await dormir(1200);
      const medidas = await evaluar('({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, titulo: document.title, url: location.pathname })');
      if (medidas.url !== ruta.split('?')[0]) { resumen.push({ rol, ruta, ancho, nota: `redirigió a ${medidas.url}` }); break; }
      const desborda = medidas.sw > medidas.iw + 1;
      if (desborda) desbordes++;
      const captura = SOLO_VENTANA
        ? await enviar('Page.captureScreenshot', { format: 'png' })
        : await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: ancho, height: Math.min(medidas.h, 6000), scale: 1 } });
      writeFileSync(join(SALIDA, nombreArchivo(rol, ruta, argumentos.sizes ? `${ancho}x${alto}` : ancho)), Buffer.from(captura.result.data, 'base64'));
      const marco = argumentos.sizes ? await evaluar(MEDIR_MARCO) : null;
      resumen.push({ rol, ruta, ancho, ...(argumentos.sizes ? { altoVentana: alto, marco } : {}), desborda, alto: medidas.h });
      if (indice === 0 && !SOLO_RUTAS && DESCUBRIR[ruta]) {
        const enlace = await evaluar(`(document.querySelector(${JSON.stringify(DESCUBRIR[ruta])}) || {}).getAttribute?.('href') ?? null`);
        if (enlace) cola.push(enlace);
      }
    }
  }
}

writeFileSync(join(SALIDA, 'resumen.json'), JSON.stringify(resumen, null, 2));
console.table(resumen.map((f) => ({ rol: f.rol, ruta: f.ruta, ancho: f.ancho, alto: f.altoVentana ?? '-', desborda: f.desborda ?? '-', nota: f.nota ?? '' })));
console.log(`\n${resumen.length} capturas en ${SALIDA}. Desbordes horizontales: ${desbordes}.`);
ws.close(); chrome.kill();
await dormir(500);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* el perfil temporal se limpia solo */ }
process.exit(desbordes > 0 ? 1 : 0);
