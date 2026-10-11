# Sistema visual Esmeralda y adaptabilidad: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el estilo Esmeralda aprobado a toda la aplicación, con adaptabilidad real a computador, portátil, tablet y celular, brillo al pasar el cursor, indicadores con datos reales en la bandeja de trabajo, y sin el texto "Arka Litigios IAG" (con "Arka" cambiado a "Lexcon" en los textos visibles).

**Architecture:** Los estilos nuevos viven en `src/app/styles/` (tokens, base, primitivas, menú, acceso, bandeja y superficies). El CSS actual (`globals.css` y `ui.css`, 808 líneas con 14 capas de temas apiladas) se envuelve en una **capa de cascada** `@layer legacy`, de modo que cualquier regla nueva sin capa gane sin depender de la especificidad. Un script (`scripts/prune-legacy-css.mjs`) elimina las declaraciones `!important` de aspecto (que ganarían a una capa posterior) y las reglas de los componentes totalmente reescritos. El menú se vuelve un panel desplegable por debajo de 900 px con un componente cliente. Los indicadores se calculan con una función pura sobre `listProcessesFor`, que funciona con SQLite y con Supabase.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS plano con capas de cascada, `next/font/google` (Outfit, autoalojada en el build), Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-11-sistema-visual-esmeralda-design.md`

**Orden recomendado:** ejecutar este plan **después** del plan "Configuración inicial del administrador y Mi cuenta" (`2026-10-11-setup-administrador-y-mi-cuenta-plan.md`). La Tarea 5 reescribe `workspace-shell.tsx` e incluye el ítem "Mi cuenta" que crea la Tarea 7 de ese plan. Si todavía no se ejecutó, omite el ítem `accountItem` y la ruta `/dashboard/account`.

---

## Reglas de ejecución (leer antes de empezar)

1. **Next.js de esta versión no es el que conoces.** Antes de tocar `layout.tsx`, fuentes o componentes, lee `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` y `.../03-api-reference/02-components/font.md`, y respeta los avisos de obsolescencia.
2. **Git:** `CLAUDE.md` prohíbe `git add`, `git commit` y `git push` sin autorización explícita para esa operación. Cada paso "Commit" se ejecuta solo si la persona lo autorizó; si no, deja los cambios sin preparar y avisa. El hook de pre-commit exige documentación preparada en todo commit con código.
3. **Instancias locales temporales.** La persona autorizó arrancar el servidor de desarrollo **solo para verificar**, en el puerto 3100, con la base local de demostración (SQLite). Nunca lo conectes a Supabase ni a producción, y **apágalo al terminar cada tanda** (Tarea de cierre de cada fase). No dejes procesos en marcha.
4. **No** guardes secretos ni datos reales en archivos versionados. Las cuentas `*.demo.invalid` son ficticias y ya están en el repositorio.
5. Comprobaciones del proyecto: `corepack pnpm typecheck`, `corepack pnpm test`, `node scripts/sync-agent-guides.mjs --check`. Una prueba suelta: `corepack pnpm exec vitest run tests/unit/<archivo>.test.ts`.
6. Idioma de textos y comentarios: **español**.
7. Los cambios son de presentación y de textos; **no** cambies rutas, permisos, datos ni reglas del proceso.

## Hallazgo que condiciona el diseño (leer)

La bandeja actual calcula "sin responsable jurídico" y "bloqueadas" con `getAdminControlCenter()` (`src/modules/admin/control-center.ts`), que **solo lee la base SQLite local**. Con Supabase en producción esas cifras no reflejan los procesos reales. Este plan calcula los indicadores de la bandeja con `listProcessesFor(user)`, que sí funciona con Supabase. Las pantallas de **Alertas**, **Auditoría** y **Accesos** también usan `getAdminControlCenter()`; corregirlas queda **fuera de alcance** de este plan y debe tratarse aparte.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `scripts/visual-capture.mjs` | Crear | Captura PNG de pantallas a 4 anchos y detecta desbordes horizontales. |
| `src/app/styles/tokens.css` | Crear | Variables de color, forma y tamaño del tema. |
| `src/app/styles/base.css` | Crear | Fondo, tipografía, foco, movimiento reducido. |
| `src/app/styles/primitives.css` | Crear | Botones, campos, insignias, superficies, encabezados, mensajes, tablas, brillo al pasar. |
| `src/app/styles/shell.css` | Crear | Marco, menú lateral, barra superior y panel desplegable. |
| `src/app/styles/access.css` | Crear | Pantallas de acceso. |
| `src/app/styles/inbox.css` | Crear | Tarjetas de indicadores, barras, dona, cola de trabajo. |
| `src/app/styles/surfaces.css` | Crear | Piel de directorios, tarjetas, detalle y formularios (Fase 3). |
| `src/app/layout.tsx` | Modificar | Fuente Outfit e importación de estilos. |
| `src/app/globals.css`, `src/app/ui.css` | Modificar | Envolver en `@layer legacy`; podar. |
| `scripts/prune-legacy-css.mjs` | Crear | Poda segura del CSS heredado. |
| `src/app/dashboard/_components/workspace-frame.tsx` | Crear | Marco cliente con el estado del menú desplegable. |
| `src/app/dashboard/_components/workspace-shell.tsx` | Reescribir | Contenido del menú y la barra superior sobre el nuevo marco. |
| `src/app/dashboard/_components/sidebar-menu.tsx` | Modificar | Quitar los botones de desplazamiento. |
| `src/app/dashboard/_components/icons.tsx` | Crear | Iconos SVG de línea. |
| `src/app/dashboard/_components/kpi-card.tsx`, `bar-list.tsx`, `donut.tsx` | Crear | Componentes de servidor de la bandeja. |
| `src/modules/admin/inbox-summary.ts`, `donut-segments.ts` | Crear | Funciones puras de la bandeja. |
| `src/app/dashboard/admin/page.tsx` | Reescribir | Bandeja de trabajo nueva. |
| `tests/unit/theme-contrast.test.ts` | Crear | Contraste WCAG de los pares de color del tema. |
| `tests/unit/prune-legacy-css.test.ts` | Crear | Pruebas del script de poda. |
| `tests/unit/inbox-summary.test.ts` | Crear | Pruebas de los indicadores. |
| `tests/unit/visible-text-guard.test.ts` | Crear | Guarda contra "Arka Litigios IAG" y textos con "Arka". |
| ~13 archivos de `src/` | Modificar | Cambio de textos (Tarea 8). |
| `docs/decisions/055-sistema-visual-esmeralda.md`, `docs/architecture.md`, `docs/current-state.md`, `README.md` | Crear/Modificar | Documentación obligatoria. |

---

## FASE 0: Línea base

### Task 1: Herramienta de captura y capturas "antes"

**Files:**
- Create: `scripts/visual-capture.mjs`

- [ ] **Step 1: Crear el script de captura**

`scripts/visual-capture.mjs`:

```js
#!/usr/bin/env node
// Captura PNG de las pantallas de LEXCON IAG a varios anchos y detecta desbordes horizontales.
// Uso: node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/antes
//      [--widths 390,820,1280,1440] [--roles publico,admin,abogado,rector,apoyo]
// Requiere Chrome o Edge instalado (CHROME_PATH para indicar otra ruta). Solo para modo local de demostración.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argumentos = Object.fromEntries(process.argv.slice(2).reduce((acc, valor, i, todos) => (valor.startsWith('--') ? [...acc, [valor.slice(2), todos[i + 1]]] : acc), []));
const BASE = argumentos.base ?? 'http://localhost:3100';
const SALIDA = argumentos.out ?? 'tmp/visual/captura';
const ANCHOS = (argumentos.widths ?? '390,820,1280,1440').split(',').map(Number);
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
  admin: ['/dashboard/admin', '/dashboard/admin/processes', '/dashboard/admin/assignments', '/dashboard/admin/alerts', '/dashboard/admin/institutions', '/dashboard/admin/institutions/new', '/dashboard/admin/lawyers', '/dashboard/admin/lawyers/new', '/dashboard/admin/audit', '/dashboard/account'],
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
  const cola = [...RUTAS[rol]];
  const vistas = new Set();
  while (cola.length) {
    const ruta = cola.shift();
    if (vistas.has(ruta)) continue; vistas.add(ruta);
    for (const [indice, ancho] of ANCHOS.entries()) {
      await enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho <= 480 ? 844 : ancho <= 900 ? 1180 : 900, deviceScaleFactor: ancho <= 480 ? 2 : 1, mobile: ancho <= 820 });
      const cargada = esperar('Page.loadEventFired');
      await enviar('Page.navigate', { url: BASE + ruta });
      await cargada;
      await evaluar('document.fonts.ready.then(() => true)');
      await dormir(1200);
      const medidas = await evaluar('({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, titulo: document.title, url: location.pathname })');
      if (medidas.url !== ruta.split('?')[0]) { resumen.push({ rol, ruta, ancho, nota: `redirigió a ${medidas.url}` }); break; }
      const desborda = medidas.sw > medidas.iw + 1;
      if (desborda) desbordes++;
      const captura = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: ancho, height: Math.min(medidas.h, 6000), scale: 1 } });
      writeFileSync(join(SALIDA, nombreArchivo(rol, ruta, ancho)), Buffer.from(captura.result.data, 'base64'));
      resumen.push({ rol, ruta, ancho, desborda, alto: medidas.h });
      if (indice === 0 && DESCUBRIR[ruta]) {
        const enlace = await evaluar(`(document.querySelector(${JSON.stringify(DESCUBRIR[ruta])}) || {}).getAttribute?.('href') ?? null`);
        if (enlace) cola.push(enlace);
      }
    }
  }
}

writeFileSync(join(SALIDA, 'resumen.json'), JSON.stringify(resumen, null, 2));
console.table(resumen.map((f) => ({ rol: f.rol, ruta: f.ruta, ancho: f.ancho, desborda: f.desborda ?? '-', nota: f.nota ?? '' })));
console.log(`\n${resumen.length} capturas en ${SALIDA}. Desbordes horizontales: ${desbordes}.`);
ws.close(); chrome.kill();
await dormir(500);
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* el perfil temporal se limpia solo */ }
process.exit(desbordes > 0 ? 1 : 0);
```

- [ ] **Step 2: Arrancar la instancia local temporal (autorizada)**

Run (en segundo plano): `corepack pnpm exec next dev -p 3100`
Expected: `Ready` y `Local: http://localhost:3100`. Si el inicio de sesión de demostración falla más adelante, ejecuta antes `corepack pnpm db:migrate && corepack pnpm db:seed` (idempotente: solo repone las cuentas ficticias).

- [ ] **Step 3: Capturar el "antes"**

Run: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/antes`
Expected: tabla con capturas por rol, ruta y ancho. Es normal que algunas pantallas desborden en la línea base (el diseño actual no es adaptable); anótalas. El código de salida puede ser `1` en esta tarea: no es un fallo.

`tmp/` ya está en `.gitignore`: las capturas no se confirman.

- [ ] **Step 4: Detener la instancia local**

Detén el servidor y comprueba el puerto: `powershell -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue"` → sin salida. Restablece el archivo generado: `git checkout -- next-env.d.ts`.

(El commit del script se agrupa con la Tarea 9.)

---

## FASE 1: Base visual, menú, acceso y bandeja

### Task 2: Fuente, variables y base (con prueba de contraste)

**Files:**
- Create: `src/app/styles/tokens.css`, `src/app/styles/base.css`
- Create: `tests/unit/theme-contrast.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/ui.css`

- [ ] **Step 1: Escribir la prueba de contraste que falla**

`tests/unit/theme-contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '../../src/app/styles/tokens.css'), 'utf8');

function token(nombre: string): string {
  const coincidencia = css.match(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
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

describe('contraste del tema Esmeralda', () => {
  it.each(PARES)('%s sobre %s cumple 4,5:1', (texto, fondo) => {
    expect(contraste(token(texto), token(fondo))).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/theme-contrast.test.ts`
Expected: FAIL (`ENOENT` al leer `tokens.css`).

- [ ] **Step 3: Crear las variables**

`src/app/styles/tokens.css`:

```css
/* Tema Esmeralda. Cada extremo de degradado de las tarjetas es un token propio
   para poder comprobar su contraste (tests/unit/theme-contrast.test.ts). */
:root {
  --font-ui: var(--font-outfit), 'Segoe UI', system-ui, -apple-system, sans-serif;

  --bg-a: #32bf6a;
  --bg-b: #13a58a;
  --bg-c: #0b72a8;
  --bg-d: #0a3d78;

  --petrol-900: #0b3f4d;
  --petrol-800: #0f5663;
  --petrol-700: #136b78;
  --on-petrol: #cfe9e8;
  --on-petrol-muted: #a4d3d4;

  --surface-page: #e9f5f3;
  --surface-page-2: #dcecec;
  --surface-card: #f4fbfa;
  --surface-field: #ffffff;
  --line: #d6e9e7;
  --line-strong: #b9d6d3;

  --ink: #0d3a42;
  --ink-muted: #46666d;

  --accent: #0b7d6e;
  --accent-ink: #ffffff;
  --accent-soft: #e8f8f5;
  --good: #0a7a4b;
  --good-soft: #e3f6ee;
  --warn: #8a4b00;
  --warn-soft: #fff4e0;
  --danger: #b4264f;
  --danger-ink: #ffffff;
  --danger-soft: #fde8ee;
  --info: #1d5fc2;
  --info-soft: #e5eefc;

  --kpi-green-a: #0d8559;
  --kpi-green-b: #0a7a4b;
  --kpi-green-ink: #ffffff;
  --kpi-blue-a: #16799a;
  --kpi-blue-b: #1d5fc2;
  --kpi-blue-ink: #ffffff;
  --kpi-amber-a: #ffb23d;
  --kpi-amber-b: #f08a00;
  --kpi-amber-ink: #2a1800;
  --kpi-rose-a: #cf3563;
  --kpi-rose-b: #b81f4c;
  --kpi-rose-ink: #ffffff;

  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 16px;
  --radius-sm: 12px;
  --shadow-card: 0 18px 34px -24px rgba(0, 30, 40, 0.7);
  --glow: 0 0 0 1px var(--accent), 0 0 24px -2px rgba(15, 157, 138, 0.55), 0 16px 34px -14px rgba(15, 157, 138, 0.6);
  --touch: 44px;
  --gutter: clamp(10px, 3.4vw, 52px);
}
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/theme-contrast.test.ts`
Expected: PASS (28 casos). Si alguno falla, **ajusta el color del token** en `tokens.css` (nunca la prueba) hasta que el par llegue a 4,5:1.

- [ ] **Step 5: Crear la base**

`src/app/styles/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

body {
  margin: 0;
  min-height: 100svh;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.5;
  background: linear-gradient(125deg, var(--bg-a) 0%, var(--bg-b) 38%, var(--bg-c) 70%, var(--bg-d) 100%) fixed;
}

h1, h2, h3, h4, p { margin: 0; }
h1, h2, h3 { font-weight: 700; letter-spacing: -0.01em; text-wrap: balance; }
a { color: var(--accent); }
img, svg { max-width: 100%; }
button { font: inherit; }

:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
  border-radius: 8px;
}

@keyframes esm-pulse {
  0% { box-shadow: 0 0 0 0 rgba(61, 220, 151, 0.55); }
  70%, 100% { box-shadow: 0 0 0 9px rgba(61, 220, 151, 0); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Envolver el CSS heredado en una capa**

Edita `src/app/globals.css` y `src/app/ui.css`: agrega `@layer legacy {` **como primera línea** y `}` **como última línea** de cada archivo (sin tocar nada más). Así todo lo existente queda en la capa `legacy` y cualquier regla nueva sin capa le gana.

Comprueba: `head -c 40 src/app/ui.css` muestra `@layer legacy {` y `tail -c 5 src/app/ui.css` termina en `}`.

- [ ] **Step 7: Fuente e importaciones en `layout.tsx`**

Reemplaza el contenido de `src/app/layout.tsx` por:

```tsx
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import './ui.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/primitives.css';
import './styles/shell.css';
import './styles/access.css';
import './styles/inbox.css';
import './styles/surfaces.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = { title: 'LEXCON IAG', description: 'Gestión jurídico-operativa privada para contratación FSE' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={outfit.variable}><body>{children}</body></html>;
}
```

Crea archivos vacíos temporales para las hojas que aún no existen, para que compile: `src/app/styles/primitives.css`, `shell.css`, `access.css`, `inbox.css` y `surfaces.css` con el comentario `/* se completa en tareas posteriores */`.

Nota de despliegue: `next/font/google` descarga la fuente **durante el build** y la sirve desde el propio dominio. El build de Dokploy necesita salida a internet. Si algún día el build debe ser sin red, descarga `Outfit` una vez, guárdala en `src/app/fonts/` y cambia a `next/font/local`.

- [ ] **Step 8: Comprobar que compila**

Run: `corepack pnpm typecheck && corepack pnpm build`
Expected: compila sin errores. (Si el build falla al descargar la fuente por falta de red, es el caso de la nota anterior: avisa a la persona antes de continuar.)

---

### Task 3: Script de poda del CSS heredado

**Files:**
- Create: `scripts/prune-legacy-css.mjs`
- Create: `tests/unit/prune-legacy-css.test.ts`

Este script se **escribe y prueba ahora** y se **aplica en la Tarea 9**, cuando el CSS nuevo ya cubre los componentes. Elimina (a) selectores de componentes reescritos y (b) declaraciones `!important` de aspecto, que en una capa anterior ganarían a las reglas nuevas.

- [ ] **Step 1: Escribir la prueba que falla**

`tests/unit/prune-legacy-css.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { prunar } from '../../scripts/prune-legacy-css.mjs';

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
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/prune-legacy-css.test.ts`
Expected: FAIL (módulo no encontrado).

- [ ] **Step 3: Implementar el script**

`scripts/prune-legacy-css.mjs`:

```js
#!/usr/bin/env node
// Poda segura del CSS heredado de LEXCON IAG.
// Uso (simulación): node scripts/prune-legacy-css.mjs --file src/app/ui.css --eliminar '^\.workspace' --quitar-important
// Con --write reescribe el archivo. Sin --write solo informa.
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
    if (css.startsWith('/*', i)) { const fin = css.indexOf('*/', i + 2) + 2; nodos.push({ tipo: 'comentario', crudo: css.slice(i, fin) }); i = fin; continue; }
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
    if (/^@(media|supports|layer|container)\b/i.test(cabecera)) nodos.push({ tipo: 'contenedor', cabecera, hijos: analizar(cuerpo), crudo });
    else if (cabecera.startsWith('@')) nodos.push({ tipo: 'arroba', crudo });
    else nodos.push({ tipo: 'regla', cabecera, cuerpo, crudo });
    i = fin + 1;
  }
  return nodos;
}

function quitarDeclaracionesImportant(cuerpo) {
  return dividir(cuerpo, ';').filter((declaracion) => declaracion.trim() && !/!\s*important/i.test(declaracion)).join(';');
}

function recorrer(nodos, opciones, informe, dentroDeMediaProtegido) {
  const salida = [];
  for (const nodo of nodos) {
    if (nodo.tipo === 'regla') {
      const selectores = dividir(nodo.cabecera, ',').map((s) => s.trim()).filter(Boolean);
      const conservados = selectores.filter((s) => !opciones.eliminar.some((patron) => patron.test(s)));
      let cuerpo = nodo.cuerpo;
      const protegida = dentroDeMediaProtegido || opciones.conservarImportant.some((patron) => selectores.some((s) => patron.test(s)));
      if (opciones.quitarImportant && !protegida) cuerpo = quitarDeclaracionesImportant(cuerpo);
      if (conservados.length < selectores.length) informe.push(...selectores.filter((s) => !conservados.includes(s)));
      if (conservados.length === 0 || !cuerpo.trim()) { if (conservados.length > 0) informe.push(`${selectores.join(',')} (solo !important)`); continue; }
      if (conservados.length === selectores.length && cuerpo === nodo.cuerpo) salida.push(nodo);
      else salida.push({ tipo: 'regla', cabecera: conservados.join(','), cuerpo, crudo: `${conservados.join(',')}{${cuerpo}}` });
    } else if (nodo.tipo === 'contenedor') {
      const protegido = dentroDeMediaProtegido || opciones.conservarMedia.some((patron) => patron.test(nodo.cabecera));
      const hijos = recorrer(nodo.hijos, opciones, informe, protegido);
      if (!hijos.some((hijo) => hijo.tipo !== 'espacio' && hijo.tipo !== 'comentario')) continue;
      salida.push({ tipo: 'contenedor', cabecera: nodo.cabecera, hijos, crudo: `${nodo.cabecera}{${escribir(hijos)}}` });
    } else salida.push(nodo);
  }
  return salida;
}

function escribir(nodos) { return nodos.map((nodo) => nodo.crudo).join(''); }

/** Devuelve { css, eliminados }. Exportada para las pruebas. */
export function prunar(css, { eliminar = [], quitarImportant = false, conservarImportant = [], conservarMedia = [] } = {}) {
  const informe = [];
  const resultado = recorrer(analizar(css), { eliminar, quitarImportant, conservarImportant, conservarMedia }, informe, false);
  return { css: escribir(resultado), eliminados: informe };
}

function ejecutar() {
  const argumentos = process.argv.slice(2);
  const valores = (nombre) => argumentos.flatMap((a, i) => (a === `--${nombre}` ? [argumentos[i + 1]] : []));
  const archivo = valores('file')[0];
  if (!archivo) { console.error('Falta --file <ruta.css>'); process.exit(2); }
  const original = readFileSync(archivo, 'utf8');
  const { css, eliminados } = prunar(original, {
    eliminar: valores('eliminar').map((p) => new RegExp(p)),
    quitarImportant: argumentos.includes('--quitar-important'),
    conservarImportant: valores('conservar-important').map((p) => new RegExp(p)),
    conservarMedia: valores('conservar-media').map((p) => new RegExp(p)),
  });
  console.log(`${archivo}: ${original.length} -> ${css.length} caracteres; ${eliminados.length} selectores o reglas eliminados.`);
  if (!argumentos.includes('--write')) { console.log([...new Set(eliminados)].slice(0, 400).join('\n')); console.log('\n(simulación: use --write para guardar)'); return; }
  writeFileSync(archivo, css);
  console.log('Archivo reescrito.');
}

const esPrincipal = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');
if (esPrincipal) ejecutar();
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/prune-legacy-css.test.ts`
Expected: PASS (10 pruebas). Si alguna falla por el formato de salida, corrige el script, no la prueba.

---

### Task 4: Primitivas (botones, campos, insignias, superficies, encabezados, mensajes, tablas y brillo)

**Files:**
- Create (completar): `src/app/styles/primitives.css`

- [ ] **Step 1: Escribir las primitivas**

Reemplaza el contenido de `src/app/styles/primitives.css` por:

```css
/* ===== Encabezados y estructura ===== */
.page-stack, .app-page-stack { display: grid; gap: 18px; align-content: start; min-width: 0; }

.page-heading { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: flex-end; justify-content: space-between; min-width: 0; }
.page-heading > div { min-width: 0; }
.page-heading h1 { font-size: clamp(1.65rem, 3.2vw, 2.15rem); line-height: 1.12; margin-top: 0.25rem; }
.page-heading p:not(.section-kicker) { color: var(--ink-muted); max-width: 62ch; margin-top: 0.45rem; }

.section-kicker, .eyebrow { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }

.section-heading { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-heading h2 { font-size: 1.18rem; margin-top: 0.15rem; }
.section-heading > span { font-size: 0.82rem; color: var(--ink-muted); }

/* ===== Superficies ===== */
.surface {
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: clamp(16px, 2vw, 24px);
  min-width: 0;
}
.surface :where(table) { display: block; max-width: 100%; overflow-x: auto; }

.empty-state, .dossier-empty, .notice, .block-notice {
  padding: 18px 20px;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  border: 1px solid var(--line);
  color: var(--ink);
}
.empty-state strong, .dossier-empty strong { display: block; margin-bottom: 4px; }
.empty-state p, .dossier-empty p { color: var(--ink-muted); }
.block-notice { background: var(--danger-soft); border-color: transparent; }

.form-message {
  padding: 0.7rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  border-left: 4px solid var(--accent);
  color: var(--ink);
  font-size: 0.9rem;
}
.form-message[role='alert'] { background: var(--danger-soft); border-left-color: var(--danger); }

/* ===== Botones ===== */
:where(.primary-button, .secondary-button, .danger-button, .text-danger-button, .logout-button, .push-enable, .access-toggle, .row-actions button, .card-actions button, .card-actions a, .document-actions button, .document-actions a) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: var(--touch);
  padding: 0.6rem 1.15rem;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.25s ease, filter 0.2s ease, border-color 0.2s ease;
}

.primary-button { background: var(--accent); color: var(--accent-ink); border-color: transparent; box-shadow: 0 14px 26px -14px rgba(11, 125, 110, 0.9); }
.danger-button, .text-danger-button { background: #fff; color: var(--danger); border-color: currentColor; }
.text-button { display: inline-flex; align-items: center; min-height: var(--touch); padding: 0.4rem 0.2rem; border: 0; background: none; color: var(--accent); font-weight: 600; text-decoration: underline; cursor: pointer; }
:where(.primary-button, .secondary-button, .danger-button, .access-toggle, .row-actions button):disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }

/* ===== Campos ===== */
:where(input, select, textarea) {
  width: 100%;
  min-height: var(--touch);
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-field);
  color: var(--ink);
  font: inherit;
}
:where(input[type='checkbox'], input[type='radio']) { width: auto; min-height: 0; }
:where(textarea) { min-height: 120px; resize: vertical; }
:where(input, select, textarea):focus-visible { border-color: var(--accent); }
::placeholder { color: var(--ink-muted); opacity: 1; }

.field-label, form label { display: grid; gap: 0.4rem; font-size: 0.86rem; font-weight: 600; color: var(--ink-muted); }
form { min-width: 0; }

.password-field { position: relative; display: block; }
.password-field input { padding-right: 5.5rem; }
.password-visibility {
  position: absolute; right: 0.4rem; top: 50%; transform: translateY(-50%);
  min-height: 36px; padding: 0 0.7rem; border: 0; background: none;
  color: var(--accent); font-weight: 700; cursor: pointer;
}

.file-picker { display: grid; gap: 0.5rem; padding: 14px; border: 2px dashed var(--line-strong); border-radius: var(--radius-md); background: var(--surface-field); }

/* ===== Insignias de estado ===== */
.status {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.3rem 0.8rem; border-radius: 999px;
  background: var(--info-soft); color: var(--info);
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.02em; white-space: normal;
}
.status::before { content: ''; flex: none; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: currentColor; }
.status-blocked_regulation, .status-blocked_market_data, .status-corrections_requested { background: var(--danger-soft); color: var(--danger); }
.status-pending_action, .status-pending_quotes { background: var(--warn-soft); color: var(--warn); }
.status-completed, .status-received { background: var(--good-soft); color: var(--good); }

.service-state { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: var(--info-soft); color: var(--info); }
.service-state.active { background: var(--good-soft); color: var(--good); }
.service-state.ended { background: var(--danger-soft); color: var(--danger); }

/* ===== Tablas ===== */
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 0.6rem 0.8rem; font-size: 0.74rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); border-bottom: 2px solid var(--line); }
td { padding: 0.7rem 0.8rem; border-bottom: 1px solid var(--line); vertical-align: top; }

/* ===== Gestión (formularios + listas) ===== */
.management-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 16px; align-items: start; }
.management-form form, .wide-management-form { display: grid; gap: 14px; }
.management-form > p { color: var(--ink-muted); margin: 0.4rem 0 0.9rem; }
.management-list ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.management-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 16px; align-items: center; padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--radius-md); background: #fff; min-width: 0; }
.management-list li > form { grid-column: 1 / -1; padding-top: 6px; }
.management-list li small { display: block; color: var(--ink-muted); }
.row-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }

/* ===== Brillo al pasar el cursor =====
   Solo con puntero (no en pantallas táctiles); sin desplazamiento si se pide movimiento reducido. */
@media (hover: hover) {
  :is(.primary-button, .secondary-button, .danger-button, .text-danger-button, .logout-button, .push-enable, .access-toggle, .row-actions button, .card-actions button, .card-actions a, .document-actions button, .document-actions a,
      .kpi-card, .work-item, .dossier-footer-nav a, .institution-card, .attorney-card, .access-card, .process-card, .alert-card, .assigned-institution-card, .quotation-card, .command-card, .review-choice):hover {
    filter: brightness(1.07) saturate(1.08);
    border-color: var(--accent);
    box-shadow: var(--glow);
  }
  :is(input, select, textarea):hover { border-color: var(--accent); }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  :is(.primary-button, .secondary-button, .danger-button, .text-danger-button, .logout-button, .push-enable, .access-toggle, .row-actions button, .card-actions button, .card-actions a, .document-actions button, .document-actions a,
      .kpi-card, .work-item, .dossier-footer-nav a, .institution-card, .attorney-card, .access-card, .process-card, .alert-card, .assigned-institution-card, .quotation-card, .command-card, .review-choice):hover {
    transform: translateY(-3px);
  }
}

/* ===== Adaptabilidad ===== */
@media (max-width: 900px) {
  :where(input, select, textarea) { font-size: 16px; } /* evita el zoom automático de iPhone */
  .management-layout { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .management-list li { grid-template-columns: minmax(0, 1fr); }
  .row-actions { justify-content: flex-start; }
}
```

- [ ] **Step 2: Comprobar que compila**

Run: `corepack pnpm typecheck`
Expected: sin errores. (El resultado visual se verifica en la Tarea 9.)

---

### Task 5: Menú lateral, barra superior y panel desplegable

**Files:**
- Create: `src/app/dashboard/_components/workspace-frame.tsx`
- Create: `src/app/dashboard/_components/icons.tsx`
- Rewrite: `src/app/dashboard/_components/workspace-shell.tsx`
- Modify: `src/app/dashboard/_components/sidebar-menu.tsx`
- Create (completar): `src/app/styles/shell.css`

- [ ] **Step 1: Iconos**

`src/app/dashboard/_components/icons.tsx`:

```tsx
import type { ReactElement } from 'react';

export type IconName = 'folder' | 'school' | 'assign' | 'block' | 'menu' | 'close';

const trazos: Record<IconName, ReactElement> = {
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  school: <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M12 5V3" />,
  assign: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" /></>,
  block: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{trazos[name]}</svg>;
}
```

- [ ] **Step 2: Marco cliente con el estado del menú**

`src/app/dashboard/_components/workspace-frame.tsx`:

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';

/**
 * Marco del espacio de trabajo. Solo gestiona si el menú lateral está abierto
 * (relevante por debajo de 900 px); el contenido llega ya renderizado desde el servidor.
 */
export function WorkspaceFrame({ sidebar, topbar, children }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  useEffect(() => { setAbierto(false); }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [abierto]);

  return <main className="workspace" data-menu={abierto ? 'open' : 'closed'}>
    <aside id="workspace-sidebar" className="workspace-sidebar" aria-label="Navegación principal">{sidebar}</aside>
    <button type="button" className="workspace-scrim" aria-label="Cerrar menú" tabIndex={abierto ? 0 : -1} onClick={() => setAbierto(false)} />
    <section className="workspace-main">
      <header className="workspace-topbar">
        <button type="button" className="menu-button" aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto} aria-controls="workspace-sidebar" onClick={() => setAbierto((valor) => !valor)}><Icon name={abierto ? 'close' : 'menu'} /></button>
        {topbar}
      </header>
      <section className="workspace-content">{children}</section>
    </section>
  </main>;
}
```

- [ ] **Step 3: Reescribir `workspace-shell.tsx`**

Reemplaza todo el contenido de `src/app/dashboard/_components/workspace-shell.tsx` por (conserva los roles, la navegación y los controles actuales; ya incluye "Mi cuenta" del plan A y los textos con "Lexcon" de la Tarea 8):

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@/platform/auth/current-user';
import { LogoutButton } from './logout-button';
import { BackButton } from './back-button';
import { SidebarMenu } from './sidebar-menu';
import { PushNotificationControl } from './push-notification-control';
import { WorkspaceFrame } from './workspace-frame';

const roleLabels: Record<CurrentUser['role'], string> = {
  ARKA_ADMIN: 'Administrador',
  ARKA_ATTORNEY: 'Abogado Lexcon',
  IE_RECTOR: 'Rector / ordenador del gasto',
  IE_SUPPORT: 'Funcionario autorizado de la IE',
  IE_COMMITTEE: 'Comité de evaluación',
};

export type NavigationItem = { href: string; label: string; icon: string; section?: string };

const accountItem: NavigationItem = { href: '/dashboard/account', label: 'Mi cuenta', icon: '◍', section: 'MI ESPACIO' };

function baseNavFor(user: CurrentUser): NavigationItem[] {
  if (user.role === 'ARKA_ADMIN') return [
    { href: '/dashboard/admin', label: 'Bandeja de trabajo', icon: '▦', section: 'OPERACIÓN CONTRACTUAL' },
    { href: '/dashboard/admin/processes', label: 'Procesos por IE', icon: '□' },
    { href: '/dashboard/admin/assignments', label: 'Asignar responsable jurídico', icon: '+' },
    { href: '/dashboard/admin/alerts', label: 'Alertas y bloqueos', icon: '!' },
    { href: '/dashboard/admin/institutions', label: 'Instituciones Educativas', icon: '⌂', section: 'ADMINISTRACIÓN LEXCON' },
    { href: '/dashboard/admin/institutions/new', label: 'Registrar Institución Educativa', icon: '+' },
    { href: '/dashboard/admin/lawyers', label: 'Equipo jurídico', icon: '◌' },
    { href: '/dashboard/admin/lawyers/new', label: 'Registrar abogado Lexcon', icon: '+' },
    { href: '/dashboard/admin/users', label: 'Usuarios y accesos', icon: '◉' },
    { href: '/dashboard/admin/audit', label: 'Registro de actuaciones', icon: '≡' },
  ];
  if (user.role === 'ARKA_ATTORNEY') return [{ href: '/dashboard/attorney', label: 'Instituciones asignadas', icon: '▦' }];
  if (user.role === 'IE_COMMITTEE') return [];
  return [{ href: '/dashboard/institution', label: 'Procesos', icon: '▦' }, { href: '/dashboard/institution#opening', label: 'Nuevo proceso', icon: '+' }, { href: '/dashboard/regulations', label: 'Manual de contratación IE', icon: '≡' }];
}

function navFor(user: CurrentUser): NavigationItem[] {
  const base = baseNavFor(user);
  return user.role === 'IE_COMMITTEE' ? base : [...base, accountItem];
}

export function WorkspaceShell({ user, children, activePath }: { user: CurrentUser; children: ReactNode; activePath: string }) {
  const sidebar = <>
    <Link className="wordmark app-wordmark" href="/dashboard"><span className="workspace-seal" aria-hidden="true">L</span><span className="brand-lockup"><span className="brand-title">LEXCON <strong>IAG</strong></span><small>Contratación FSE</small></span></Link>
    <section className="iag-presence" aria-label="Estado del agente IAG"><span className="iag-orbit" aria-hidden="true"><i /></span><div><small>AGENTE IAG</small><strong>Análisis y trazabilidad activos</strong><span>Las decisiones siguen siendo humanas.</span></div></section>
    {user.role === 'ARKA_ADMIN' && activePath !== '/dashboard/admin' && <BackButton />}
    <SidebarMenu items={navFor(user)} activePath={activePath} />
    <div className="workspace-integrity"><span aria-hidden="true">✓</span><div><strong>Acceso protegido</strong><small>Las actuaciones quedan trazables.</small></div></div>
    <div className="sidebar-user">
      <span className="identity-mark" aria-hidden="true">{user.name.slice(0, 1)}</span>
      <div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small>{user.institutionName && <small>{user.institutionName}</small>}</div>
    </div>
  </>;

  const topbar = <>
    <div className="topbar-role"><span className="topbar-beacon" aria-hidden="true" /><span>{roleLabels[user.role]}</span><small>Centro de operaciones</small></div>
    <div className="topbar-actions">
      <div className="topbar-agent"><i aria-hidden="true" /><span>Agente IAG en línea</span></div>
      <span className="topbar-secure"><i aria-hidden="true" /><small>Entorno protegido</small></span>
      <PushNotificationControl />
      <LogoutButton className="topbar-logout" />
    </div>
  </>;

  return <WorkspaceFrame sidebar={sidebar} topbar={topbar}>{children}</WorkspaceFrame>;
}
```

- [ ] **Step 4: Quitar los botones de desplazamiento del menú**

En `src/app/dashboard/_components/sidebar-menu.tsx`, reemplaza el componente completo por (el menú se desplaza por sí solo; se conserva la apertura en la sección activa):

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { NavigationItem } from './workspace-shell';

export function SidebarMenu({ items, activePath }: { items: NavigationItem[]; activePath: string }) {
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector('a.active')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [activePath]);

  return <div className="sidebar-menu"><nav className="workspace-nav" ref={menuRef}>{items.map((item) => <span className="nav-entry" key={item.href}>{item.section && <span className="nav-section">{item.section}</span>}<Link className={item.href === activePath ? 'active' : ''} href={item.href}><span className="nav-symbol" aria-hidden="true">{item.icon}</span>{item.label}</Link></span>)}</nav></div>;
}
```

- [ ] **Step 5: Estilos del menú**

Reemplaza el contenido de `src/app/styles/shell.css` por:

```css
/* ===== Marco ===== */
.workspace {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  width: calc(100% - 2 * var(--gutter));
  max-width: 1440px;
  min-height: calc(100svh - 2 * var(--gutter));
  margin: var(--gutter) auto;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-xl);
  background: linear-gradient(160deg, var(--petrol-800), var(--petrol-900));
  box-shadow: 0 40px 90px -30px rgba(0, 20, 40, 0.7);
  overflow: clip;
}

/* ===== Menú lateral ===== */
.workspace-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100svh;
  max-height: 100%;
  padding: 20px 14px;
  color: var(--on-petrol);
  overflow-y: auto;
  z-index: 30;
}
.workspace-sidebar :focus-visible { outline-color: #fff; }

.app-wordmark { display: flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; padding: 2px 6px; }
.workspace-seal { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(145deg, #2fcf86, #27b9c9); color: #06303a; font-weight: 800; font-size: 1.1rem; }
.brand-title { display: block; color: #fff; font-weight: 800; letter-spacing: 0.04em; font-size: 1.1rem; }
.brand-title strong { color: #8ff0c6; }
.brand-lockup small { display: block; color: var(--on-petrol-muted); font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; }

.iag-presence { display: flex; gap: 10px; align-items: center; padding: 12px; border-radius: 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); }
.iag-orbit { position: relative; flex: none; width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(143, 240, 198, 0.5); }
.iag-orbit i { position: absolute; inset: 6px; border-radius: 50%; background: #3ddc97; animation: esm-pulse 2.2s infinite; }
.iag-presence small { display: block; color: #8ff0c6; font-size: 0.62rem; letter-spacing: 0.16em; }
.iag-presence strong { display: block; color: #fff; font-size: 0.82rem; }
.iag-presence div span { display: block; color: var(--on-petrol-muted); font-size: 0.74rem; }

.sidebar-back { align-self: flex-start; min-height: var(--touch); padding: 0.4rem 0.8rem; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; background: none; color: #fff; font-weight: 600; cursor: pointer; }

.sidebar-menu { flex: 1 0 auto; }
.workspace-nav { display: grid; gap: 2px; }
.nav-entry { display: block; }
.nav-section { display: block; padding: 14px 12px 6px; color: var(--on-petrol-muted); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.16em; }
.workspace-nav a { display: flex; align-items: center; gap: 12px; min-height: var(--touch); padding: 0.6rem 0.8rem; border-radius: 14px; color: var(--on-petrol); font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: background 0.2s, transform 0.2s, color 0.2s; }
.workspace-nav a:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
.workspace-nav a.active { background: rgba(255, 255, 255, 0.16); color: #fff; font-weight: 700; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28); }
.nav-symbol { width: 22px; text-align: center; color: #8ff0c6; }

.workspace-integrity { display: flex; gap: 10px; color: var(--on-petrol-muted); font-size: 0.78rem; }
.workspace-integrity strong { display: block; color: #fff; }
.workspace-integrity > span { color: #8ff0c6; }
.sidebar-user { display: flex; gap: 10px; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.14); }
.identity-mark { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(145deg, #2fcf86, #27b9c9); color: #06303a; font-weight: 800; }
.sidebar-user strong { display: block; color: #fff; font-size: 0.86rem; }
.sidebar-user small { display: block; color: var(--on-petrol-muted); font-size: 0.74rem; }

/* ===== Zona principal y barra superior ===== */
.workspace-main { display: flex; flex-direction: column; min-width: 0; margin: 14px 14px 14px 0; border-radius: 24px; background: linear-gradient(180deg, var(--surface-page), var(--surface-page-2)); box-shadow: inset 0 1px 0 #fff; overflow: clip; }
.workspace-topbar { position: sticky; top: 0; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 14px clamp(16px, 2.4vw, 28px); background: rgba(244, 251, 250, 0.88); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.menu-button, .workspace-scrim { display: none; }
.menu-button { place-items: center; flex: none; width: var(--touch); height: var(--touch); border: 1px solid var(--line-strong); border-radius: 12px; background: #fff; color: var(--ink); cursor: pointer; }

.topbar-role { display: flex; align-items: center; gap: 10px; min-width: 0; }
.topbar-role > span:not(.topbar-beacon) { font-weight: 700; }
.topbar-role small, .topbar-secure small { color: var(--ink-muted); font-size: 0.78rem; }
.topbar-beacon { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); animation: esm-pulse 2.2s infinite; }
.topbar-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-left: auto; }
.topbar-agent { display: inline-flex; align-items: center; gap: 8px; padding: 0.4rem 0.9rem; border-radius: 999px; background: var(--petrol-800); color: #fff; font-size: 0.82rem; font-weight: 600; }
.topbar-agent i { width: 8px; height: 8px; border-radius: 50%; background: #3ddc97; }
.topbar-secure { display: inline-flex; align-items: center; gap: 6px; }
.topbar-secure i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.push-status { color: var(--ink-muted); font-size: 0.78rem; }

.workspace-content { display: grid; gap: 18px; align-content: start; flex: 1; min-width: 0; padding: clamp(16px, 2.4vw, 28px); }

/* ===== Portátil pequeño ===== */
@media (max-width: 1180px) {
  .workspace { grid-template-columns: 236px minmax(0, 1fr); }
}

/* ===== Tablet y celular: el menú pasa a un panel desplegable ===== */
@media (max-width: 900px) {
  .workspace { display: block; width: 100%; margin: 0; min-height: 100svh; border: 0; border-radius: 0; background: var(--surface-page); box-shadow: none; }
  .workspace-sidebar {
    position: fixed; inset: 0 auto 0 0; z-index: 70;
    width: min(300px, 86vw); height: 100svh;
    background: linear-gradient(185deg, var(--petrol-800), var(--petrol-900));
    transform: translateX(-104%); transition: transform 0.3s ease, box-shadow 0.3s ease; box-shadow: none;
  }
  .workspace[data-menu='open'] .workspace-sidebar { transform: none; box-shadow: 20px 0 60px -20px rgba(0, 0, 0, 0.8); }
  .workspace-scrim { display: block; position: fixed; inset: 0; z-index: 60; border: 0; background: rgba(5, 25, 35, 0.55); opacity: 0; pointer-events: none; transition: opacity 0.25s; }
  .workspace[data-menu='open'] .workspace-scrim { opacity: 1; pointer-events: auto; }
  .menu-button { display: grid; }
  .workspace-main { margin: 0; border-radius: 0; box-shadow: none; min-height: 100svh; }
  .topbar-role small, .topbar-secure { display: none; }
}

@media (max-width: 600px) {
  .topbar-agent span { display: none; }
  .topbar-agent { padding: 0.5rem; }
  .logout-button { padding: 0.5rem 0.9rem; }
}
```

- [ ] **Step 6: Tipos**

Run: `corepack pnpm typecheck`
Expected: sin errores. (Las pruebas visuales se hacen en la Tarea 9.)

---

### Task 6: Pantallas de acceso

**Files:**
- Create (completar): `src/app/styles/access.css`

- [ ] **Step 1: Estilos de acceso**

Reemplaza el contenido de `src/app/styles/access.css` por:

```css
/* Pantallas de acceso: inicio de sesión, activación, recuperación, definir contraseña y confirmación. */
.access {
  display: grid;
  min-height: 100svh;
  padding: var(--gutter);
}
.access-frame {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  align-items: stretch;
  width: 100%;
  max-width: 1180px;
  margin: auto;
  min-height: min(720px, calc(100svh - 2 * var(--gutter)));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  background: linear-gradient(160deg, var(--petrol-800), var(--petrol-900));
  box-shadow: 0 40px 90px -30px rgba(0, 20, 40, 0.7);
  overflow: hidden;
  position: relative;
  color: #fff;
}
.access-frame::before {
  content: '';
  position: absolute;
  left: -12%;
  top: -22%;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 207, 134, 0.38), transparent 66%);
  pointer-events: none;
}
.access-frame > * { position: relative; }

.access-topbar { grid-column: 1 / -1; padding: 24px clamp(20px, 4vw, 40px) 0; }
.access-brand { display: inline-flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; }
.brand-seal { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(145deg, #2fcf86, #27b9c9); color: #06303a; font-weight: 800; font-size: 1.1rem; }
.access-brand .brand-title { font-size: 1.15rem; }

.access-hero { align-self: center; padding: clamp(24px, 5vw, 56px); max-width: 640px; }
.access-hero .eyebrow { color: #8ff0c6; }
.access-hero h1 { margin: 0.5rem 0 0.9rem; font-size: clamp(2.1rem, 5.2vw, 3.6rem); line-height: 1.04; letter-spacing: -0.02em; }
.access-hero > p:not(.eyebrow) { max-width: 46ch; color: var(--on-petrol); font-size: 1.05rem; }
.credentials-link { margin-top: 1rem; min-height: var(--touch); padding: 0.4rem 0; border: 0; background: none; color: #8ff0c6; font-weight: 600; text-decoration: underline; cursor: pointer; }

.login-card {
  align-self: center;
  margin: clamp(14px, 3vw, 32px);
  padding: clamp(20px, 3vw, 32px);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  color: var(--ink);
  box-shadow: 0 30px 60px -30px rgba(0, 20, 40, 0.7);
}
.login-card-heading { display: flex; gap: 14px; align-items: center; margin-bottom: 1rem; }
.login-glyph { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(145deg, #0d8559, #16799a); color: #fff; font-weight: 800; }
.login-card-heading h2 { font-size: 1.5rem; }
.login-card-heading p { color: var(--ink-muted); font-size: 0.92rem; }
.login-form { display: grid; gap: 14px; }
.login-card .primary-button { width: 100%; }
.login-card .text-button { display: flex; margin-top: 0.4rem; }
.active-session { display: grid; gap: 2px; padding: 12px 14px; margin-bottom: 14px; border-radius: var(--radius-md); background: var(--accent-soft); }
.active-session span { color: var(--ink-muted); }
.demo-profiles { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
.profile-list { display: grid; gap: 8px; }
.profile-option { display: grid; gap: 2px; text-align: left; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: #fff; color: var(--ink); cursor: pointer; }
.demo-profile-copy { color: var(--ink-muted); font-size: 0.85rem; margin-bottom: 8px; }

@media (max-width: 900px) {
  .access { padding: 0; }
  .access-frame { grid-template-columns: minmax(0, 1fr); min-height: 100svh; border: 0; border-radius: 0; }
  .access-hero { align-self: start; padding: 20px 22px 8px; }
  .access-hero h1 { font-size: clamp(2rem, 9vw, 2.8rem); }
  .login-card { margin: 14px; }
}
```

- [ ] **Step 2: Comprobar tipos**

Run: `corepack pnpm typecheck`
Expected: sin errores.

---

### Task 7: Bandeja de trabajo con indicadores reales

**Files:**
- Create: `src/modules/admin/inbox-summary.ts`, `src/modules/admin/donut-segments.ts`
- Create: `tests/unit/inbox-summary.test.ts`
- Create: `src/app/dashboard/_components/kpi-card.tsx`, `bar-list.tsx`, `donut.tsx`
- Rewrite: `src/app/dashboard/admin/page.tsx`
- Create (completar): `src/app/styles/inbox.css`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/unit/inbox-summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calcularSegmentos } from '../../src/modules/admin/donut-segments';
import { esBloqueado, resumirBandeja } from '../../src/modules/admin/inbox-summary';

const procesos = [
  { institutionName: 'IE Horizonte', attorneyName: null, status: 'BLOCKED_REGULATION' },
  { institutionName: 'IE Horizonte', attorneyName: 'Abogada', status: 'BLOCKED_MARKET_DATA' },
  { institutionName: 'IE Horizonte', attorneyName: 'Abogada', status: 'PENDING_ACTION' },
  { institutionName: 'IE Amanecer', attorneyName: 'Abogada', status: 'COMPLETED' },
];

describe('resumen de la bandeja', () => {
  it('cuenta procesos, instituciones, sin responsable y bloqueados', () => {
    const resumen = resumirBandeja(procesos);
    expect(resumen.total).toBe(4);
    expect(resumen.instituciones).toBe(2);
    expect(resumen.sinResponsable).toBe(1);
    expect(resumen.conResponsable).toBe(3);
    expect(resumen.bloqueados).toBe(2);
  });

  it('ordena las instituciones por cantidad de procesos y luego por nombre', () => {
    expect(resumirBandeja(procesos).porInstitucion).toEqual([{ nombre: 'IE Horizonte', total: 3 }, { nombre: 'IE Amanecer', total: 1 }]);
  });

  it('funciona sin procesos', () => {
    expect(resumirBandeja([])).toEqual({ total: 0, instituciones: 0, sinResponsable: 0, conResponsable: 0, bloqueados: 0, porInstitucion: [] });
  });

  it('reconoce los estados bloqueados', () => {
    expect(esBloqueado('BLOCKED_REGULATION')).toBe(true);
    expect(esBloqueado('BLOCKED_MARKET_DATA')).toBe(true);
    expect(esBloqueado('PENDING_ACTION')).toBe(false);
  });
});

describe('segmentos de la dona', () => {
  it('reparte 100 unidades de trazo y desplaza cada segmento', () => {
    expect(calcularSegmentos([3, 1])).toEqual([
      { valor: 3, longitud: 75, desplazamiento: 0 },
      { valor: 1, longitud: 25, desplazamiento: -75 },
    ]);
  });

  it('devuelve segmentos vacíos si el total es cero', () => {
    expect(calcularSegmentos([0, 0])).toEqual([{ valor: 0, longitud: 0, desplazamiento: 0 }, { valor: 0, longitud: 0, desplazamiento: 0 }]);
  });

  it('ignora valores negativos', () => {
    expect(calcularSegmentos([-5, 5])[1].longitud).toBe(100);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `corepack pnpm exec vitest run tests/unit/inbox-summary.test.ts`
Expected: FAIL por imports no resueltos.

- [ ] **Step 3: Implementar las funciones puras**

`src/modules/admin/inbox-summary.ts`:

```ts
export interface ProcesoParaResumen { institutionName: string; attorneyName: string | null; status: string }

export interface ResumenBandeja {
  total: number;
  instituciones: number;
  sinResponsable: number;
  conResponsable: number;
  bloqueados: number;
  porInstitucion: Array<{ nombre: string; total: number }>;
}

export function esBloqueado(status: string): boolean { return status.startsWith('BLOCKED_'); }

/** Resume la bandeja a partir de los procesos del usuario; sirve con SQLite y con Supabase. */
export function resumirBandeja(procesos: readonly ProcesoParaResumen[]): ResumenBandeja {
  const porNombre = new Map<string, number>();
  let sinResponsable = 0;
  let bloqueados = 0;
  for (const proceso of procesos) {
    porNombre.set(proceso.institutionName, (porNombre.get(proceso.institutionName) ?? 0) + 1);
    if (!proceso.attorneyName) sinResponsable += 1;
    if (esBloqueado(proceso.status)) bloqueados += 1;
  }
  return {
    total: procesos.length,
    instituciones: porNombre.size,
    sinResponsable,
    conResponsable: procesos.length - sinResponsable,
    bloqueados,
    porInstitucion: [...porNombre.entries()].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')),
  };
}
```

`src/modules/admin/donut-segments.ts`:

```ts
export interface SegmentoDona { valor: number; longitud: number; desplazamiento: number }

/** Reparte 100 unidades de trazo (pathLength=100) entre los valores; el desplazamiento acumula el recorrido. */
export function calcularSegmentos(valores: readonly number[]): SegmentoDona[] {
  const limpios = valores.map((valor) => Math.max(0, valor));
  const total = limpios.reduce((suma, valor) => suma + valor, 0);
  if (total === 0) return limpios.map(() => ({ valor: 0, longitud: 0, desplazamiento: 0 }));
  let acumulado = 0;
  return limpios.map((valor) => {
    const longitud = (valor / total) * 100;
    const segmento = { valor, longitud, desplazamiento: acumulado === 0 ? 0 : -acumulado };
    acumulado += longitud;
    return segmento;
  });
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `corepack pnpm exec vitest run tests/unit/inbox-summary.test.ts`
Expected: PASS (7 pruebas). El primer segmento usa `desplazamiento: 0` (la función evita `-0`, que `toEqual` distingue de `0`).

- [ ] **Step 5: Componentes de servidor**

`src/app/dashboard/_components/kpi-card.tsx`:

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

export type TonoKpi = 'green' | 'blue' | 'amber' | 'rose';

export function KpiCard({ tono, icono, valor, etiqueta, href, accion }: { tono: TonoKpi; icono: ReactNode; valor: number; etiqueta: string; href?: string; accion?: string }) {
  const contenido = <>
    <span className="kpi-icon">{icono}</span>
    {accion && <span className="kpi-action">{accion} <span aria-hidden="true">→</span></span>}
    <span className="kpi-body"><strong className="kpi-value">{valor}</strong><span className="kpi-label">{etiqueta}</span></span>
  </>;
  return href
    ? <Link className={`kpi-card kpi-${tono}`} href={href}>{contenido}</Link>
    : <div className={`kpi-card kpi-${tono}`}>{contenido}</div>;
}
```

`src/app/dashboard/_components/bar-list.tsx`:

```tsx
export function BarList({ elementos, vacio }: { elementos: Array<{ etiqueta: string; valor: number }>; vacio: string }) {
  if (elementos.length === 0) return <p className="chart-empty">{vacio}</p>;
  const maximo = Math.max(1, ...elementos.map((elemento) => elemento.valor));
  return <ul className="bar-list">{elementos.map((elemento, indice) => <li key={elemento.etiqueta}>
    <div className="bar-list-head"><span>{elemento.etiqueta}</span><strong>{elemento.valor}</strong></div>
    <div className="bar-track" aria-hidden="true"><div className={`bar-fill bar-fill-${indice % 2}`} style={{ width: `${(elemento.valor / maximo) * 100}%` }} /></div>
  </li>)}</ul>;
}
```

`src/app/dashboard/_components/donut.tsx`:

```tsx
import { calcularSegmentos } from '@/modules/admin/donut-segments';

export type TonoDona = 'green' | 'amber';

export function Donut({ partes, etiquetaTotal }: { partes: Array<{ etiqueta: string; valor: number; tono: TonoDona }>; etiquetaTotal: string }) {
  const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
  const segmentos = calcularSegmentos(partes.map((parte) => parte.valor));
  const descripcion = `${total} ${etiquetaTotal}: ${partes.map((parte) => `${parte.valor} ${parte.etiqueta.toLowerCase()}`).join(', ')}`;
  return <figure className="donut">
    <div className="donut-chart">
      <svg viewBox="0 0 140 140" role="img" aria-label={descripcion}>
        <circle className="donut-track" cx="70" cy="70" r="52" pathLength={100} />
        {segmentos.map((segmento, indice) => segmento.longitud > 0 && <circle key={partes[indice].etiqueta} className={`donut-part donut-${partes[indice].tono}`} cx="70" cy="70" r="52" pathLength={100} strokeDasharray={`${segmento.longitud} ${100 - segmento.longitud}`} strokeDashoffset={segmento.desplazamiento} />)}
      </svg>
      <div className="donut-center"><strong>{total}</strong><small>{etiquetaTotal}</small></div>
    </div>
    <figcaption className="donut-legend">{partes.map((parte) => <span key={parte.etiqueta}><i className={`dot dot-${parte.tono}`} aria-hidden="true" />{parte.etiqueta} {parte.valor}</span>)}</figcaption>
  </figure>;
}
```

- [ ] **Step 6: Reescribir la bandeja**

Reemplaza todo el contenido de `src/app/dashboard/admin/page.tsx` por (los textos con "Arka Litigios IAG" y "Equipo jurídico Arka" ya están cambiados según la Tarea 8; la fecha y el estado conservan el formato actual):

```tsx
import Link from 'next/link';
import { resumirBandeja } from '@/modules/admin/inbox-summary';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { WorkspaceShell } from '../_components/workspace-shell';
import { phaseLabel, ProcessStatus } from '../_components/process-status';
import { BarList } from '../_components/bar-list';
import { Donut } from '../_components/donut';
import { Icon } from '../_components/icons';
import { KpiCard } from '../_components/kpi-card';
import { requireWorkspaceUser } from '../require-workspace-user';

export default async function AdminPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const processes = await listProcessesFor(user);
  const resumen = resumirBandeja(processes);
  const workQueue = processes.filter((process) => !process.attorneyName || process.status === 'BLOCKED_REGULATION' || process.status === 'BLOCKED_MARKET_DATA');
  return <WorkspaceShell user={user} activePath="/dashboard/admin"><div className="page-stack inbox">
    <header className="page-heading app-page-heading">
      <div><p className="section-kicker">Gestión documental</p><h1>Bandeja de trabajo</h1><p>Solo aparecen los procesos que requieren una actuación administrativa o jurídica. El registro completo está en Todos los procesos.</p></div>
      <Link className="primary-button" href="/dashboard/admin/processes">Ver todos los procesos <span aria-hidden="true">→</span></Link>
    </header>

    <section className="kpi-grid" aria-label="Indicadores">
      <KpiCard tono="green" icono={<Icon name="folder" />} valor={resumen.total} etiqueta="Procesos registrados" />
      <KpiCard tono="blue" icono={<Icon name="school" />} valor={resumen.instituciones} etiqueta="Instituciones con procesos" />
      <KpiCard tono="amber" icono={<Icon name="assign" />} valor={resumen.sinResponsable} etiqueta="Sin responsable jurídico" href="/dashboard/admin/assignments" accion="Gestionar" />
      <KpiCard tono="rose" icono={<Icon name="block" />} valor={resumen.bloqueados} etiqueta="Actuaciones bloqueadas" href="/dashboard/admin/alerts" accion="Ver alertas" />
    </section>

    <section className="inbox-board">
      <div className="surface inbox-bars"><div className="section-heading"><div><h2>Procesos por Institución Educativa</h2></div><span>{resumen.instituciones} {resumen.instituciones === 1 ? 'institución' : 'instituciones'}</span></div><BarList elementos={resumen.porInstitucion.map((item) => ({ etiqueta: item.nombre, valor: item.total }))} vacio="Aún no hay procesos registrados." /></div>
      <div className="surface inbox-donut"><div className="section-heading"><div><h2>Responsable jurídico</h2></div></div><Donut etiquetaTotal="procesos" partes={[{ etiqueta: 'Asignado', valor: resumen.conResponsable, tono: 'green' }, { etiqueta: 'Sin asignar', valor: resumen.sinResponsable, tono: 'amber' }]} /></div>
    </section>

    <section className="surface work-queue">
      <div className="section-heading"><div><p className="section-kicker">Pendientes de atención</p><h2>Procesos que requieren intervención</h2></div><span>{workQueue.length} {workQueue.length === 1 ? 'pendiente' : 'pendientes'}</span></div>
      {workQueue.length ? <div className="work-queue-list">{workQueue.map((process) => <Link className="work-item" href={`/dashboard/processes/${process.id}`} key={process.id}>
        <span className="work-item-signal" aria-hidden="true"><Icon name="block" /></span>
        <div className="work-item-main"><small>Proceso de contratación · {phaseLabel(process.phase)}</small><strong>{process.institutionName}</strong><span>{process.attorneyName ? `Responsable jurídico: ${process.attorneyName}` : 'Requiere asignar responsable jurídico'}</span></div>
        <div className="work-item-status"><ProcessStatus status={process.status} /><small>Abierto el {new Date(process.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div>
        <span className="work-item-open">Ver proceso <b aria-hidden="true">→</b></span>
      </Link>)}</div> : <div className="dossier-empty"><strong>No hay procesos pendientes de atención.</strong><p>Los procesos registrados siguen disponibles en Todos los procesos.</p></div>}
    </section>

    <section className="dossier-footer-nav">
      <Link href="/dashboard/admin/institutions"><span aria-hidden="true">⌂</span><div><strong>Instituciones Educativas</strong><small>Relación de servicio, estado y responsables institucionales.</small></div><b aria-hidden="true">→</b></Link>
      <Link href="/dashboard/admin/lawyers"><span aria-hidden="true">◌</span><div><strong>Equipo jurídico Lexcon</strong><small>Abogados disponibles y sus asignaciones vigentes.</small></div><b aria-hidden="true">→</b></Link>
      <Link href="/dashboard/admin/audit"><span aria-hidden="true">≡</span><div><strong>Registro de actuaciones</strong><small>Trazabilidad de aperturas, asignaciones y cambios administrativos.</small></div><b aria-hidden="true">→</b></Link>
    </section>
  </div></WorkspaceShell>;
}
```

- [ ] **Step 7: Estilos de la bandeja**

Reemplaza el contenido de `src/app/styles/inbox.css` por:

```css
/* ===== Tarjetas de indicadores ===== */
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.kpi-card {
  position: relative;
  display: flex; flex-direction: column; justify-content: space-between; gap: 18px;
  min-width: 0; min-height: 128px; padding: 18px;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 34px -20px rgba(0, 30, 40, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  text-decoration: none; overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease;
}
.kpi-card::after { content: ''; position: absolute; right: -30px; bottom: -40px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255, 255, 255, 0.14); pointer-events: none; }
.kpi-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: rgba(255, 255, 255, 0.24); }
.kpi-action { position: absolute; right: 16px; top: 16px; font-size: 0.78rem; font-weight: 700; }
.kpi-body { position: relative; z-index: 1; display: grid; gap: 2px; }
.kpi-value { font-size: 2.4rem; line-height: 1; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi-label { font-size: 0.86rem; font-weight: 600; }
.kpi-green { background: linear-gradient(145deg, var(--kpi-green-a), var(--kpi-green-b)); color: var(--kpi-green-ink); }
.kpi-blue { background: linear-gradient(145deg, var(--kpi-blue-a), var(--kpi-blue-b)); color: var(--kpi-blue-ink); }
.kpi-amber { background: linear-gradient(145deg, var(--kpi-amber-a), var(--kpi-amber-b)); color: var(--kpi-amber-ink); }
.kpi-amber .kpi-icon { background: rgba(42, 24, 0, 0.14); }
.kpi-rose { background: linear-gradient(145deg, var(--kpi-rose-a), var(--kpi-rose-b)); color: var(--kpi-rose-ink); }

/* ===== Gráficos ===== */
.inbox-board { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 16px; }
.chart-empty { color: var(--ink-muted); }
.bar-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
.bar-list-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 7px; font-size: 0.9rem; }
.bar-list-head span { min-width: 0; overflow-wrap: anywhere; }
.bar-list-head strong { font-variant-numeric: tabular-nums; }
.bar-track { height: 12px; border-radius: 999px; background: var(--surface-page-2); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; transform-origin: left; animation: esm-grow 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.bar-fill-0 { background: linear-gradient(90deg, var(--kpi-green-b), #2fcf86); }
.bar-fill-1 { background: linear-gradient(90deg, var(--kpi-blue-b), #27b9c9); }
@keyframes esm-grow { from { transform: scaleX(0); } }

.donut { display: grid; justify-items: center; gap: 12px; margin: 0; }
.donut-chart { position: relative; width: 170px; height: 170px; }
.donut-chart svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-chart circle { fill: none; stroke-width: 15; }
.donut-track { stroke: var(--surface-page-2); }
.donut-green { stroke: var(--kpi-green-b); }
.donut-amber { stroke: #f08a00; }
.donut-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.donut-center strong { font-size: 2rem; line-height: 1; }
.donut-center small { color: var(--ink-muted); }
.donut-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; color: var(--ink-muted); font-size: 0.84rem; }
.dot { display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; }
.dot-green { background: var(--kpi-green-b); }
.dot-amber { background: #f08a00; }

/* ===== Cola de trabajo ===== */
.work-queue-list { display: grid; gap: 12px; }
.work-item {
  display: grid; grid-template-columns: 46px minmax(0, 1fr) auto auto; gap: 16px; align-items: center;
  padding: 13px 16px; border: 1px solid var(--line); border-radius: var(--radius-md);
  background: #fff; color: var(--ink); text-decoration: none; min-width: 0;
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease, border-color 0.2s ease;
}
.work-item-signal { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(145deg, var(--kpi-rose-a), var(--kpi-rose-b)); color: var(--kpi-rose-ink); }
.work-item-main { min-width: 0; }
.work-item-main small { display: block; color: var(--ink-muted); font-size: 0.72rem; letter-spacing: 0.03em; text-transform: uppercase; }
.work-item-main strong { display: block; font-size: 1.05rem; }
.work-item-main > span { display: block; color: var(--danger); font-weight: 600; font-size: 0.88rem; }
.work-item-status { display: grid; gap: 4px; justify-items: start; }
.work-item-status small { color: var(--ink-muted); font-size: 0.78rem; }
.work-item-open { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-weight: 600; font-size: 0.88rem; white-space: nowrap; }

.dossier-footer-nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 14px; }
.dossier-footer-nav a { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-card); color: var(--ink); text-decoration: none; transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease, border-color 0.2s ease; }
.dossier-footer-nav a > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.dossier-footer-nav strong { display: block; }
.dossier-footer-nav small { color: var(--ink-muted); }
.dossier-footer-nav b { color: var(--accent); }

/* ===== Adaptabilidad ===== */
@media (max-width: 1180px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .inbox-board { grid-template-columns: minmax(0, 1fr); }
  .work-item { grid-template-columns: 46px minmax(0, 1fr); row-gap: 10px; align-items: start; }
  .work-item-status, .work-item-open { grid-column: 2; }
  .work-item-open { justify-self: start; min-height: var(--touch); }
}
@media (max-width: 600px) {
  .kpi-grid { gap: 12px; }
  .kpi-card { min-height: 116px; padding: 14px; }
  .kpi-value { font-size: 2rem; }
  .kpi-action { position: static; order: 3; }
}
@media (max-width: 360px) {
  .kpi-grid { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 8: Tipos y pruebas**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: todo en verde.

---

### Task 8: Textos: quitar "Arka Litigios IAG" y cambiar "Arka" por "Lexcon"

**Files:** 13 archivos de `src/`, 2 pruebas existentes, `README.md`, y la guarda nueva.
- Create: `tests/unit/visible-text-guard.test.ts`

Las cadenas internas (`ARKA_ADMIN`, `ARKA_ATTORNEY`, `ADMINISTRADOR_ARKA`, `ABOGADO_ARKA`, correos `*.arka@demo.invalid`, contraseñas de demostración) **no se tocan**.

- [ ] **Step 1: Escribir la guarda que falla**

`tests/unit/visible-text-guard.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function archivos(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true, recursive: true })
    .filter((entrada) => entrada.isFile() && /\.(ts|tsx)$/.test(entrada.name))
    .map((entrada) => join(entrada.parentPath, entrada.name));
}

const PROHIBIDOS = [
  'Arka Litigios',
  'Administrador Arka', 'Administración Arka', 'administración Arka',
  'Equipo jurídico Arka', 'ADMINISTRACIÓN ARKA',
  'abogado Arka', 'Abogado Arka', 'abogados Arka', 'Abogada Arka',
];

describe('textos visibles de la aplicación', () => {
  const origen = join(__dirname, '../../src');
  const contenido = archivos(origen).map((ruta) => ({ ruta, texto: readFileSync(ruta, 'utf8') }));

  it.each(PROHIBIDOS)('no contiene "%s"', (frase) => {
    const encontrados = contenido.filter(({ texto }) => texto.includes(frase)).map(({ ruta }) => ruta.replace(origen, 'src'));
    expect(encontrados).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/visible-text-guard.test.ts`
Expected: FAIL; los `it.each` listan los archivos con cada frase.

- [ ] **Step 3: Aplicar los cambios de texto**

Usa `Edit` (o reemplazo exacto) en cada archivo. Tabla completa (archivo → texto actual → texto nuevo). Las dos apariciones del `workspace-shell.tsx` y la bandeja ya quedan correctas por las Tareas 5 y 7; se listan para verificar.

| Archivo | Actual | Nuevo |
|---|---|---|
| `src/app/login/login-form.tsx` | `activeSession.institutionName ?? 'Arka Litigios IAG'` | `activeSession.institutionName ?? 'Acceso global'` |
| `src/app/dashboard/admin/admin-accesses.tsx` | `'Administrador Arka'` y `'Abogado Arka'` (en `roleLabel`) | `'Administrador Lexcon'` y `'Abogado Lexcon'` |
| `src/app/dashboard/admin/admin-accesses.tsx` | `access.institutionName ?? 'Arka Litigios IAG'` | `access.institutionName ?? 'Acceso global'` |
| `src/app/dashboard/admin/admin-assignment.tsx` | `No hay abogados Arka disponibles para asignar.` | `No hay abogados Lexcon disponibles para asignar.` |
| `src/app/dashboard/admin/admin-assignment.tsx` | `<label>Abogado Arka<select` | `<label>Abogado Lexcon<select` |
| `src/app/dashboard/admin/attorney-management.tsx` | `'Editar abogado Arka' : 'Nuevo abogado Arka'` | `'Editar abogado Lexcon' : 'Nuevo abogado Lexcon'` |
| `src/app/dashboard/admin/attorney-management.tsx` | `Equipo jurídico Arka` | `Equipo jurídico Lexcon` |
| `src/app/dashboard/admin/institution-management.tsx` | `su estado de servicio con Arka Litigios IAG.` | `su estado de servicio.` |
| `src/app/dashboard/admin/lawyers/new/page.tsx` | `<h1>Registrar abogado Arka</h1>` | `<h1>Registrar abogado Lexcon</h1>` |
| `src/app/dashboard/attorney/page.tsx` | `cuando Administración Arka vincule procesos` | `cuando Administración Lexcon vincule procesos` |
| `src/app/dashboard/processes/[processId]/page.tsx` | `<dt>Abogado Arka</dt>` | `<dt>Abogado Lexcon</dt>` |
| `src/app/api/admin/institutions/route.ts` | `Servicio finalizado por administración Arka.` | `Servicio finalizado por administración Lexcon.` |
| `src/modules/processes/workflow.ts` | `El abogado Arka aprobó el estudio de mercado.` | `El abogado Lexcon aprobó el estudio de mercado.` |
| `src/modules/processes/workflow.ts` | `El abogado Arka solicitó correcciones al estudio de mercado:` | `El abogado Lexcon solicitó correcciones al estudio de mercado:` |
| `src/platform/auth/demo-credentials.ts` | `role: 'Administrador Arka'` / `displayName: 'Administración Arka (ficticia)'` | `role: 'Administrador Lexcon'` / `displayName: 'Administración Lexcon (ficticia)'` |
| `src/platform/auth/demo-credentials.ts` | `role: 'Abogado Arka'` / `displayName: 'Abogada Arka (ficticia)'` | `role: 'Abogado Lexcon'` / `displayName: 'Abogada Lexcon (ficticia)'` |
| `src/app/dashboard/_components/workspace-shell.tsx` | (ya cambiado en la Tarea 5) | verificar `Abogado Lexcon`, `ADMINISTRACIÓN LEXCON`, `Registrar abogado Lexcon` |
| `src/app/dashboard/admin/page.tsx` | (ya cambiado en la Tarea 7) | verificar `Gestión documental` y `Equipo jurídico Lexcon` |

Pruebas existentes que comparan estos textos (cambiar `Arka` por `Lexcon` solo en los textos esperados):
- `tests/integration/market-study-legal-review.test.ts` líneas ~39 y ~49: `El abogado Arka solicitó…` / `El abogado Arka aprobó…` → `El abogado Lexcon …`.

README (tabla de demostración, líneas 28–29): `Administrador Arka` → `Administrador Lexcon` y `Abogado Arka` → `Abogado Lexcon` (los correos y contraseñas no cambian).

Nota: las cuentas locales ya sembradas conservan su nombre anterior hasta volver a ejecutar `corepack pnpm db:seed` (la semilla actualiza el nombre mostrado).

- [ ] **Step 4: Ejecutar la guarda y la suite**

Run: `corepack pnpm exec vitest run tests/unit/visible-text-guard.test.ts && corepack pnpm typecheck && corepack pnpm test`
Expected: la guarda pasa (10 casos) y toda la suite está en verde.

---

### Task 9: Aplicar la poda, verificación visual de la Fase 1 y commit

**Files:**
- Modify: `src/app/ui.css`, `src/app/globals.css` (poda)
- Modify: documentación

- [ ] **Step 1: Instancia local temporal**

Run (en segundo plano): `corepack pnpm exec next dev -p 3100`

- [ ] **Step 2: Capturar el "después de la capa" (aún sin poda)**

Run: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/capa --roles publico,admin`
Revisa visualmente las capturas de `/login`, `/dashboard/admin` y `/dashboard/admin/processes` a 390, 820, 1280 y 1440 px (abre los PNG). Comprueba contra la especificación: fondo degradado, marco redondeado, menú petróleo, tarjetas de colores, menú desplegable en 390 y 820 px.

- [ ] **Step 3: Simular la poda**

Run:

```bash
node scripts/prune-legacy-css.mjs --file src/app/ui.css --quitar-important --conservar-important '^\.evaluation-member-row' --conservar-media 'prefers-reduced-motion' --eliminar '^.(workspace|wordmark|app-wordmark|brand-|sidebar-|nav-|iag-(presence|orbit)|topbar-|identity-mark|logout-button|push-|access(-v2|-frame|-hero|-topbar|-brand)?(?![\w-])|login-|profile-|demo-|credentials-link|dossier-|work-|priority-icon|page-heading|app-page-heading|section-kicker|eyebrow|primary-button|secondary-button|text-button|danger-button|text-danger-button|field-label|password-|form-message|status|empty-state)'
```

Expected: informa cuántos selectores se eliminarían y los lista, sin escribir nada. Léela: deben ser solo componentes de menú, acceso, bandeja, botones, campos, encabezados e insignias (no deben aparecer `.access-card*`, `.iag-drafts` ni `.integrity-metric`, que otras pantallas siguen usando). Los comandos con comillas simples son para Git Bash; en PowerShell usa comillas dobles. Si aparece un selector de otra pantalla que no debería perderse, quítalo del patrón antes de continuar.

- [ ] **Step 4: Aplicar la poda a `ui.css` y `globals.css`**

Run el mismo comando de arriba añadiendo `--write`, y repítelo con `--file src/app/globals.css`.
Expected: `Archivo reescrito.` en ambos. Comprueba que siguen empezando con `@layer legacy {` y terminando en `}`.

- [ ] **Step 5: Capturar todo después de la poda**

Run: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase1`
Expected: código de salida `0` en las pantallas ya rediseñadas. Compara `tmp/visual/fase1` con `tmp/visual/antes`:
- **Fase 1 debe verse bien**: acceso (`/login`, `/activate-account`, `/forgot-password`), marco y menú de todas las pantallas, bandeja de trabajo y primitivas (botones, campos, insignias).
- Las pantallas que aún no tienen piel propia (Fase 3) pueden verse con colores mezclados; **no** es un fallo de esta fase, pero **no** deben desbordar. Si desbordan, corrige en `primitives.css` o en `surfaces.css` y repite.

Por cada problema visible: ajusta el CSS en `src/app/styles/`, vuelve a capturar y confirma. No avances con desbordes horizontales en las pantallas de la Fase 1.

- [ ] **Step 6: Verificar el brillo y la adaptabilidad en el navegador**

Abre `http://localhost:3100/login`, inicia sesión con `admin.arka@demo.invalid` / `ArkaAdmin.2026` (cuentas ficticias locales). Comprueba, con las herramientas del navegador:
1. A 1440 px: pasar el cursor sobre un botón, una tarjeta de indicador, una opción del menú y un elemento de la cola los ilumina.
2. A 390 px: el botón de menú abre y cierra el panel; el fondo oscuro lo cierra; `Esc` lo cierra; al elegir una opción navega y el panel se cierra.
3. En `/dashboard/admin`: los números de las tarjetas coinciden con la lista de pendientes y con el total de procesos.

- [ ] **Step 7: Detener la instancia**

Detén el servidor y comprueba el puerto 3100 libre (`Get-NetTCPConnection`). Ejecuta `git checkout -- next-env.d.ts`.

- [ ] **Step 8: Documentación de la fase**

1. `docs/decisions/055-sistema-visual-esmeralda.md`:

```markdown
# 055. Sistema visual Esmeralda

- **Fecha:** 2026-10-11
- **Estado:** Aceptada. Reemplaza la paleta de la decisión 043 (azul noche ARKA, azul eléctrico y dorado).

## Contexto

La interfaz acumulaba catorce capas de temas en `ui.css`, con reglas `!important` en conflicto, y no se adaptaba a tablet ni a celular. La persona responsable eligió el estilo Esmeralda entre diez prototipos.

## Decisión

- Paleta Esmeralda definida por variables CSS en `src/app/styles/tokens.css`, con una prueba de contraste WCAG AA (`tests/unit/theme-contrast.test.ts`). Las tarjetas de indicadores usan un degradado cuyos dos extremos cumplen 4,5:1 con su tinta; la tarjeta naranja usa texto oscuro.
- Tipografía Outfit mediante `next/font/google`, que la descarga durante el build y la sirve desde el propio dominio (sin solicitudes a Google en producción).
- El CSS anterior queda en una capa de cascada `@layer legacy`; los estilos nuevos, sin capa, ganan sin depender de la especificidad. `scripts/prune-legacy-css.mjs` elimina del CSS heredado las declaraciones `!important` de aspecto y los componentes reescritos.
- Por debajo de 900 px el menú lateral es un panel desplegable (`WorkspaceFrame`, componente cliente).
- Los indicadores de la bandeja se calculan con `listProcessesFor` (funciona con SQLite y Supabase), no con `getAdminControlCenter()`.
- Brillo al pasar el cursor en botones, tarjetas y opciones de menú, solo en dispositivos con puntero y sin desplazamiento con movimiento reducido.
- En los textos visibles "Arka" se cambia por "Lexcon" y se elimina "Arka Litigios IAG"; una prueba lo vigila (`tests/unit/visible-text-guard.test.ts`).

## Consecuencias

El build requiere salida a internet para descargar la fuente (o pasar a `next/font/local`). Las pantallas de la Fase 3 conservan reglas heredadas bajo la capa hasta que se les da piel propia. Las pantallas de Alertas, Auditoría y Accesos siguen leyendo SQLite por `getAdminControlCenter()` y deben corregirse aparte para Supabase.
```

2. `docs/architecture.md`: añadir una sección:

```markdown
## Capa de presentación

Los estilos viven en `src/app/styles/` (tokens, base, primitivas, menú, acceso, bandeja y superficies). `globals.css` y `ui.css` son CSS heredado y están dentro de `@layer legacy`: cualquier regla sin capa los supera. El espacio de trabajo se compone en `WorkspaceShell` (servidor), que entrega el contenido del menú y de la barra superior a `WorkspaceFrame` (cliente), el único que conoce si el menú desplegable está abierto. La bandeja del Administrador calcula sus indicadores con `src/modules/admin/inbox-summary.ts` sobre los procesos del usuario y los dibuja con componentes de servidor en SVG (`KpiCard`, `BarList`, `Donut`).
```

3. `docs/current-state.md`: añadir:

```markdown
La aplicación usa el sistema visual Esmeralda en el marco, el menú, las pantallas de acceso y la bandeja de trabajo del Administrador, con menú desplegable en tablet y celular y brillo al pasar el cursor. Los textos visibles dicen "Lexcon" donde antes decían "Arka" y ya no muestran "Arka Litigios IAG". Las demás pantallas se rediseñan en las fases siguientes.
```

4. `README.md`: añadir en la sección de uso una línea: `Para revisar el aspecto en distintos tamaños: node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/revision (requiere la app local de demostración en marcha y Chrome o Edge).`

- [ ] **Step 9: Comprobar todo**

Run: `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build && node scripts/sync-agent-guides.mjs --check`
Expected: todo en verde.

- [ ] **Step 10: Commit (solo con autorización explícita)**

```bash
git add scripts/visual-capture.mjs scripts/prune-legacy-css.mjs src/app/styles src/app/layout.tsx src/app/globals.css src/app/ui.css src/app/dashboard src/app/login src/app/api/admin/institutions/route.ts src/modules src/platform/auth/demo-credentials.ts tests README.md docs
git commit -m "feat: aplicar el sistema visual Esmeralda al marco, el acceso y la bandeja"
```

---

## FASE 2: Mi cuenta y Usuarios y accesos

### Task 10: Revisar Mi cuenta y Usuarios y accesos con el nuevo estilo

**Requisito:** el plan "Configuración inicial del administrador y Mi cuenta" ya está ejecutado (existen `/dashboard/account`, `/setup` y la corrección de correo). Si no, deja esta tarea para después.

**Files:**
- Modify: `src/app/styles/surfaces.css` (solo si hace falta)

- [ ] **Step 1: Instancia local temporal y capturas**

Run (en segundo plano): `corepack pnpm exec next dev -p 3100`, luego `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase2 --roles publico,admin,abogado,rector,apoyo`

En modo local de demostración, `/dashboard/account` muestra el aviso "Mi cuenta está disponible cuando LEXCON usa el acceso con Supabase" y `/dashboard/admin/users` no está disponible (requiere Supabase). Revisa el aviso y el marco; el resto de estas dos pantallas se verifica en el dominio (Tarea 16).

- [ ] **Step 2: Comprobar la maquetación de los formularios con datos de ejemplo**

Para ver los formularios reales sin Supabase, crea una página temporal **fuera del repositorio versionado** (por ejemplo en `tmp/`) o inspecciona con HTML estático generado a partir del mismo marcado. No dejes archivos temporales en `src/`.

Comprueba en 390, 820 y 1440 px: tarjetas `surface management-form` en una columna en móvil, botones de 44 px de alto, campos de 16 px, la fila de acciones de cada usuario se envuelve sin desbordar, y el formulario de "Corregir correo" ocupa todo el ancho de la fila (`.management-list li > form`).

- [ ] **Step 3: Ajustar si hace falta y detener la instancia**

Ajusta en `primitives.css` o `surfaces.css`, repite la captura y detén el servidor (`Get-NetTCPConnection -LocalPort 3100` sin salida; `git checkout -- next-env.d.ts`).

---

## FASE 3: Resto de las pantallas

La estrategia es **piel sin tocar el diseño de cuadrícula**: el CSS heredado conserva la disposición de cada pantalla (columnas, espacios) dentro de `@layer legacy`; `surfaces.css` solo cambia color, fondo, borde, sombra, radio y tipografía de esos componentes. Así no hace falta reescribir la maquetación de cada pantalla.

### Task 11: Piel de directorios y tarjetas

**Files:**
- Modify (completar): `src/app/styles/surfaces.css`

- [ ] **Step 1: Escribir la piel base y de directorios**

Reemplaza el contenido de `src/app/styles/surfaces.css` por:

```css
/* Piel de las pantallas de la Fase 3. No define disposición: solo aspecto. */

/* ===== Tarjetas de directorio y de lista ===== */
.institution-card, .attorney-card, .access-card, .process-card, .alert-card, .assigned-institution-card, .quotation-card, .command-card, .review-choice, .process-metrics > div {
  background: var(--surface-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  color: var(--ink);
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.2s ease, border-color 0.2s ease;
}
:is(.institution-card, .attorney-card, .access-card, .process-card, .alert-card, .assigned-institution-card, .quotation-card, .command-card, .review-choice) :is(h2, h3, strong) { color: var(--ink); }
:is(.institution-card, .attorney-card, .access-card, .process-card, .alert-card, .assigned-institution-card, .quotation-card) :is(small, p) { color: var(--ink-muted); }
.access-inactive { opacity: 0.7; }

/* Iconos y avatares de las tarjetas */
.institution-card-icon, .assigned-institution-icon, .attorney-process-icon, .access-card-avatar, .attorney-card-avatar, .document-mark, .metric-symbol {
  background: linear-gradient(145deg, var(--kpi-green-a), var(--kpi-blue-b));
  color: #fff;
  border: 0;
  box-shadow: none;
}

/* Estados dentro de tarjetas oscuras heredadas: usan las insignias nuevas */
.assigned-institution-card .status, .attorney-process-directory .status, .process-card .status { background: var(--info-soft); color: var(--info); border: 0; }
.institution-card-status { color: var(--ink-muted); }

/* ===== Encabezados de directorio y secciones ===== */
.directory-heading { border-bottom: 1px solid var(--line); }
.directory-heading :is(h2, h3) { color: var(--ink); }
.directory-heading p { color: var(--ink-muted); }

/* ===== Métricas de proceso ===== */
.process-metrics > div { background: linear-gradient(145deg, var(--kpi-blue-a), var(--kpi-blue-b)); color: var(--kpi-blue-ink); border: 0; }
.process-metrics > div:nth-child(2) { background: linear-gradient(145deg, var(--kpi-amber-a), var(--kpi-amber-b)); color: var(--kpi-amber-ink); }
.process-metrics > div:nth-child(3) { background: linear-gradient(145deg, var(--kpi-green-a), var(--kpi-green-b)); color: var(--kpi-green-ink); }
.process-metrics > div:nth-child(4) { background: linear-gradient(145deg, var(--kpi-rose-a), var(--kpi-rose-b)); color: var(--kpi-rose-ink); }
.process-metrics strong, .process-metrics small { color: inherit; }
.integrity-metric { background: linear-gradient(145deg, var(--kpi-green-a), var(--kpi-green-b)); color: var(--kpi-green-ink); border: 0; }
.integrity-metric strong, .integrity-metric small { color: inherit; }

/* ===== Botones secundarios en directorios ===== */
.card-actions { display: flex; flex-wrap: wrap; gap: 8px; }
```

- [ ] **Step 2: Verificar visualmente**

Arranca la instancia local temporal (`corepack pnpm exec next dev -p 3100`) y captura `admin`, `abogado`, `rector` y `apoyo`: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase3a`.

Revisa estas pantallas a 390, 820 y 1440 px: Procesos por IE, listado de procesos de una IE, Instituciones Educativas, Equipo jurídico, Asignar responsable jurídico, Alertas y bloqueos, panel del abogado y panel institucional. Criterios: texto legible sobre su fondo (sin texto claro sobre fondo claro ni lo contrario), tarjetas con el mismo aspecto entre pantallas, sin desborde horizontal (código de salida `0`).

- [ ] **Step 3: Corregir lo que se vea mal**

Por cada problema, busca la clase en la captura o con las herramientas del navegador y añade o ajusta la regla en `surfaces.css`. Si una regla heredada de `@layer legacy` sigue ganando porque usa `!important`, ejecuta de nuevo `node scripts/prune-legacy-css.mjs --file src/app/ui.css --quitar-important --conservar-important '^\.evaluation-member-row' --conservar-media 'prefers-reduced-motion'` y revisa la simulación antes de `--write`.

---

### Task 12: Piel del detalle de proceso y de la trazabilidad

**Files:**
- Modify: `src/app/styles/surfaces.css` (añadir al final)

- [ ] **Step 1: Añadir la piel del detalle**

Añade al final de `src/app/styles/surfaces.css`:

```css
/* ===== Detalle de proceso ===== */
.process-detail, .process-identity { color: var(--ink); }
.process-identity { display: grid; gap: 4px; }
.detail-grid { gap: 16px; }
.detail-list { margin: 0; display: grid; gap: 12px; }
.detail-list > div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 11px; border-bottom: 1px dashed var(--line); }
.detail-list > div:last-child { border-bottom: 0; padding-bottom: 0; }
.detail-list dt { color: var(--ink-muted); }
.detail-list dd { margin: 0; font-weight: 600; text-align: right; }
.detail-count { color: var(--ink-muted); font-size: 0.82rem; }
.detail-back, .page-back-link { display: inline-flex; align-items: center; min-height: var(--touch); color: var(--accent); font-weight: 600; text-decoration: none; }
.heading-with-status { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.detail-status { background: var(--info-soft); color: var(--info); border-radius: 999px; padding: 0.3rem 0.8rem; font-weight: 700; font-size: 0.78rem; }

/* ===== Documentos y trazabilidad ===== */
.document-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.document-list > li, .document-list > div { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--line); border-radius: var(--radius-md); background: #fff; }
.document-list strong { overflow-wrap: anywhere; }
.document-list small { color: var(--ink-muted); }
.document-status { color: var(--ink-muted); font-size: 0.82rem; }
.document-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.audit-timeline, .workflow-history { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; border-left: 3px solid var(--line-strong); padding-left: 16px; }
.audit-timeline li, .workflow-history li { position: relative; }
.audit-timeline li::before, .workflow-history li::before { content: ''; position: absolute; left: -23px; top: 0.45rem; width: 11px; height: 11px; border-radius: 50%; background: var(--accent); border: 2px solid var(--surface-card); }
.workflow-action { display: grid; gap: 10px; padding: 14px; border-radius: var(--radius-md); background: var(--accent-soft); border: 1px solid var(--line); }
.approval-next-step { background: var(--accent-soft); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px; }
.approval-next-step-status { font-weight: 700; color: var(--accent); }

@media (max-width: 600px) {
  .document-list > li, .document-list > div { grid-template-columns: 40px minmax(0, 1fr); }
  .document-list .document-actions { grid-column: 2; }
  .detail-list > div { flex-direction: column; gap: 2px; }
  .detail-list dd { text-align: left; }
}
```

- [ ] **Step 2: Verificar visualmente**

Con la instancia local temporal: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase3b --roles admin,abogado,rector`. Revisa el detalle de un proceso (descubierto automáticamente) a 390, 820 y 1440 px: encabezado con estado, bloques de intervinientes y estado, documentos, trazabilidad y acciones de flujo. Sin desborde horizontal; los nombres de archivo largos se parten dentro de su tarjeta (`overflow-wrap`).

- [ ] **Step 3: Corregir** lo que se vea mal, como en la Tarea 11, paso 3.

---

### Task 13: Piel de formularios largos, estudio de mercado y evaluación

**Files:**
- Modify: `src/app/styles/surfaces.css` (añadir al final)

El documento del estudio de mercado (`.market-study-document`, `.market-study-document-header`, `.market-study-signature`, `.document-print-button`) es una hoja de lectura jurídica y **se conserva clara** (decisión de lectura documental); solo se tematizan sus envolturas y formularios.

- [ ] **Step 1: Añadir la piel de formularios y revisión**

Añade al final de `src/app/styles/surfaces.css`:

```css
/* ===== Estudio de mercado, evaluación, cotizaciones y reglamentos ===== */
.market-study-review, .market-review-intro, .market-review-form, .market-study-data-form, .quote-add-form, .upload-form, .upload-surface, .regulation-workspace, .regulation-upload, .assignment-surface, .assignment-form, .evaluation-member-row {
  color: var(--ink);
}
.market-review-intro, .selected-regulation, .selected-files, .selected { background: var(--accent-soft); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 16px; }
.market-review-form, .market-study-data-form, .quote-add-form, .upload-form, .regulation-upload, .assignment-form { display: grid; gap: 14px; }
.review-choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.review-choice { padding: 14px 16px; cursor: pointer; }
.review-choice:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
.market-matrix, .classification-matrix, .source-summary-table { display: block; max-width: 100%; overflow-x: auto; }
.not-compared { color: var(--ink-muted); font-style: italic; }
.market-source-list, .market-document-data, .market-study-summary { color: var(--ink); }
.quotation-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.regulation-status { font-weight: 700; color: var(--accent); }
.iag-drafts { background: var(--accent-soft); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: clamp(16px, 2vw, 24px); }
.tax-field { color: var(--ink); }
.evaluation-member-row { display: grid; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.good { color: var(--good); }
.attention { color: var(--warn); }
.text-danger { color: var(--danger); }

@media (max-width: 600px) {
  .review-choice-grid, .quotation-card-grid { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 2: Verificar visualmente**

Con la instancia local temporal: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase3c --roles admin,abogado,rector,apoyo`. Revisa el detalle de proceso en etapas con formularios (estudio de mercado, evaluación, reglamentos de la IE, carga de cotizaciones) a 390, 820 y 1440 px. Criterios: campos de 44 px, tablas con desplazamiento horizontal **dentro** de su contenedor, el documento del estudio de mercado sigue legible sobre fondo claro, sin desborde de la página.

- [ ] **Step 3: Corregir** lo que se vea mal, como en la Tarea 11, paso 3.

---

### Task 14: Pantallas del Rector, Apoyo IE, Comité y reglamentos

**Files:**
- Modify: `src/app/styles/surfaces.css` (solo si hace falta)

- [ ] **Step 1: Capturar y revisar**

Con la instancia local temporal: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/fase3d --roles rector,apoyo`. Revisa `/dashboard/institution` (procesos, avisos `institution-notifications`, `institution-process-directory`, "Nuevo proceso") y `/dashboard/regulations` a 390, 820 y 1440 px. La cuenta del comité no tiene inicio de sesión en la demostración: revisa `/dashboard/committee` solo con HTML de muestra si se necesita, sin crear usuarios.

- [ ] **Step 2: Añadir la piel que falte**

Si `.institution-notifications`, `.institution-directory`, `.institution-detail`, `.attorney-notifications` u otros bloques se ven mal, añade al final de `surfaces.css`:

```css
.institution-notifications, .attorney-notifications { background: var(--accent-soft); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px 18px; color: var(--ink); }
.institution-notifications .section-kicker, .attorney-notifications .section-kicker { color: var(--accent); }
.institution-directory, .institution-detail, .attorney-directory, .attorney-workspace, .admin-institution-processes { color: var(--ink); min-width: 0; }
```

y ajusta otras clases con el mismo método (captura, regla, captura). Cierra la fase deteniendo la instancia (`Get-NetTCPConnection -LocalPort 3100` sin salida; `git checkout -- next-env.d.ts`).

- [ ] **Step 3: Comprobar y commit**

Run: `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build && node scripts/sync-agent-guides.mjs --check`
Expected: todo en verde.

Actualiza `docs/current-state.md` añadiendo: `Todas las pantallas usan el sistema visual Esmeralda; las pantallas de documentos conservan la hoja clara de lectura jurídica.` y confirma con autorización explícita:

```bash
git add src/app/styles docs
git commit -m "feat: extender el sistema visual Esmeralda a las demás pantallas"
```

---

## CIERRE

### Task 15: Limpieza del CSS heredado

**Files:**
- Modify: `src/app/ui.css`, `src/app/globals.css`

- [ ] **Step 1: Medir cuánto del CSS heredado queda sin uso**

Con la instancia local temporal y las capturas de todas las fases ya revisadas, lista los selectores de `ui.css` que ninguna pantalla usa: ejecuta en el navegador (consola) sobre cada pantalla principal un recorrido de `document.styleSheets` marcando las reglas que no coinciden con ningún elemento, o usa la herramienta de cobertura de CSS del navegador. Anota las capas completas sin ninguna coincidencia (por ejemplo, las de "Consola tecnológica IAG" y "Identidad ARKA Litigios").

- [ ] **Step 2: Eliminar las capas muertas**

Elimina de `ui.css` solo los bloques que la cobertura confirma sin uso y vuelve a capturar todo: `node scripts/visual-capture.mjs --base http://localhost:3100 --out tmp/visual/final`. El resultado debe ser **idéntico** al de la fase anterior (compara las capturas). Si algo cambia, restaura el bloque. Es una tarea opcional y conservadora: si la cobertura no es concluyente, deja el CSS heredado como está dentro de su capa.

- [ ] **Step 3: Detener la instancia y confirmar**

Detén el servidor, `git checkout -- next-env.d.ts`, `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build`, y confirma con autorización explícita: `git commit -m "refactor: eliminar CSS heredado sin uso"`.

---

### Task 16: Verificación en el dominio

Esta tarea la hace la persona responsable junto con quien implementa, **después del despliegue**.

- [ ] **Step 1: Desplegar y comprobar la fuente**

Despliega en Dokploy. Abre `https://lexcon.arkaiag.com/login` y, en las herramientas del navegador (red), comprueba que **no** hay solicitudes a `fonts.googleapis.com` ni `fonts.gstatic.com` y que la fuente Outfit llega desde el propio dominio.

- [ ] **Step 2: Recorrido en cuatro dispositivos**

En el portátil (≥1280 px), una tablet (~820 px) y un celular (~390 px), con una cuenta real de cada rol: iniciar sesión, bandeja de trabajo o panel del rol, un proceso, Mi cuenta, y Usuarios y accesos (Administrador). Confirmar: sin desplazamiento horizontal, menú desplegable en tablet y celular, botones y campos cómodos con el dedo, brillo al pasar el cursor en el portátil.

- [ ] **Step 3: Datos de la bandeja**

Con datos reales, comprobar que las tarjetas de la bandeja coinciden con la lista de pendientes y con el total de procesos (esto confirma el cálculo con Supabase). Anotar para un cambio aparte que Alertas, Auditoría y Accesos siguen leyendo SQLite.

- [ ] **Step 4: Textos**

Recorrer las pantallas y confirmar que no aparece "Arka Litigios IAG" y que los textos dicen "Lexcon" donde antes decían "Arka".

- [ ] **Step 5: Cerrar**

Si todo está bien, actualizar `docs/current-state.md` con la fecha de verificación y confirmar con autorización explícita.

---

## Autorrevisión del plan contra la especificación

- **Paleta, variables, contraste AA y tarjeta naranja con texto oscuro:** Tarea 2 (tokens y prueba de contraste), Tarea 7 (tarjetas).
- **Outfit autoalojada con `next/font`:** Tarea 2, paso 7 y decisión 055; verificación en Tarea 16.
- **Limpieza de capas de tema y `!important`:** Tareas 2 (capa), 3 (script) y 9 (aplicación); Tarea 15 (limpieza opcional).
- **Menú desplegable por debajo de 900 px y barra superior:** Tarea 5.
- **Componentes de servidor de indicadores sin librería (`KpiCard`, `BarList`, `Donut`):** Tarea 7.
- **Textos "Arka Litigios IAG" eliminados y "Arka"→"Lexcon":** Tarea 8 (tabla completa y guarda).
- **Bandeja con datos reales, sin gráfico semanal:** Tarea 7; hallazgo sobre `getAdminControlCenter()` documentado al inicio.
- **Cortes 1180/900/600 px, 44 px táctiles, 16 px en campos, sin desborde:** Tareas 4, 5, 6, 7 y verificación con `scripts/visual-capture.mjs`.
- **Brillo al pasar el cursor, solo con puntero y con movimiento reducido respetado:** Tarea 4.
- **Fases (base, Mi cuenta y Usuarios, resto de pantallas):** Fases 1, 2 y 3.
- **Pruebas (contraste, poda, indicadores, guarda de textos, capturas a 390/820/1280/1440):** Tareas 2, 3, 7, 8 y 9.
- **Documentación (055, architecture, current-state, README):** Tarea 9, paso 8, y Tarea 14.
- **Fuera de alcance respetado:** sin gráfico semanal, sin modo claro/oscuro seleccionable, sin cambios de roles ni de datos.
