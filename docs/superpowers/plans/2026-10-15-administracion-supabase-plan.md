# Administración sobre Supabase: plan de implementación

> **Para agentes:** SUB-HABILIDAD REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que nadie vea un error de servidor por una función que aún depende de SQLite (Parte 0) y que la Administración (Instituciones Educativas, Equipo jurídico, Asignar responsable jurídico, Alertas y bloqueos y Registro de actuaciones) funcione con Supabase (subproyecto A), sin romper la demostración local con SQLite.

**Arquitectura:** una tabla central (`src/platform/features.ts`) declara qué funciones están disponibles con Supabase; páginas, rutas de API y menú la consultan. Cada módulo de Administración sigue el patrón de `/setup` y Mi cuenta: servicio puro con las reglas y la capacidad (`ACCESS_MANAGE`), un puerto, un adaptador Supabase delgado (clave de servicio solo en el servidor), un adaptador SQLite para la demostración y un `*-runtime.ts` que elige con `supabaseConfigurado()`. Las escrituras de Instituciones Educativas son atómicas en una función SQL (`guardar_institucion`) que también registra la auditoría (`registrar_evento_administrativo`).

**Tecnologías:** Next.js 16.3 (App Router), React 19, TypeScript estricto, Vitest 3 (entorno node), `@supabase/supabase-js` 2.117, PostgreSQL de Supabase (plpgsql), SQLite (`better-sqlite3`) solo en modo local, CSS propio en `src/app/styles/`.

**Diseño aprobado:** `docs/superpowers/specs/2026-10-15-administracion-supabase-design.md`.

---

## Contexto del repositorio

Léalo completo antes de cualquier tarea: cada tarea asume estas convenciones.

### Entorno y comandos

- Raíz: `C:\CODEX - CURSO Y APLICACIONES CREADAS\LEXCON-IAG-NUEVO`, rama `feat/acceso-admin-y-estilo-esmeralda`, Git Bash en Windows. Use rutas absolutas o entre comillas (la ruta tiene espacios).
- Paquetes con `corepack pnpm ...`. Comprobaciones:
  - una prueba: `corepack pnpm exec vitest run tests/unit/<archivo>.test.ts`
  - todas: `corepack pnpm exec vitest run`
  - tipos: `corepack pnpm typecheck` (`tsc --noEmit`; incluye `tests/**/*.ts` y `.next/types`)
  - compilación: `corepack pnpm build` (descarga la fuente Outfit: requiere red)
  - guías: `node scripts/sync-agent-guides.mjs --check`
- Las pruebas deben ejecutarse **sin** `LEXCON_SUPABASE_URL` ni `LEXCON_SUPABASE_SERVICE_ROLE_KEY` en el entorno de la terminal (Vitest no carga `.env.local`). Así `supabaseConfigurado()` real devuelve `false` salvo que la prueba lo simule.
- No inicie servidores (`pnpm dev`, `pnpm start`) salvo que la persona responsable lo pida; no se conecte a Supabase desde las tareas 1 a 15.
- Edite con las herramientas Edit/Write, no con heredocs ni `sed` (hay barras invertidas, comillas y corchetes en el código).
- Si tras eliminar una ruta `tsc` informa errores dentro de `.next/types` o `.next/dev/types` sobre archivos que ya no existen, ejecute `corepack pnpm build` (regenera esos tipos) y repita `corepack pnpm typecheck`. No borre `.next` a mano.

### Next.js de este repositorio

Es Next.js 16.3 con cambios incompatibles respecto de versiones anteriores. Antes de escribir una página o un Route Handler lea:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (`params` y `searchParams` son **promesas**: `await`),
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (un `route.ts` solo puede exportar manejadores HTTP y configuración como `dynamic`; las funciones auxiliares no se exportan),
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` (`redirect` de `next/navigation` lanza y no devuelve).

### Estructura

- `src/app/`: páginas (`page.tsx`, componentes de servidor) y rutas HTTP (`route.ts`). Los componentes cliente llevan `'use client'` y solo importan **tipos** (`import type`) desde `src/modules/`.
- `src/modules/`: dominio. `src/modules/access/` contiene los ejemplos a imitar: `setup-administrator.ts` + `setup-administrator-supabase.ts`, `account-service.ts` + `account-port-supabase.ts`, `email-correction.ts`.
- `src/platform/`: infraestructura (`supabase/server.ts`, `auth/current-user.ts`, `database/client.ts`).
- `tests/unit/` y `tests/integration/`: Vitest solo ejecuta `tests/**/*.test.ts` (no hay pruebas `.tsx`, pero una prueba `.ts` puede importar un módulo `.tsx`: Vite compila JSX con `jsx: react-jsx` del `tsconfig.json`).
- `supabase/migrations/`: migraciones PostgreSQL con marca de tiempo; la última aplicada en el repositorio es `20261012201458_sincronizar_correo_y_auditar_acceso.sql`.
- Nombres: archivos en inglés con guiones como los existentes (`account-service.ts`); identificadores nuevos de dominio en español (`crearPuertoInstitucionesSupabase`, `ErrorInstitucion`). No renombre identificadores existentes.

### SQLite o Supabase

- `supabaseConfigurado()` (`src/platform/supabase/server.ts`) es `true` cuando existen `LEXCON_SUPABASE_URL` y `LEXCON_SUPABASE_SERVICE_ROLE_KEY`; **lanza** si la configuración está incompleta o no es HTTPS. Elige la fuente de datos de negocio.
- `supabasePublicoConfigurado()` (`src/platform/supabase/public.ts`) elige la sesión (Supabase Auth o cookie local). `currentUser()` devuelve `CurrentUser = { id, name, role, institutionId, institutionName }`.
- `crearClienteSupabaseServidor()` crea el cliente con clave de servicio (salta RLS): **solo después** de autorizar en la aplicación.
- Modo local (demostración, pruebas de integración): SQLite con `getSqlite()`. Debe seguir funcionando igual. En producción (Dokploy) no existe base SQLite: cualquier `getSqlite()` falla.
- Roles de aplicación: `ARKA_ADMIN`, `ARKA_ATTORNEY`, `IE_RECTOR`, `IE_SUPPORT`, `IE_COMMITTEE` (`src/modules/access/authorization.ts`). Capacidades: `hasCapability(contexto, 'ACCESS_MANAGE')` (solo `ARKA_ADMIN`), `'ATTORNEY_ASSIGN'` (solo `ARKA_ADMIN`). Códigos en la base: `ADMINISTRADOR_ARKA`, `ABOGADO_ARKA`, `RECTOR_IE`, `APOYO_IE`, `COMITE_EVALUADOR` (identificadores: no se cambian).

### Esquema de Supabase usado (columnas exactas)

- `instituciones_educativas`: `id`, `nombre`, `nit` (único, opcional), `codigo_dane` (único, opcional), `ciudad` (NOT NULL), `departamento` (NOT NULL), `estado_servicio` (`ACTIVO` | `SUSPENDIDO` | `FINALIZADO`), `observacion_servicio`, `activo`, `creado_en`, `actualizado_en` (lo mantiene el disparador `instituciones_educativas_actualizado`). Restricciones únicas con nombre por defecto: `instituciones_educativas_nit_key`, `instituciones_educativas_codigo_dane_key`.
- `periodos_servicio_ie`: `id`, `id_institucion`, `inicia_en` (date), `finaliza_en` (date, `>= inicia_en`), `estado`, `motivo`, `registrado_por`, `creado_en`.
- `asignaciones_roles_usuario`: `id`, `id_usuario`, `id_rol`, `id_institucion` (nula para Administrador y Abogado), `activa`, `asignado_por`, `asignado_en`, `retirado_en`. `roles`: `id`, `codigo`, `activo`. `perfiles_usuario`: `id_usuario`, `nombre_mostrado`, `correo_electronico`, `activo`.
- `procesos_contratacion`: `id`, `id_institucion`, `consecutivo_institucional`, `fase_actual` (p. ej. `MERCADO`), `estado_actual`, `abierto_en`, `objeto_contractual`.
- `responsables_proceso`: `id_proceso`, `id_usuario`, `tipo_responsabilidad` (`ABOGADO`, ...), `activo`, `asignado_por`, `asignado_en`, `retirado_en`; índice único de un `ABOGADO` activo por proceso.
- `bloqueos_proceso`: `id`, `id_proceso`, `alcance` (p. ej. `MERCADO`), `motivo`, `gravedad`, `activo`, `creado_en`.
- `eventos_auditoria`: `id_institucion`, `id_proceso`, `id_actor`, `accion`, `tipo_entidad`, `id_entidad` (**uuid NOT NULL**), `datos_antes`, `datos_despues`, `creado_en`, `hash_anterior`, `hash_evento` (lo calcula el disparador `eventos_auditoria_encadenados`; nunca lo envía la aplicación). Es inmutable.
- `public.asignar_abogado_proceso(p_id_proceso, p_id_abogado, p_id_actor)` ya existe: valida Administrador y Abogado activos, retira al abogado anterior, inserta el nuevo y audita `ABOGADO_ASIGNADO`. Lanza `'Actor no autorizado'`, `'Abogado no válido'` o `'Proceso no válido'`.
- Estilo de funciones SQL: `security definer`, `set search_path = pg_catalog, public`, `revoke all ... from public, anon, authenticated` y `grant execute ... to service_role` únicamente.

### Patrón de pruebas

- Simulaciones con `vi.hoisted` + `vi.mock('@/platform/...')`. Vitest identifica el módulo por su archivo resuelto, así que `vi.mock('@/platform/supabase/server', ...)` también sustituye un `import ... from '../../platform/supabase/server'`.
- Cuando el código anterior a la implementación podría tocar SQLite, la prueba simula `@/platform/database/client` con un `getSqlite` que lanza: una prueba que falla nunca debe escribir en `data/lexcon.sqlite`.
- Las rutas se prueban importando sus manejadores y llamándolos con `new Request(...)` (ver `tests/unit/account-route.test.ts`). No use `vi.resetModules()` salvo que la ruta tenga estado de módulo: rompería `instanceof` entre la clase de error de la prueba y la de la ruta.
- Los adaptadores Supabase se prueban con el cliente simulado `tests/unit/helpers/supabase-falso.ts` (se crea en la Tarea 6): registra cada consulta encadenada y devuelve lo configurado por tabla o por RPC.
- Las migraciones se prueban como contrato leyendo el SQL con expresiones regulares (`tests/unit/migracion-correo-auditoria.test.ts`).
- Las pruebas de integración SQLite crean una base temporal con `mkdtempSync`, `LEXCON_DATABASE_URL` y `migrate()` (ver `tests/integration/access-by-role.test.ts`).

### Textos, interfaz y privacidad

- Todo texto visible en español y con la marca **Lexcon** (nunca «Arka» visible). `tests/unit/visible-text-guard.test.ts` prohíbe, entre otras, «Arka Litigios», «Administrador Arka», «abogado Arka», «Equipo jurídico Arka».
- Interfaz con las clases existentes (`page-stack`, `page-heading app-page-heading`, `section-kicker`, `surface`, `empty-state`, `management-layout`, `management-form`, `management-buttons`, `primary-button`, `secondary-button`, `attorney-directory`, `attorney-card`, `card-actions`...). Las primitivas ya garantizan campos de 16 px y controles de 44 px; no agregue CSS ni estilos en línea.
- Diagnóstico de servidor: `console.error('[etiqueta] texto fijo', código)`; nunca correos, nombres, cuerpos de solicitud ni el mensaje del proveedor. Mensajes al usuario genéricos y en español.

### Reglas del proyecto (obligatorias)

- Nunca `git add`, `git commit` ni `git push` sin autorización explícita de la persona responsable para esa operación. El plan agrupa los cambios en seis confirmaciones (una por grupo); el paso de confirmación de cada grupo dice «solo con autorización explícita».
- El hook de pre-commit exige documentación preparada junto a cualquier cambio de `src/`, `tests/` o `scripts/`: por eso cada grupo actualiza `docs/current-state.md`.
- No confirme secretos, datos personales, `data/`, `storage/`, `tmp/`, `.env*`, dependencias ni artefactos generados.
- `AGENTS.md` y `CLAUDE.md` deben quedar idénticos: este plan no los modifica.
- No aplique migraciones ni toque datos de producción: eso solo ocurre en la Tarea 16, con la persona responsable presente y su confirmación expresa.

### Mapa de tareas y confirmaciones

| Grupo (confirmación) | Tareas | Resultado |
| --- | --- | --- |
| 1. Parte 0 | 1, 2, 3, 4 | Tabla de funciones, página «no disponible», 501 en API, menú filtrado y prueba de coherencia. |
| 2. A1 | 5, 6, 7, 8 | Migración SQL, Instituciones Educativas sobre Supabase. |
| 3. A2 | 9, 10 | Equipo jurídico de solo lectura; abogados y accesos unificados en Usuarios y accesos. |
| 4. A3 | 11 | Asignar responsable jurídico con consulta propia y diagnóstico. |
| 5. A4 | 12, 13 | Alertas y bloqueos y Registro de actuaciones sobre Supabase. |
| 6. Documentación | 14, 15 | Decisión 056, arquitectura, estado, README y verificación completa. |
| (sin confirmación) | 16 | Verificación en el dominio con la persona responsable. |

---

## Grupo 1 · Parte 0: funciones no disponibles

### Task 1: Tabla de funciones y `funcionDisponible`

**Archivos**
- Crear: `src/platform/features.ts`
- Probar: `tests/unit/features.test.ts`

- [ ] **Paso 1: escribir la prueba que falla**

Crear `tests/unit/features.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { claveDeRutaMenu, FUNCIONES, funcionDisponible, rutaMenuDisponible, type ClaveFuncion } from '../../src/platform/features';

const CLAVES = Object.keys(FUNCIONES) as ClaveFuncion[];

describe('funciones disponibles con Supabase', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('en modo local (SQLite) todas las funciones están disponibles', () => {
    mocks.configurado.mockReturnValue(false);
    for (const clave of CLAVES) expect(funcionDisponible(clave)).toBe(true);
  });

  it('con Supabase cada función responde lo declarado en la tabla', () => {
    mocks.configurado.mockReturnValue(true);
    for (const clave of CLAVES) expect(funcionDisponible(clave)).toBe(FUNCIONES[clave].disponibleConSupabase);
  });

  it('las funciones de los subproyectos B y C siguen no disponibles con Supabase', () => {
    mocks.configurado.mockReturnValue(true);
    const pendientes = ['REGLAMENTOS', 'COTIZACIONES', 'ESTUDIO_MERCADO', 'COMITE_EVALUACION', 'FLUJO_TRANSICIONES', 'DOCUMENTOS_GENERADOS', 'NOTIFICACIONES_PUSH'] as const;
    for (const clave of pendientes) expect(funcionDisponible(clave)).toBe(false);
  });

  it('una configuración de Supabase incompleta cuenta como modo Supabase (nunca se cae a SQLite)', () => {
    mocks.configurado.mockImplementation(() => { throw new Error('La configuración de Supabase está incompleta.'); });
    expect(funcionDisponible('REGLAMENTOS')).toBe(false);
  });

  it('relaciona las opciones del menú con su función sin tener en cuenta la consulta ni el ancla', () => {
    expect(claveDeRutaMenu('/dashboard/regulations')).toBe('REGLAMENTOS');
    expect(claveDeRutaMenu('/dashboard/regulations#manual')).toBe('REGLAMENTOS');
    expect(claveDeRutaMenu('/dashboard/admin/users?rol=ABOGADO_ARKA')).toBeNull();
    expect(claveDeRutaMenu('/dashboard/institution#opening')).toBeNull();
  });

  it('solo oculta del menú lo que no está disponible', () => {
    mocks.configurado.mockReturnValue(true);
    expect(rutaMenuDisponible('/dashboard/regulations')).toBe(false);
    expect(rutaMenuDisponible('/dashboard/admin')).toBe(true);
    mocks.configurado.mockReturnValue(false);
    expect(rutaMenuDisponible('/dashboard/regulations')).toBe(true);
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/features.test.ts`
Esperado: FALLA con «Failed to resolve import "../../src/platform/features"» (el módulo no existe).

- [ ] **Paso 3: implementar**

Crear `src/platform/features.ts`:

```ts
import { supabaseConfigurado } from '@/platform/supabase/server';

/** Mensaje uniforme de las pantallas y rutas que todavía dependen de SQLite. */
export const MENSAJE_NO_DISPONIBLE = 'Esta función estará disponible próximamente.';

export type ClaveFuncion =
  | 'INSTITUCIONES'
  | 'EQUIPO_JURIDICO'
  | 'ACCESOS'
  | 'ASIGNACION_JURIDICA'
  | 'ALERTAS_BLOQUEOS'
  | 'REGISTRO_ACTUACIONES'
  | 'REGLAMENTOS'
  | 'COTIZACIONES'
  | 'ESTUDIO_MERCADO'
  | 'COMITE_EVALUACION'
  | 'FLUJO_TRANSICIONES'
  | 'DOCUMENTOS_GENERADOS'
  | 'NOTIFICACIONES_PUSH';

export interface Funcion {
  /** Nombre visible de la función (título de la pantalla «no disponible»). */
  etiqueta: string;
  /** Subproyecto de la migración que la habilita: A (Administración), B (expediente) o C (flujo, avisos y worker). */
  subproyecto: 'A' | 'B' | 'C';
  /** true solo cuando todo lo que la función usa tiene rama Supabase. */
  disponibleConSupabase: boolean;
  /** Archivos page.tsx, relativos a src/. */
  paginas: readonly string[];
  /** Archivos route.ts, relativos a src/. */
  api: readonly string[];
  /** href de las opciones del menú lateral que llevan a la función. */
  menu: readonly string[];
  /** Módulos de src/ que hacen el trabajo. */
  modulos: readonly string[];
}

/**
 * Funciones de LEXCON que nacieron sobre SQLite: es la lista de trabajo de la migración a Supabase.
 * Una función se marca como disponible cuando todo lo que usa tiene rama Supabase;
 * tests/unit/funciones-coherencia.test.ts comprueba que la tabla y el código coincidan.
 */
export const FUNCIONES: Readonly<Record<ClaveFuncion, Funcion>> = {
  INSTITUCIONES: {
    etiqueta: 'Instituciones Educativas',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/institutions/page.tsx', 'app/dashboard/admin/institutions/new/page.tsx', 'app/dashboard/admin/institutions/[institutionId]/page.tsx'],
    api: ['app/api/admin/institutions/route.ts'],
    menu: ['/dashboard/admin/institutions', '/dashboard/admin/institutions/new'],
    modulos: ['modules/admin/service-administration.ts'],
  },
  EQUIPO_JURIDICO: {
    etiqueta: 'Equipo jurídico',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/lawyers/page.tsx', 'app/dashboard/admin/lawyers/new/page.tsx'],
    api: ['app/api/admin/attorneys/route.ts'],
    menu: ['/dashboard/admin/lawyers', '/dashboard/admin/lawyers/new'],
    modulos: ['modules/admin/service-administration.ts'],
  },
  ACCESOS: {
    etiqueta: 'Accesos y roles',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/accesses/page.tsx'],
    api: ['app/api/admin/accesses/route.ts'],
    menu: [],
    modulos: ['modules/admin/access-management.ts', 'modules/admin/control-center.ts'],
  },
  ASIGNACION_JURIDICA: {
    etiqueta: 'Asignar responsable jurídico',
    subproyecto: 'A',
    // Tiene rama Supabase, pero falla en producción (diseño del 2026-10-15): se habilita al corregirla en A3.
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/assignments/page.tsx'],
    api: ['app/api/admin/attorney-assignments/route.ts'],
    menu: ['/dashboard/admin/assignments'],
    modulos: ['modules/assignments/attorney-assignment.ts', 'modules/processes/process-queries.ts'],
  },
  ALERTAS_BLOQUEOS: {
    etiqueta: 'Alertas y bloqueos',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/alerts/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/alerts'],
    modulos: ['modules/admin/control-center.ts'],
  },
  REGISTRO_ACTUACIONES: {
    etiqueta: 'Registro de actuaciones',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/audit/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/audit'],
    modulos: ['modules/admin/control-center.ts'],
  },
  REGLAMENTOS: {
    etiqueta: 'Manual de contratación IE',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/regulations/page.tsx'],
    api: ['app/api/regulations/route.ts'],
    menu: ['/dashboard/regulations'],
    modulos: ['modules/regulations/institution-regulation.ts'],
  },
  COTIZACIONES: {
    etiqueta: 'Gestión de cotizaciones',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/quotations/route.ts'],
    menu: [],
    modulos: ['modules/processes/market-quote-management.ts', 'modules/automation/iag-drafts.ts'],
  },
  ESTUDIO_MERCADO: {
    etiqueta: 'Estudio de mercado',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/market-study-profile/route.ts', 'app/api/processes/[processId]/market-study-document/route.ts'],
    menu: [],
    modulos: ['modules/processes/market-study-profile.ts', 'modules/automation/market-study-docx.ts'],
  },
  COMITE_EVALUACION: {
    etiqueta: 'Comité evaluador y evaluación',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/evaluation-team/route.ts', 'app/api/processes/[processId]/evaluation-act/route.ts'],
    menu: [],
    modulos: ['modules/processes/evaluation-team.ts', 'modules/automation/evaluation-act-docx.ts'],
  },
  FLUJO_TRANSICIONES: {
    etiqueta: 'Actuaciones del flujo contractual',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/workflow/route.ts'],
    menu: [],
    modulos: ['modules/processes/workflow.ts'],
  },
  DOCUMENTOS_GENERADOS: {
    etiqueta: 'Documentos generados por IAG',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/precontractual-documents/[draftKind]/route.ts', 'app/api/processes/[processId]/generated-document/[kind]/route.ts', 'app/api/processes/[processId]/closure-declaration/route.ts'],
    menu: [],
    modulos: ['modules/automation/iag-drafts.ts', 'modules/automation/precontractual-context.ts', 'modules/automation/selection-and-contractual-docx.ts', 'modules/automation/closure-declaration-docx.ts'],
  },
  NOTIFICACIONES_PUSH: {
    etiqueta: 'Alertas al dispositivo',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/notifications/push-subscription/route.ts'],
    menu: [],
    modulos: ['modules/notifications/process-notifications.ts'],
  },
};

/** Una configuración incompleta lanza: se trata como modo Supabase para no caer nunca en SQLite. */
function modoSupabase(): boolean {
  try {
    return supabaseConfigurado();
  } catch {
    return true;
  }
}

/** En modo local todo está disponible; con Supabase, lo declarado en la tabla. */
export function funcionDisponible(clave: ClaveFuncion): boolean {
  if (!modoSupabase()) return true;
  return FUNCIONES[clave].disponibleConSupabase;
}

/** Función a la que lleva una opción del menú (se ignoran la consulta y el ancla), o null si no figura en la tabla. */
export function claveDeRutaMenu(href: string): ClaveFuncion | null {
  const ruta = href.split(/[?#]/)[0];
  for (const [clave, funcion] of Object.entries(FUNCIONES) as Array<[ClaveFuncion, Funcion]>) {
    if (funcion.menu.includes(ruta)) return clave;
  }
  return null;
}

export function rutaMenuDisponible(href: string): boolean {
  const clave = claveDeRutaMenu(href);
  return clave === null || funcionDisponible(clave);
}
```

- [ ] **Paso 4: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/features.test.ts`
Esperado: PASA (6 pruebas).

- [ ] **Paso 5: sin confirmación**

Este cambio se confirma al final del Grupo 1 (Tarea 4).

---

### Task 2: Respuesta 501 para la API y página `NoDisponible`

**Archivos**
- Crear: `src/platform/features-http.ts`
- Crear: `src/app/dashboard/_components/no-disponible.tsx`
- Probar: `tests/unit/features-http.test.ts`, `tests/unit/no-disponible.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/features-http.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { rutaNoDisponible } from '../../src/platform/features-http';

describe('rutaNoDisponible', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('con Supabase responde 501 sin caché y con el mensaje uniforme', async () => {
    mocks.configurado.mockReturnValue(true);
    const respuesta = rutaNoDisponible('REGLAMENTOS');
    expect(respuesta?.status).toBe(501);
    expect(respuesta?.headers.get('cache-control')).toBe('no-store');
    expect(await respuesta?.json()).toEqual({ error: 'Esta función estará disponible próximamente.' });
  });

  it('en modo local no interviene', () => {
    mocks.configurado.mockReturnValue(false);
    expect(rutaNoDisponible('REGLAMENTOS')).toBeNull();
  });
});
```

Crear `tests/unit/no-disponible.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('../../src/app/dashboard/_components/workspace-shell', () => ({ WorkspaceShell: ({ children }: { children: unknown }) => children }));
vi.mock('../../src/app/dashboard/require-workspace-user', () => ({ workspacePath: () => '/dashboard/institution' }));

import { exigirFuncion, NoDisponible } from '../../src/app/dashboard/_components/no-disponible';

const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };

describe('exigirFuncion', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('devuelve null cuando la función está disponible (modo local)', () => {
    mocks.configurado.mockReturnValue(false);
    expect(exigirFuncion('REGLAMENTOS', RECTOR, '/dashboard/regulations')).toBeNull();
  });

  it('con Supabase devuelve la página uniforme con la etiqueta de la función', () => {
    mocks.configurado.mockReturnValue(true);
    const elemento = exigirFuncion('REGLAMENTOS', RECTOR, '/dashboard/regulations');
    expect(elemento?.type).toBe(NoDisponible);
    expect(elemento?.props).toEqual({ user: RECTOR, activePath: '/dashboard/regulations', etiqueta: 'Manual de contratación IE' });
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/features-http.test.ts tests/unit/no-disponible.test.ts`
Esperado: FALLAN ambas con «Failed to resolve import» (`features-http` y `no-disponible` no existen).

- [ ] **Paso 3: implementar**

Crear `src/platform/features-http.ts`:

```ts
import { NextResponse } from 'next/server';
import { funcionDisponible, MENSAJE_NO_DISPONIBLE, type ClaveFuncion } from './features';

/**
 * Guarda de las rutas de API que todavía dependen de SQLite: con Supabase responde 501 sin caché;
 * en modo local devuelve null y la ruta continúa. Uso: `const noDisponible = rutaNoDisponible('X'); if (noDisponible) return noDisponible;`
 */
export function rutaNoDisponible(clave: ClaveFuncion): NextResponse | null {
  if (funcionDisponible(clave)) return null;
  return NextResponse.json({ error: MENSAJE_NO_DISPONIBLE }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
}
```

Crear `src/app/dashboard/_components/no-disponible.tsx`:

```tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { CurrentUser } from '@/platform/auth/current-user';
import { FUNCIONES, funcionDisponible, MENSAJE_NO_DISPONIBLE, type ClaveFuncion } from '@/platform/features';
import { workspacePath } from '../require-workspace-user';
import { WorkspaceShell } from './workspace-shell';

/** Página uniforme, dentro del marco normal, para una función que todavía no existe en Supabase. */
export function NoDisponible({ user, activePath, etiqueta }: { user: CurrentUser; activePath: string; etiqueta: string }) {
  return <WorkspaceShell user={user} activePath={activePath}><div className="page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Función en preparación</p><h1>{etiqueta}</h1><p>Esta sección todavía se está trasladando al servicio en línea de LEXCON.</p></div></header>
    <section className="surface">
      <div className="empty-state" role="status"><strong>{MENSAJE_NO_DISPONIBLE}</strong><p>Mientras tanto, puede seguir trabajando en las demás secciones del menú.</p></div>
      <div className="management-buttons"><Link className="secondary-button" href={workspacePath(user.role)}>Volver a mi espacio</Link></div>
    </section>
  </div></WorkspaceShell>;
}

/**
 * Guarda de las páginas que dependen de una función: null si está disponible; si no, la página uniforme.
 * Uso en un page.tsx: `const noDisponible = exigirFuncion('X', user, '/ruta'); if (noDisponible) return noDisponible;`
 */
export function exigirFuncion(clave: ClaveFuncion, user: CurrentUser, activePath: string): ReactElement | null {
  if (funcionDisponible(clave)) return null;
  return <NoDisponible user={user} activePath={activePath} etiqueta={FUNCIONES[clave].etiqueta} />;
}
```

- [ ] **Paso 4: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/features-http.test.ts tests/unit/no-disponible.test.ts`
Esperado: PASAN (4 pruebas).

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 4.

---

### Task 3: Menú lateral filtrado (`navFor`)

**Archivos**
- Crear: `src/app/dashboard/_components/navigation.ts`
- Modificar: `src/app/dashboard/_components/workspace-shell.tsx`
- Probar: `tests/unit/navigation.test.ts`

- [ ] **Paso 1: escribir la prueba que falla**

Crear `tests/unit/navigation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));

import { navFor } from '../../src/app/dashboard/_components/navigation';
import { rutaMenuDisponible } from '../../src/platform/features';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };
const COMITE: CurrentUser = { id: 'c-1', name: 'Comité', role: 'IE_COMMITTEE', institutionId: 'ie-1', institutionName: 'IE Uno' };
const SECCIONES = ['OPERACIÓN CONTRACTUAL', 'ADMINISTRACIÓN LEXCON', 'MI ESPACIO'];

describe('menú lateral', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('en modo local muestra todas las opciones del Administrador', () => {
    mocks.configurado.mockReturnValue(false);
    const items = navFor(ADMIN);
    const etiquetas = items.map((item) => item.label);
    for (const etiqueta of ['Bandeja de trabajo', 'Asignar responsable jurídico', 'Alertas y bloqueos', 'Instituciones Educativas', 'Equipo jurídico', 'Usuarios y accesos', 'Registro de actuaciones']) expect(etiquetas).toContain(etiqueta);
    expect(items.flatMap((item) => (item.section ? [item.section] : []))).toEqual(SECCIONES);
    expect(items.at(-1)).toMatchObject({ label: 'Mi cuenta', pinned: true });
  });

  it('con Supabase oculta las funciones no disponibles y conserva los rótulos de sección', () => {
    mocks.configurado.mockReturnValue(true);
    const items = navFor(ADMIN);
    for (const item of items) expect(rutaMenuDisponible(item.href)).toBe(true);
    expect(items.flatMap((item) => (item.section ? [item.section] : []))).toEqual(SECCIONES);
    expect(items[0]).toMatchObject({ label: 'Bandeja de trabajo', section: 'OPERACIÓN CONTRACTUAL' });
    expect(items.map((item) => item.label)).toContain('Usuarios y accesos');
  });

  it('con Supabase la IE no ve el Manual de contratación mientras no esté migrado', () => {
    mocks.configurado.mockReturnValue(true);
    expect(navFor(RECTOR).map((item) => item.href)).not.toContain('/dashboard/regulations');
    mocks.configurado.mockReturnValue(false);
    expect(navFor(RECTOR).map((item) => item.href)).toContain('/dashboard/regulations');
  });

  it('el comité no tiene menú ni Mi cuenta', () => {
    mocks.configurado.mockReturnValue(true);
    expect(navFor(COMITE)).toEqual([]);
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/navigation.test.ts`
Esperado: FALLA con «Failed to resolve import "../../src/app/dashboard/_components/navigation"».

- [ ] **Paso 3: implementar**

Crear `src/app/dashboard/_components/navigation.ts` (mueve aquí, sin cambios de texto, las opciones de `workspace-shell.tsx` y añade el filtro):

```ts
import type { CurrentUser } from '@/platform/auth/current-user';
import { rutaMenuDisponible } from '@/platform/features';

/** `pinned`: la opción queda fija bajo la lista desplazable del menú (siempre a la vista en pantallas de poca altura). */
export type NavigationItem = { href: string; label: string; icon: string; section?: string; pinned?: boolean };

const accountItem: NavigationItem = { href: '/dashboard/account', label: 'Mi cuenta', icon: '◍', section: 'MI ESPACIO', pinned: true };

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

/**
 * Quita las opciones cuya función no está disponible con Supabase (src/platform/features.ts).
 * Si desaparece la opción que abría una sección, su rótulo pasa a la siguiente opción visible de esa sección.
 */
function soloDisponibles(items: NavigationItem[]): NavigationItem[] {
  const visibles: NavigationItem[] = [];
  let seccionPendiente: string | undefined;
  for (const item of items) {
    if (item.section) seccionPendiente = item.section;
    if (!rutaMenuDisponible(item.href)) continue;
    const { href, label, icon, pinned } = item;
    visibles.push({ href, label, icon, ...(seccionPendiente ? { section: seccionPendiente } : {}), ...(pinned ? { pinned } : {}) });
    seccionPendiente = undefined;
  }
  return visibles;
}

export function navFor(user: CurrentUser): NavigationItem[] {
  const base = soloDisponibles(baseNavFor(user));
  return user.role === 'IE_COMMITTEE' ? base : [...base, accountItem];
}
```

Modificar `src/app/dashboard/_components/workspace-shell.tsx`:

1. Reemplazar `import { WorkspaceFrame } from './workspace-frame';` por:

```tsx
import { WorkspaceFrame } from './workspace-frame';
import { navFor } from './navigation';
```

2. Reemplazar el bloque completo siguiente (desde el comentario de `pinned` hasta el cierre de `navFor`):

```tsx
/** `pinned`: la opción queda fija bajo la lista desplazable del menú (siempre a la vista en pantallas de poca altura). */
export type NavigationItem = { href: string; label: string; icon: string; section?: string; pinned?: boolean };

const accountItem: NavigationItem = { href: '/dashboard/account', label: 'Mi cuenta', icon: '◍', section: 'MI ESPACIO', pinned: true };

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
```

por esta única línea (mantiene el tipo para `sidebar-menu.tsx`, que lo importa desde `./workspace-shell`):

```tsx
export type { NavigationItem } from './navigation';
```

`roleLabels` y el resto del componente no cambian.

- [ ] **Paso 4: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/navigation.test.ts` y después `corepack pnpm typecheck`
Esperado: 4 pruebas PASAN; `tsc` sin errores.

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 4.

---

### Task 4: Guardas en páginas y rutas, prueba de coherencia y confirmación de la Parte 0

**Archivos**
- Probar: `tests/unit/funciones-coherencia.test.ts`
- Modificar (páginas): `src/app/dashboard/admin/institutions/page.tsx`, `src/app/dashboard/admin/institutions/new/page.tsx`, `src/app/dashboard/admin/institutions/[institutionId]/page.tsx`, `src/app/dashboard/admin/lawyers/page.tsx`, `src/app/dashboard/admin/lawyers/new/page.tsx`, `src/app/dashboard/admin/accesses/page.tsx`, `src/app/dashboard/admin/assignments/page.tsx`, `src/app/dashboard/admin/alerts/page.tsx`, `src/app/dashboard/admin/audit/page.tsx`, `src/app/dashboard/regulations/page.tsx`
- Modificar (rutas): `src/app/api/admin/institutions/route.ts`, `src/app/api/admin/attorneys/route.ts`, `src/app/api/admin/accesses/route.ts`, `src/app/api/admin/attorney-assignments/route.ts`, `src/app/api/regulations/route.ts`, `src/app/api/notifications/push-subscription/route.ts`, `src/app/api/processes/[processId]/quotations/route.ts`, `src/app/api/processes/[processId]/market-study-profile/route.ts`, `src/app/api/processes/[processId]/market-study-document/route.ts`, `src/app/api/processes/[processId]/evaluation-team/route.ts`, `src/app/api/processes/[processId]/evaluation-act/route.ts`, `src/app/api/processes/[processId]/workflow/route.ts`, `src/app/api/processes/[processId]/precontractual-documents/[draftKind]/route.ts`, `src/app/api/processes/[processId]/generated-document/[kind]/route.ts`, `src/app/api/processes/[processId]/closure-declaration/route.ts`
- Modificar: `docs/current-state.md`

- [ ] **Paso 1: escribir la prueba de coherencia que falla**

Crear `tests/unit/funciones-coherencia.test.ts`:

```ts
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
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/funciones-coherencia.test.ts`
Esperado: FALLAN «las páginas de funciones no disponibles llaman a exigirFuncion» (lista las 10 páginas) y «cada manejador de las rutas no disponibles responde 501» (lista las 15 rutas). Las otras cuatro pasan.

- [ ] **Paso 3: añadir la guarda a las páginas**

En cada página: (a) reemplazar la línea de importación de `requireWorkspaceUser` por esa misma línea seguida de la importación de `exigirFuncion`; (b) reemplazar la línea `const user = ...` indicada por la versión con guarda.

| Página | Importación de `exigirFuncion` | Clave | `activePath` |
| --- | --- | --- | --- |
| `src/app/dashboard/admin/institutions/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `INSTITUCIONES` | `/dashboard/admin/institutions` |
| `src/app/dashboard/admin/institutions/new/page.tsx` | `import { exigirFuncion } from '../../../_components/no-disponible';` | `INSTITUCIONES` | `/dashboard/admin/institutions/new` |
| `src/app/dashboard/admin/institutions/[institutionId]/page.tsx` | `import { exigirFuncion } from '../../../_components/no-disponible';` | `INSTITUCIONES` | `/dashboard/admin/institutions` |
| `src/app/dashboard/admin/lawyers/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `EQUIPO_JURIDICO` | `/dashboard/admin/lawyers` |
| `src/app/dashboard/admin/lawyers/new/page.tsx` | `import { exigirFuncion } from '../../../_components/no-disponible';` | `EQUIPO_JURIDICO` | `/dashboard/admin/lawyers/new` |
| `src/app/dashboard/admin/accesses/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `ACCESOS` | `/dashboard/admin/accesses` |
| `src/app/dashboard/admin/assignments/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `ASIGNACION_JURIDICA` | `/dashboard/admin/assignments` |
| `src/app/dashboard/admin/alerts/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `ALERTAS_BLOQUEOS` | `/dashboard/admin/alerts` |
| `src/app/dashboard/admin/audit/page.tsx` | `import { exigirFuncion } from '../../_components/no-disponible';` | `REGISTRO_ACTUACIONES` | `/dashboard/admin/audit` |
| `src/app/dashboard/regulations/page.tsx` | `import { exigirFuncion } from '../_components/no-disponible';` | `REGLAMENTOS` | `/dashboard/regulations` |

En las nueve páginas de `admin`, reemplazar `const user = await requireWorkspaceUser(['ARKA_ADMIN']);` por (con la clave y el `activePath` de la tabla):

```tsx
const user = await requireWorkspaceUser(['ARKA_ADMIN']); const noDisponible = exigirFuncion('INSTITUCIONES', user, '/dashboard/admin/institutions'); if (noDisponible) return noDisponible;
```

En `src/app/dashboard/regulations/page.tsx`, reemplazar `const user = await requireWorkspaceUser(['IE_RECTOR', 'IE_SUPPORT']);` por:

```tsx
const user = await requireWorkspaceUser(['IE_RECTOR', 'IE_SUPPORT']); const noDisponible = exigirFuncion('REGLAMENTOS', user, '/dashboard/regulations'); if (noDisponible) return noDisponible;
```

La guarda va siempre antes de cualquier lectura de datos (`listManagedInstitutions()`, `getAdminControlCenter()`, `getInstitutionRegulation()`...), que en las páginas actuales aparece después de esa línea.

- [ ] **Paso 4: añadir la guarda a las rutas**

En cada ruta: (a) reemplazar `import { NextResponse } from 'next/server';` por:

```ts
import { NextResponse } from 'next/server';
import { rutaNoDisponible } from '@/platform/features-http';
```

(b) reemplazar **todas** las apariciones (Edit con `replace_all: true`) del texto indicado por la versión con guarda. Cada aparición es la primera instrucción de un manejador exportado (el número de apariciones coincide con el de manejadores).

| Ruta | Clave | Texto a reemplazar (todas las apariciones) |
| --- | --- | --- |
| `src/app/api/admin/institutions/route.ts` | `INSTITUCIONES` | `const user = await admin();` |
| `src/app/api/admin/attorneys/route.ts` | `EQUIPO_JURIDICO` | `const user = await admin();` |
| `src/app/api/admin/accesses/route.ts` | `ACCESOS` | `const user = await currentUser();` |
| `src/app/api/admin/attorney-assignments/route.ts` | `ASIGNACION_JURIDICA` | `const user = await currentUser();` |
| `src/app/api/regulations/route.ts` | `REGLAMENTOS` | `const user = await currentUser();` |
| `src/app/api/notifications/push-subscription/route.ts` | `NOTIFICACIONES_PUSH` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/quotations/route.ts` | `COTIZACIONES` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/market-study-profile/route.ts` | `ESTUDIO_MERCADO` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/market-study-document/route.ts` | `ESTUDIO_MERCADO` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/evaluation-team/route.ts` | `COMITE_EVALUACION` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/evaluation-act/route.ts` | `COMITE_EVALUACION` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/workflow/route.ts` | `FLUJO_TRANSICIONES` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/precontractual-documents/[draftKind]/route.ts` | `DOCUMENTOS_GENERADOS` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/generated-document/[kind]/route.ts` | `DOCUMENTOS_GENERADOS` | `const user = await currentUser();` |
| `src/app/api/processes/[processId]/closure-declaration/route.ts` | `DOCUMENTOS_GENERADOS` | `const user = await currentUser();` |

Reemplazo (ejemplo para `REGLAMENTOS`; en `institutions` y `attorneys` termina en `const user = await admin();`):

```ts
const noDisponible = rutaNoDisponible('REGLAMENTOS'); if (noDisponible) return noDisponible; const user = await currentUser();
```

No toque la función auxiliar `admin()` de `institutions` y `attorneys` (contiene `const user = await currentUser();`, pero no es un manejador).

- [ ] **Paso 5: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/funciones-coherencia.test.ts tests/unit/features.test.ts tests/unit/navigation.test.ts`
Esperado: PASAN todas.

- [ ] **Paso 6: documentar**

En `docs/current-state.md`, reemplazar la frase final del archivo `No puede usarse sobre la propia cuenta del Administrador, que cambia su correo desde Mi cuenta.` por esa misma frase seguida de:

```markdown


## Administración sobre Supabase (2026-10-15)

Diseño: [2026-10-15-administracion-supabase-design.md](superpowers/specs/2026-10-15-administracion-supabase-design.md); plan: [2026-10-15-administracion-supabase-plan.md](superpowers/plans/2026-10-15-administracion-supabase-plan.md).

- **Funciones no disponibles (Parte 0):** `src/platform/features.ts` declara las funciones que todavía dependen de SQLite (manual de contratación, cotizaciones posteriores a la apertura, estudio de mercado, comité evaluador, actuaciones del flujo, documentos generados por IAG, alertas al dispositivo y, hasta su migración, la Administración). Con Supabase activo, sus pantallas muestran «Esta función estará disponible próximamente» dentro del marco normal, sus rutas de API responden 501 sin caché y el menú no las ofrece; en modo local (SQLite) todo sigue disponible. `tests/unit/funciones-coherencia.test.ts` impide que una pantalla o ruta nueva que dependa de SQLite quede fuera de la tabla.
```

- [ ] **Paso 7: verificación del grupo**

Ejecutar: `corepack pnpm typecheck` y `corepack pnpm exec vitest run`
Esperado: sin errores de tipos; todas las pruebas pasan (las existentes más 20 nuevas).

- [ ] **Paso 8: Commit (solo con autorización explícita)**

Pida autorización a la persona responsable. Con ella:

```bash
git add src/platform/features.ts src/platform/features-http.ts \
  src/app/dashboard/_components/no-disponible.tsx src/app/dashboard/_components/navigation.ts src/app/dashboard/_components/workspace-shell.tsx \
  src/app/dashboard/admin/institutions/page.tsx src/app/dashboard/admin/institutions/new/page.tsx "src/app/dashboard/admin/institutions/[institutionId]/page.tsx" \
  src/app/dashboard/admin/lawyers/page.tsx src/app/dashboard/admin/lawyers/new/page.tsx src/app/dashboard/admin/accesses/page.tsx \
  src/app/dashboard/admin/assignments/page.tsx src/app/dashboard/admin/alerts/page.tsx src/app/dashboard/admin/audit/page.tsx src/app/dashboard/regulations/page.tsx \
  src/app/api/admin/institutions/route.ts src/app/api/admin/attorneys/route.ts src/app/api/admin/accesses/route.ts src/app/api/admin/attorney-assignments/route.ts \
  src/app/api/regulations/route.ts src/app/api/notifications/push-subscription/route.ts \
  "src/app/api/processes/[processId]/quotations/route.ts" "src/app/api/processes/[processId]/market-study-profile/route.ts" \
  "src/app/api/processes/[processId]/market-study-document/route.ts" "src/app/api/processes/[processId]/evaluation-team/route.ts" \
  "src/app/api/processes/[processId]/evaluation-act/route.ts" "src/app/api/processes/[processId]/workflow/route.ts" \
  "src/app/api/processes/[processId]/precontractual-documents/[draftKind]/route.ts" "src/app/api/processes/[processId]/generated-document/[kind]/route.ts" \
  "src/app/api/processes/[processId]/closure-declaration/route.ts" \
  tests/unit/features.test.ts tests/unit/features-http.test.ts tests/unit/no-disponible.test.ts tests/unit/navigation.test.ts tests/unit/funciones-coherencia.test.ts \
  docs/current-state.md docs/superpowers/plans/2026-10-15-administracion-supabase-plan.md
git commit -m "feat: avisar de las funciones que aún no están disponibles con Supabase" \
  -m "src/platform/features.ts declara las funciones que dependen de SQLite. Con Supabase activo sus páginas muestran una pantalla uniforme dentro del marco, sus rutas responden 501 sin caché y el menú las oculta; en modo local todo sigue disponible. Una prueba de coherencia impide que una entrada nueva dependiente de SQLite quede fuera de la tabla." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

Esperado: el hook de pre-commit acepta (hay documentación preparada).

---

## Grupo 2 · A1: Instituciones Educativas

### Task 5: Migración `registrar_evento_administrativo` y `guardar_institucion`

**Archivos**
- Crear: `supabase/migrations/20261015120000_administracion_instituciones_y_eventos.sql`
- Probar: `tests/unit/migracion-administracion.test.ts`

- [ ] **Paso 1: escribir la prueba de contrato que falla**

Crear `tests/unit/migracion-administracion.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ARCHIVO = '20261015120000_administracion_instituciones_y_eventos.sql';
const sql = readFileSync(join(__dirname, '../../supabase/migrations', ARCHIVO), 'utf8');
const FIRMA_EVENTO = 'public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb)';
const FIRMA_GUARDAR = 'public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text)';
const escapar = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('migración de administración de Instituciones Educativas', () => {
  it('es posterior a la última migración aplicada', () => {
    expect(ARCHIVO > '20261012201458_sincronizar_correo_y_auditar_acceso.sql').toBe(true);
  });

  it('define las dos funciones con la firma acordada', () => {
    expect(sql).toMatch(/create or replace function public\.registrar_evento_administrativo\(\s*p_id_actor uuid,\s*p_id_institucion uuid,\s*p_id_proceso uuid,\s*p_accion text,\s*p_tipo_entidad text,\s*p_id_entidad uuid,\s*p_datos jsonb default '\{\}'::jsonb\s*\)\s*returns void/i);
    expect(sql).toMatch(/create or replace function public\.guardar_institucion\(\s*p_id_actor uuid,\s*p_id uuid,\s*p_nombre text,\s*p_ciudad text,\s*p_departamento text,\s*p_nit text,\s*p_codigo_dane text,\s*p_estado text,\s*p_observacion text\s*\)\s*returns uuid/i);
  });

  it('las funciones son security definer con search_path fijo', () => {
    expect((sql.match(/security definer/gi) ?? []).length).toBe(2);
    expect((sql.match(/set search_path = pg_catalog, public/gi) ?? []).length).toBe(2);
  });

  it('solo service_role puede ejecutarlas', () => {
    for (const firma of [FIRMA_EVENTO, FIRMA_GUARDAR]) {
      expect(sql).toMatch(new RegExp(`revoke all on function ${escapar(firma)} from public, anon, authenticated`, 'i'));
      expect(sql).toMatch(new RegExp(`grant execute on function ${escapar(firma)} to service_role`, 'i'));
    }
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i);
  });

  it('solo acepta las acciones administrativas acordadas y exige un Administrador activo', () => {
    for (const accion of ['INSTITUCION_CREADA', 'INSTITUCION_ACTUALIZADA', 'INSTITUCION_SERVICIO_SUSPENDIDO', 'INSTITUCION_SERVICIO_FINALIZADO', 'INSTITUCION_SERVICIO_REACTIVADO']) expect(sql).toContain(`'${accion}'`);
    expect(sql).toMatch(/rol\.codigo = 'ADMINISTRADOR_ARKA'/);
    expect(sql).toMatch(/errcode = '42501'/);
  });

  it('inserta en eventos_auditoria y deja la cadena de hash al disparador existente', () => {
    expect(sql).toMatch(/insert into public\.eventos_auditoria/i);
    expect(sql).not.toMatch(/hash_evento|hash_anterior/i);
  });

  it('guardar_institucion es atómica: IE, periodo de servicio y auditoría en la misma función', () => {
    expect(sql).toMatch(/insert into public\.instituciones_educativas/i);
    expect(sql).toMatch(/update public\.instituciones_educativas/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/update public\.periodos_servicio_ie\s+set finaliza_en = current_date/i);
    expect((sql.match(/insert into public\.periodos_servicio_ie/gi) ?? []).length).toBe(2);
    expect(sql).toMatch(/perform public\.registrar_evento_administrativo\(/i);
    expect(sql).toMatch(/activo = \(p_estado = 'ACTIVO'\)/);
    expect(sql).toMatch(/errcode = 'P0002'/);
    expect(sql).toMatch(/errcode = '22023'/);
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/migracion-administracion.test.ts`
Esperado: FALLA con `ENOENT: no such file or directory` (la migración no existe).

- [ ] **Paso 3: escribir la migración**

Crear `supabase/migrations/20261015120000_administracion_instituciones_y_eventos.sql`:

```sql
-- Administración de Instituciones Educativas sobre Supabase.
-- registrar_evento_administrativo deja en eventos_auditoria las actuaciones del
-- Administrador; el disparador eventos_auditoria_encadenados calcula la cadena.
-- guardar_institucion crea o actualiza una IE, cierra y abre su periodo de
-- servicio cuando cambia el estado y registra la auditoría en una sola
-- transacción. Ambas se ejecutan solo desde el servidor de LEXCON (service_role).

create or replace function public.registrar_evento_administrativo(
  p_id_actor uuid,
  p_id_institucion uuid,
  p_id_proceso uuid,
  p_accion text,
  p_tipo_entidad text,
  p_id_entidad uuid,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_accion not in (
    'INSTITUCION_CREADA',
    'INSTITUCION_ACTUALIZADA',
    'INSTITUCION_SERVICIO_SUSPENDIDO',
    'INSTITUCION_SERVICIO_FINALIZADO',
    'INSTITUCION_SERVICIO_REACTIVADO'
  ) then
    raise exception 'ACCION_NO_VALIDA' using errcode = '22023';
  end if;
  if p_id_entidad is null or btrim(coalesce(p_tipo_entidad, '')) = '' then
    raise exception 'ENTIDAD_NO_VALIDA' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = p_id_actor
      and asignacion.activa
      and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'ACTOR_NO_AUTORIZADO' using errcode = '42501';
  end if;

  insert into public.eventos_auditoria (
    id_institucion, id_proceso, id_actor, accion, tipo_entidad, id_entidad, datos_despues
  ) values (
    p_id_institucion, p_id_proceso, p_id_actor, p_accion, p_tipo_entidad, p_id_entidad, coalesce(p_datos, '{}'::jsonb)
  );
end;
$$;

create or replace function public.guardar_institucion(
  p_id_actor uuid,
  p_id uuid,
  p_nombre text,
  p_ciudad text,
  p_departamento text,
  p_nit text,
  p_codigo_dane text,
  p_estado text,
  p_observacion text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_estado_anterior text;
  v_accion text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_ciudad text := btrim(coalesce(p_ciudad, ''));
  v_departamento text := btrim(coalesce(p_departamento, ''));
  v_nit text := nullif(btrim(p_nit), '');
  v_codigo_dane text := nullif(btrim(p_codigo_dane), '');
  v_observacion text := nullif(btrim(p_observacion), '');
begin
  if not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = p_id_actor
      and asignacion.activa
      and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'ACTOR_NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_estado is null
    or p_estado not in ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO')
    or char_length(v_nombre) not between 3 and 120
    or char_length(v_ciudad) not between 2 and 100
    or char_length(v_departamento) not between 2 and 100 then
    raise exception 'DATOS_INVALIDOS' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.instituciones_educativas (
      nombre, ciudad, departamento, nit, codigo_dane, estado_servicio, observacion_servicio, activo
    ) values (
      v_nombre, v_ciudad, v_departamento, v_nit, v_codigo_dane, p_estado, v_observacion, p_estado = 'ACTIVO'
    )
    returning id into v_id;
    insert into public.periodos_servicio_ie (id_institucion, inicia_en, estado, motivo, registrado_por)
    values (v_id, current_date, p_estado, v_observacion, p_id_actor);
    v_accion := 'INSTITUCION_CREADA';
  else
    select estado_servicio into v_estado_anterior
    from public.instituciones_educativas
    where id = p_id
    for update;
    if not found then
      raise exception 'INSTITUCION_NO_EXISTE' using errcode = 'P0002';
    end if;
    v_id := p_id;
    update public.instituciones_educativas
       set nombre = v_nombre,
           ciudad = v_ciudad,
           departamento = v_departamento,
           nit = v_nit,
           codigo_dane = v_codigo_dane,
           estado_servicio = p_estado,
           observacion_servicio = v_observacion,
           activo = (p_estado = 'ACTIVO')
     where id = v_id;
    if v_estado_anterior is distinct from p_estado then
      update public.periodos_servicio_ie
         set finaliza_en = current_date
       where id_institucion = v_id and finaliza_en is null;
      insert into public.periodos_servicio_ie (id_institucion, inicia_en, estado, motivo, registrado_por)
      values (v_id, current_date, p_estado, v_observacion, p_id_actor);
      v_accion := case p_estado
        when 'SUSPENDIDO' then 'INSTITUCION_SERVICIO_SUSPENDIDO'
        when 'FINALIZADO' then 'INSTITUCION_SERVICIO_FINALIZADO'
        else 'INSTITUCION_SERVICIO_REACTIVADO'
      end;
    else
      v_accion := 'INSTITUCION_ACTUALIZADA';
    end if;
  end if;

  perform public.registrar_evento_administrativo(
    p_id_actor, v_id, null, v_accion, 'INSTITUCION', v_id,
    jsonb_build_object(
      'nombre', v_nombre,
      'ciudad', v_ciudad,
      'departamento', v_departamento,
      'estado_servicio', p_estado,
      'estado_anterior', v_estado_anterior
    )
  );
  return v_id;
end;
$$;

revoke all on function public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb) to service_role;
grant execute on function public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text) to service_role;
```

Notas para quien implementa: la violación de `unique (nit)` o `unique (codigo_dane)` se propaga como `23505` con el nombre de la restricción (`instituciones_educativas_nit_key` o `instituciones_educativas_codigo_dane_key`); el adaptador la traduce (Tarea 6). Una IE creada antes de esta migración puede no tener periodo abierto: cerrar «el vigente» afecta cero filas y el nuevo periodo se abre igual.

- [ ] **Paso 4: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/migracion-administracion.test.ts`
Esperado: PASA (7 pruebas). La migración **no** se aplica ahora (se aplica en la Tarea 16, con confirmación).

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 8.

---

### Task 6: Servicio, adaptador Supabase y adaptador SQLite de Instituciones Educativas

**Archivos**
- Crear: `src/modules/admin/institutions/institution-service.ts`
- Crear: `src/modules/admin/institutions/institution-port-supabase.ts`
- Crear: `src/modules/admin/institutions/institution-port-local.ts`
- Crear: `src/modules/admin/institutions/institution-runtime.ts`
- Crear: `tests/unit/helpers/supabase-falso.ts`
- Modificar: `src/modules/admin/service-administration.ts` (`createInstitution` devuelve el identificador)
- Probar: `tests/unit/institution-service.test.ts`, `tests/unit/institution-port-supabase.test.ts`, `tests/integration/institution-port-local.test.ts`

- [ ] **Paso 1: crear el cliente de Supabase simulado (soporte de pruebas)**

Crear `tests/unit/helpers/supabase-falso.ts` (no es una prueba: Vitest solo ejecuta `*.test.ts`; `tsc` sí lo comprueba):

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsultaFalsa {
  tabla: string;
  operaciones: Array<{ metodo: string; argumentos: unknown[] }>;
}

export interface RespuestaFalsa {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
}

export type ResponderTabla = (consulta: ConsultaFalsa) => RespuestaFalsa;
export type ResponderRpc = (nombre: string, argumentos: Record<string, unknown>) => RespuestaFalsa;

/**
 * Cliente de Supabase simulado. Cada `from(tabla)` registra las llamadas encadenadas (select, eq, in, order,
 * limit, maybeSingle...) y, al esperarse, responde con `tablas[tabla](consulta)`; sin respuesta configurada
 * devuelve { data: null, error: null, count: null }. `rpc` registra la llamada y responde con `rpc(nombre, argumentos)`.
 */
export function crearSupabaseFalso(opciones: { tablas?: Record<string, ResponderTabla>; rpc?: ResponderRpc } = {}) {
  const consultas: ConsultaFalsa[] = [];
  const llamadasRpc: Array<{ nombre: string; argumentos: Record<string, unknown> }> = [];

  function desde(tabla: string): unknown {
    const consulta: ConsultaFalsa = { tabla, operaciones: [] };
    consultas.push(consulta);
    const cadena: object = new Proxy({}, {
      get(_objetivo, propiedad) {
        if (propiedad === 'then') {
          const respuesta = opciones.tablas?.[tabla]?.(consulta) ?? {};
          const resultado = { data: respuesta.data ?? null, error: respuesta.error ?? null, count: respuesta.count ?? null };
          return (resolver: (valor: unknown) => unknown, rechazar?: (motivo: unknown) => unknown) => Promise.resolve(resultado).then(resolver, rechazar);
        }
        return (...argumentos: unknown[]) => {
          consulta.operaciones.push({ metodo: String(propiedad), argumentos });
          return cadena;
        };
      },
    });
    return cadena;
  }

  const cliente = {
    from: desde,
    async rpc(nombre: string, argumentos: Record<string, unknown> = {}) {
      llamadasRpc.push({ nombre, argumentos });
      const respuesta = opciones.rpc?.(nombre, argumentos) ?? {};
      return { data: respuesta.data ?? null, error: respuesta.error ?? null };
    },
  };

  return { cliente: cliente as unknown as SupabaseClient, consultas, llamadasRpc };
}

/** Argumentos de cada llamada a `metodo` dentro de una consulta (p. ej. todas las `eq`). */
export function operaciones(consulta: ConsultaFalsa, metodo: string): unknown[][] {
  return consulta.operaciones.filter((operacion) => operacion.metodo === metodo).map((operacion) => operacion.argumentos);
}

export function consultasDe(consultas: ConsultaFalsa[], tabla: string): ConsultaFalsa[] {
  return consultas.filter((consulta) => consulta.tabla === tabla);
}
```

- [ ] **Paso 2: escribir las pruebas que fallan**

Crear `tests/unit/institution-service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  actualizarInstitucion,
  crearInstitucion,
  ErrorInstitucion,
  listarInstituciones,
  obtenerInstitucion,
  validarDatosInstitucion,
  type InstitucionAdministrada,
  type PuertoInstituciones,
} from '../../src/modules/admin/institutions/institution-service';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
const EXISTENTE: InstitucionAdministrada = {
  id: 'ie-1', nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null,
  estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 2, procesos: 1,
};
const VALIDA = { nombre: '  IE   San José ', ciudad: ' Montería ', departamento: 'Córdoba', nit: '', codigoDane: ' 123456789012 ', estado: 'SUSPENDED_ARREARS', observacion: '   ' };

function crearPuerto() {
  return {
    listar: vi.fn(async () => [EXISTENTE]),
    obtener: vi.fn(async (id: string) => (id === 'ie-1' ? EXISTENTE : null)),
    guardar: vi.fn(async (id: string | null) => id ?? 'ie-nueva'),
  } satisfies PuertoInstituciones;
}

describe('servicio de Instituciones Educativas', () => {
  it('solo el Administrador puede listar', async () => {
    const puerto = crearPuerto();
    await expect(listarInstituciones(puerto, ABOGADO)).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO', message: 'No tienes autorización para administrar el servicio.' });
    expect(puerto.listar).not.toHaveBeenCalled();
    expect(await listarInstituciones(puerto, ADMIN)).toEqual([EXISTENTE]);
  });

  it('crea con los datos normalizados y devuelve el identificador', async () => {
    const puerto = crearPuerto();
    expect(await crearInstitucion(puerto, ADMIN, VALIDA)).toBe('ie-nueva');
    expect(puerto.guardar).toHaveBeenCalledWith(null, {
      nombre: 'IE San José', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: '123456789012', estado: 'SUSPENDED_ARREARS', observacion: null,
    }, ADMIN);
  });

  it.each<[Record<string, unknown>, string]>([
    [{ nombre: 'IE' }, 'El nombre de la Institución Educativa debe tener entre 3 y 120 caracteres.'],
    [{ ciudad: 'M' }, 'La ciudad o municipio debe tener entre 2 y 100 caracteres.'],
    [{ departamento: undefined }, 'El departamento debe tener entre 2 y 100 caracteres.'],
    [{ nit: '80012A' }, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).'],
    [{ nit: 800123 }, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).'],
    [{ codigoDane: '12-34' }, 'El código DANE solo admite números (entre 5 y 15 dígitos).'],
    [{ estado: 'ACTIVO' }, 'Selecciona un estado de servicio válido.'],
    [{ observacion: 'x'.repeat(501) }, 'La observación administrativa no puede superar 500 caracteres.'],
  ])('rechaza datos inválidos (%o)', async (cambio, mensaje) => {
    const puerto = crearPuerto();
    await expect(crearInstitucion(puerto, ADMIN, { ...VALIDA, ...cambio })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: mensaje });
    expect(puerto.guardar).not.toHaveBeenCalled();
  });

  it('acepta un NIT con puntos y guion', () => {
    expect(validarDatosInstitucion({ ...VALIDA, nit: ' 800.123.456-7 ' }).nit).toBe('800.123.456-7');
  });

  it('actualizar exige una IE indicada y existente', async () => {
    const puerto = crearPuerto();
    await expect(actualizarInstitucion(puerto, ADMIN, '  ', VALIDA)).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', message: 'Selecciona una Institución Educativa.' });
    await expect(actualizarInstitucion(puerto, ADMIN, 'ie-9', VALIDA)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADA', message: 'La Institución Educativa no existe.' });
    expect(puerto.guardar).not.toHaveBeenCalled();
    expect(await actualizarInstitucion(puerto, ADMIN, 'ie-1', { ...VALIDA, estado: 'ENDED' })).toBe('ie-1');
    expect(puerto.guardar).toHaveBeenCalledWith('ie-1', expect.objectContaining({ estado: 'ENDED' }), ADMIN);
  });

  it('el abogado no puede crear ni actualizar', async () => {
    const puerto = crearPuerto();
    await expect(crearInstitucion(puerto, ABOGADO, VALIDA)).rejects.toBeInstanceOf(ErrorInstitucion);
    await expect(actualizarInstitucion(puerto, ABOGADO, 'ie-1', VALIDA)).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    expect(puerto.obtener).not.toHaveBeenCalled();
    expect(puerto.guardar).not.toHaveBeenCalled();
  });

  it('obtener ignora identificadores vacíos sin consultar', async () => {
    const puerto = crearPuerto();
    expect(await obtenerInstitucion(puerto, ADMIN, undefined)).toBeNull();
    expect(puerto.obtener).not.toHaveBeenCalled();
    expect(await obtenerInstitucion(puerto, ADMIN, 'ie-1')).toEqual(EXISTENTE);
  });
});
```

Crear `tests/unit/institution-port-supabase.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { crearPuertoInstitucionesSupabase } from '../../src/modules/admin/institutions/institution-port-supabase';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones, type ConsultaFalsa } from './helpers/supabase-falso';

const ID = '11111111-1111-4111-8111-111111111111';
const OTRA = '22222222-2222-4222-8222-222222222222';
const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const FILA = {
  id: ID, nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '800123456-7', codigo_dane: '123001000001',
  estado_servicio: 'SUSPENDIDO', observacion_servicio: 'Mora de agosto', activo: false, creado_en: '2026-10-01T00:00:00.000Z',
};
const FILA_OTRA = { ...FILA, id: OTRA, nombre: 'IE Otra', nit: null, codigo_dane: null, estado_servicio: 'ACTIVO', observacion_servicio: null, activo: true };
const DATOS = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: '123001000001', estado: 'ENDED' as const, observacion: 'Fin de contrato' };

function tablas(institucion: unknown = FILA) {
  return {
    instituciones_educativas: (consulta: ConsultaFalsa) => (operaciones(consulta, 'maybeSingle').length ? { data: institucion } : { data: [FILA, FILA_OTRA] }),
    asignaciones_roles_usuario: () => ({ data: [{ id_usuario: 'u-1', id_institucion: ID }, { id_usuario: 'u-1', id_institucion: ID }, { id_usuario: 'u-2', id_institucion: ID }] }),
    procesos_contratacion: () => ({ data: [{ id_institucion: ID }, { id_institucion: OTRA }, { id_institucion: OTRA }] }),
  };
}

describe('adaptador Supabase de Instituciones Educativas', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('lista con el estado traducido y los conteos de cuentas y procesos', async () => {
    const falso = crearSupabaseFalso({ tablas: tablas() });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).listar()).toEqual([
      { id: ID, nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '800123456-7', codigoDane: '123001000001', estado: 'SUSPENDED_ARREARS', observacion: 'Mora de agosto', activa: false, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 2, procesos: 1 },
      { id: OTRA, nombre: 'IE Otra', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 0, procesos: 2 },
    ]);
    const [consulta] = consultasDe(falso.consultas, 'instituciones_educativas');
    expect(operaciones(consulta, 'order')).toEqual([['activo', { ascending: false }], ['nombre']]);
    const [asignaciones] = consultasDe(falso.consultas, 'asignaciones_roles_usuario');
    expect(operaciones(asignaciones, 'eq')).toEqual([['activa', true]]);
    expect(operaciones(asignaciones, 'in')).toEqual([['id_institucion', [ID, OTRA]]]);
  });

  it('obtener devuelve null sin consultar si el identificador no es un UUID', async () => {
    const falso = crearSupabaseFalso({ tablas: tablas() });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).obtener('abc')).toBeNull();
    expect(falso.consultas).toEqual([]);
  });

  it('obtener devuelve la IE con sus conteos, o null si no existe', async () => {
    expect(await crearPuertoInstitucionesSupabase(crearSupabaseFalso({ tablas: tablas() }).cliente).obtener(ID)).toMatchObject({ id: ID, estado: 'SUSPENDED_ARREARS', cuentasActivas: 2, procesos: 1 });
    expect(await crearPuertoInstitucionesSupabase(crearSupabaseFalso({ tablas: tablas(null) }).cliente).obtener(ID)).toBeNull();
  });

  it('guardar llama a guardar_institucion con el estado de la base y devuelve el identificador', async () => {
    const falso = crearSupabaseFalso({ rpc: () => ({ data: ID }) });
    expect(await crearPuertoInstitucionesSupabase(falso.cliente).guardar(ID, DATOS, ADMIN)).toBe(ID);
    expect(falso.llamadasRpc).toEqual([{
      nombre: 'guardar_institucion',
      argumentos: { p_id_actor: 'a-1', p_id: ID, p_nombre: 'IE INEM', p_ciudad: 'Montería', p_departamento: 'Córdoba', p_nit: null, p_codigo_dane: '123001000001', p_estado: 'FINALIZADO', p_observacion: 'Fin de contrato' },
    }]);
  });

  it.each<[{ code: string; message: string }, string, string]>([
    [{ code: '23505', message: 'duplicate key value violates unique constraint "instituciones_educativas_nit_key"' }, 'DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.'],
    [{ code: '23505', message: 'duplicate key value violates unique constraint "instituciones_educativas_codigo_dane_key"' }, 'DUPLICADA', 'Ya existe una Institución Educativa con ese código DANE.'],
    [{ code: '42501', message: 'ACTOR_NO_AUTORIZADO' }, 'NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.'],
    [{ code: 'P0002', message: 'INSTITUCION_NO_EXISTE' }, 'NO_ENCONTRADA', 'La Institución Educativa no existe.'],
    [{ code: '22023', message: 'DATOS_INVALIDOS' }, 'DATOS_INVALIDOS', 'Los datos de la Institución Educativa no son válidos.'],
  ])('traduce el error %o', async (error, codigo, mensaje) => {
    const falso = crearSupabaseFalso({ rpc: () => ({ error }) });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).guardar(null, DATOS, ADMIN)).rejects.toMatchObject({ codigo, message: mensaje });
  });

  it('un fallo desconocido responde genérico y registra solo el código', async () => {
    const falso = crearSupabaseFalso({ rpc: () => ({ error: { code: 'XX000', message: 'detalle interno con IE INEM' } }) });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).guardar(null, DATOS, ADMIN)).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible guardar la Institución Educativa.' });
    expect(consola).toHaveBeenCalledWith('[instituciones] guardar_institucion falló', 'XX000');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('IE INEM');
  });

  it('un error al consultar responde FALLO', async () => {
    const falso = crearSupabaseFalso({ tablas: { instituciones_educativas: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoInstitucionesSupabase(falso.cliente).listar()).rejects.toMatchObject({ codigo: 'FALLO', message: 'No fue posible consultar las Instituciones Educativas.' });
  });
});
```

Crear `tests/integration/institution-port-local.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { crearPuertoInstitucionesLocal } from '../../src/modules/admin/institutions/institution-port-local';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const original = process.env.LEXCON_DATABASE_URL;
let directorio = '';

afterEach(() => {
  closeDatabaseForTests();
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = '';
  if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original;
});

function prepararAdministrador(): CurrentUser {
  directorio = mkdtempSync(join(tmpdir(), 'lexcon-ie-'));
  process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
  migrate();
  const id = randomUUID();
  const ahora = new Date().toISOString();
  getSqlite().prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(id, 'admin@test.invalid', 'Admin', 'hash', ahora);
  getSqlite().prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, NULL, ?, 1, ?)').run(randomUUID(), id, 'ARKA_ADMIN', ahora);
  return { id, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
}

describe('puerto local de Instituciones Educativas (SQLite)', () => {
  it('crea, consulta y suspende una IE conservando la auditoría local', async () => {
    const admin = prepararAdministrador();
    const puerto = crearPuertoInstitucionesLocal();
    const datos = { nombre: 'IE Local', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE' as const, observacion: null };
    const id = await puerto.guardar(null, datos, admin);
    expect(await puerto.obtener(id)).toMatchObject({ id, nombre: 'IE Local', ciudad: 'Montería', departamento: null, estado: 'ACTIVE', activa: true, cuentasActivas: 0, procesos: 0 });
    expect(await puerto.guardar(id, { ...datos, estado: 'SUSPENDED_ARREARS', observacion: 'Mora' }, admin)).toBe(id);
    expect(await puerto.obtener(id)).toMatchObject({ estado: 'SUSPENDED_ARREARS', activa: false, observacion: 'Mora' });
    expect((await puerto.listar()).map((institucion) => institucion.id)).toContain(id);
    const acciones = (getSqlite().prepare('SELECT action FROM audit_events WHERE target_id = ?').all(id) as Array<{ action: string }>).map((fila) => fila.action).sort();
    expect(acciones).toEqual(['INSTITUTION_CREATED', 'INSTITUTION_SERVICE_SUSPENDED']);
  });

  it('obtener devuelve null si la IE no existe', async () => {
    prepararAdministrador();
    expect(await crearPuertoInstitucionesLocal().obtener(randomUUID())).toBeNull();
  });
});
```

- [ ] **Paso 3: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/institution-service.test.ts tests/unit/institution-port-supabase.test.ts tests/integration/institution-port-local.test.ts`
Esperado: FALLAN las tres con «Failed to resolve import» (los módulos de `src/modules/admin/institutions/` no existen).

- [ ] **Paso 4: implementar el servicio**

Crear `src/modules/admin/institutions/institution-service.ts`:

```ts
import type { CurrentUser } from '@/platform/auth/current-user';
import { hasCapability } from '@/modules/access/authorization';

export const estadosServicio = ['ACTIVE', 'SUSPENDED_ARREARS', 'ENDED'] as const;
export type EstadoServicio = typeof estadosServicio[number];

export type CodigoErrorInstitucion = 'NO_AUTORIZADO' | 'DATOS_INVALIDOS' | 'NO_ENCONTRADA' | 'DUPLICADA' | 'FALLO';

export class ErrorInstitucion extends Error {
  constructor(readonly codigo: CodigoErrorInstitucion, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorInstitucion';
  }
}

export interface InstitucionAdministrada {
  id: string;
  nombre: string;
  ciudad: string;
  /** null en modo local: la base SQLite de demostración no guarda departamento, NIT ni código DANE. */
  departamento: string | null;
  nit: string | null;
  codigoDane: string | null;
  estado: EstadoServicio;
  observacion: string | null;
  activa: boolean;
  creadaEn: string;
  /** Personas con asignación de rol activa en la IE. */
  cuentasActivas: number;
  procesos: number;
}

export interface DatosInstitucion {
  nombre: string;
  ciudad: string;
  departamento: string;
  nit: string | null;
  codigoDane: string | null;
  estado: EstadoServicio;
  observacion: string | null;
}

export interface EntradaInstitucion {
  nombre?: unknown;
  ciudad?: unknown;
  departamento?: unknown;
  nit?: unknown;
  codigoDane?: unknown;
  estado?: unknown;
  observacion?: unknown;
}

export interface PuertoInstituciones {
  listar(): Promise<InstitucionAdministrada[]>;
  obtener(id: string): Promise<InstitucionAdministrada | null>;
  /** Crea (id null) o actualiza la IE, su periodo de servicio y la auditoría; devuelve el identificador. */
  guardar(id: string | null, datos: DatosInstitucion, actor: CurrentUser): Promise<string>;
}

function exigirAdministrador(actor: CurrentUser): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new ErrorInstitucion('NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.');
  }
}

function invalido(mensaje: string): ErrorInstitucion {
  return new ErrorInstitucion('DATOS_INVALIDOS', mensaje);
}

function textoEntre(valor: unknown, minimo: number, maximo: number, mensaje: string): string {
  const limpio = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (limpio.length < minimo || limpio.length > maximo) throw invalido(mensaje);
  return limpio;
}

function opcional(valor: unknown, patron: RegExp, mensaje: string): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') throw invalido(mensaje);
  const limpio = valor.trim();
  if (!limpio) return null;
  if (!patron.test(limpio)) throw invalido(mensaje);
  return limpio;
}

/** Mismas reglas y mensajes que la administración local, más departamento, NIT y código DANE. */
export function validarDatosInstitucion(entrada: EntradaInstitucion): DatosInstitucion {
  const nombre = textoEntre(entrada.nombre, 3, 120, 'El nombre de la Institución Educativa debe tener entre 3 y 120 caracteres.');
  const ciudad = textoEntre(entrada.ciudad, 2, 100, 'La ciudad o municipio debe tener entre 2 y 100 caracteres.');
  const departamento = textoEntre(entrada.departamento, 2, 100, 'El departamento debe tener entre 2 y 100 caracteres.');
  const nit = opcional(entrada.nit, /^[0-9][0-9.-]{4,19}$/, 'El NIT solo admite números, puntos y guion (entre 5 y 20 caracteres).');
  const codigoDane = opcional(entrada.codigoDane, /^\d{5,15}$/, 'El código DANE solo admite números (entre 5 y 15 dígitos).');
  if (typeof entrada.estado !== 'string' || !(estadosServicio as readonly string[]).includes(entrada.estado)) throw invalido('Selecciona un estado de servicio válido.');
  const observacion = typeof entrada.observacion === 'string' ? entrada.observacion.trim() : '';
  if (observacion.length > 500) throw invalido('La observación administrativa no puede superar 500 caracteres.');
  return { nombre, ciudad, departamento, nit, codigoDane, estado: entrada.estado as EstadoServicio, observacion: observacion || null };
}

export async function listarInstituciones(puerto: PuertoInstituciones, actor: CurrentUser): Promise<InstitucionAdministrada[]> {
  exigirAdministrador(actor);
  return puerto.listar();
}

export async function obtenerInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, id: unknown): Promise<InstitucionAdministrada | null> {
  exigirAdministrador(actor);
  if (typeof id !== 'string' || !id.trim()) return null;
  return puerto.obtener(id.trim());
}

export async function crearInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, entrada: EntradaInstitucion): Promise<string> {
  exigirAdministrador(actor);
  return puerto.guardar(null, validarDatosInstitucion(entrada), actor);
}

export async function actualizarInstitucion(puerto: PuertoInstituciones, actor: CurrentUser, id: unknown, entrada: EntradaInstitucion): Promise<string> {
  exigirAdministrador(actor);
  if (typeof id !== 'string' || !id.trim()) throw invalido('Selecciona una Institución Educativa.');
  const datos = validarDatosInstitucion(entrada);
  if (!(await puerto.obtener(id.trim()))) throw new ErrorInstitucion('NO_ENCONTRADA', 'La Institución Educativa no existe.');
  return puerto.guardar(id.trim(), datos, actor);
}
```

- [ ] **Paso 5: implementar el adaptador Supabase**

Crear `src/modules/admin/institutions/institution-port-supabase.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorInstitucion, type EstadoServicio, type InstitucionAdministrada, type PuertoInstituciones } from './institution-service';

type EstadoBase = 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO';

const ESTADO_A_BASE: Record<EstadoServicio, EstadoBase> = { ACTIVE: 'ACTIVO', SUSPENDED_ARREARS: 'SUSPENDIDO', ENDED: 'FINALIZADO' };
const BASE_A_ESTADO: Record<EstadoBase, EstadoServicio> = { ACTIVO: 'ACTIVE', SUSPENDIDO: 'SUSPENDED_ARREARS', FINALIZADO: 'ENDED' };
const COLUMNAS = 'id,nombre,ciudad,departamento,nit,codigo_dane,estado_servicio,observacion_servicio,activo,creado_en';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAJE_CONSULTA = 'No fue posible consultar las Instituciones Educativas.';
const MENSAJE_GUARDADO = 'No fue posible guardar la Institución Educativa.';

interface FilaInstitucion {
  id: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  nit: string | null;
  codigo_dane: string | null;
  estado_servicio: EstadoBase;
  observacion_servicio: string | null;
  activo: boolean;
  creado_en: string;
}

interface Conteos { cuentas: Map<string, number>; procesos: Map<string, number> }

/** Cuentas (personas distintas con asignación activa) y procesos por IE. Se cuentan en la aplicación: escala del piloto. */
async function contar(supabase: SupabaseClient, ids: string[]): Promise<Conteos> {
  if (!ids.length) return { cuentas: new Map(), procesos: new Map() };
  const [asignaciones, procesos] = await Promise.all([
    supabase.from('asignaciones_roles_usuario').select('id_usuario,id_institucion').eq('activa', true).in('id_institucion', ids),
    supabase.from('procesos_contratacion').select('id_institucion').in('id_institucion', ids),
  ]);
  if (asignaciones.error || procesos.error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
  const personas = new Map<string, Set<string>>();
  for (const fila of (asignaciones.data ?? []) as unknown as Array<{ id_usuario: string; id_institucion: string }>) {
    const conjunto = personas.get(fila.id_institucion) ?? new Set<string>();
    conjunto.add(fila.id_usuario);
    personas.set(fila.id_institucion, conjunto);
  }
  const totalProcesos = new Map<string, number>();
  for (const fila of (procesos.data ?? []) as unknown as Array<{ id_institucion: string }>) {
    totalProcesos.set(fila.id_institucion, (totalProcesos.get(fila.id_institucion) ?? 0) + 1);
  }
  return { cuentas: new Map([...personas].map(([id, conjunto]) => [id, conjunto.size])), procesos: totalProcesos };
}

function mapear(fila: FilaInstitucion, conteos: Conteos): InstitucionAdministrada {
  return {
    id: fila.id,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    departamento: fila.departamento,
    nit: fila.nit,
    codigoDane: fila.codigo_dane,
    estado: BASE_A_ESTADO[fila.estado_servicio] ?? 'ENDED',
    observacion: fila.observacion_servicio,
    activa: fila.activo,
    creadaEn: fila.creado_en,
    cuentasActivas: conteos.cuentas.get(fila.id) ?? 0,
    procesos: conteos.procesos.get(fila.id) ?? 0,
  };
}

/** Traduce los errores de guardar_institucion; solo se registra el código, nunca el mensaje del proveedor. */
function errorDeGuardado(error: { code?: string; message?: string }): ErrorInstitucion {
  const mensaje = error.message ?? '';
  if (error.code === '23505') {
    if (mensaje.includes('_codigo_dane_key')) return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese código DANE.');
    if (mensaje.includes('_nit_key')) return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.');
    return new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con esos datos.');
  }
  if (error.code === '42501') return new ErrorInstitucion('NO_AUTORIZADO', 'No tienes autorización para administrar el servicio.');
  if (error.code === 'P0002') return new ErrorInstitucion('NO_ENCONTRADA', 'La Institución Educativa no existe.');
  if (error.code === '22023') return new ErrorInstitucion('DATOS_INVALIDOS', 'Los datos de la Institución Educativa no son válidos.');
  console.error('[instituciones] guardar_institucion falló', error.code || 'sin-código');
  return new ErrorInstitucion('FALLO', MENSAJE_GUARDADO);
}

/** Adaptador delgado: las reglas están en institution-service.ts y la atomicidad en guardar_institucion. */
export function crearPuertoInstitucionesSupabase(supabase: SupabaseClient): PuertoInstituciones {
  return {
    async listar() {
      const { data, error } = await supabase.from('instituciones_educativas').select(COLUMNAS).order('activo', { ascending: false }).order('nombre');
      if (error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
      const filas = (data ?? []) as unknown as FilaInstitucion[];
      const conteos = await contar(supabase, filas.map((fila) => fila.id));
      return filas.map((fila) => mapear(fila, conteos));
    },
    async obtener(id) {
      // Un identificador que no es UUID haría fallar a PostgREST (22P02): para la pantalla es una IE inexistente.
      if (!UUID.test(id)) return null;
      const { data, error } = await supabase.from('instituciones_educativas').select(COLUMNAS).eq('id', id).maybeSingle();
      if (error) throw new ErrorInstitucion('FALLO', MENSAJE_CONSULTA);
      if (!data) return null;
      const fila = data as unknown as FilaInstitucion;
      return mapear(fila, await contar(supabase, [fila.id]));
    },
    async guardar(id, datos, actor) {
      const { data, error } = await supabase.rpc('guardar_institucion', {
        p_id_actor: actor.id,
        p_id: id,
        p_nombre: datos.nombre,
        p_ciudad: datos.ciudad,
        p_departamento: datos.departamento,
        p_nit: datos.nit,
        p_codigo_dane: datos.codigoDane,
        p_estado: ESTADO_A_BASE[datos.estado],
        p_observacion: datos.observacion,
      });
      if (error) throw errorDeGuardado(error);
      if (typeof data !== 'string') throw new ErrorInstitucion('FALLO', MENSAJE_GUARDADO);
      return data;
    },
  };
}
```

- [ ] **Paso 6: implementar el adaptador local y el selector**

En `src/modules/admin/service-administration.ts`, reemplazar:

```ts
export function createInstitution(actor: CurrentUser, input: { name: string; city: string; serviceStatus: string; serviceNote?: string }): void {
```

por:

```ts
export function createInstitution(actor: CurrentUser, input: { name: string; city: string; serviceStatus: string; serviceNote?: string }): string {
```

y, dentro de esa función, reemplazar `  addAudit(actor, 'INSTITUTION_CREATED', 'institution', id);` por:

```ts
  addAudit(actor, 'INSTITUTION_CREATED', 'institution', id);
  return id;
```

Crear `src/modules/admin/institutions/institution-port-local.ts`:

```ts
import { createInstitution, getManagedInstitution, listManagedInstitutions, updateInstitution, type ManagedInstitution } from '@/modules/admin/service-administration';
import type { DatosInstitucion, InstitucionAdministrada, PuertoInstituciones } from './institution-service';

function mapear(fila: ManagedInstitution): InstitucionAdministrada {
  return {
    id: fila.id,
    nombre: fila.name,
    ciudad: fila.city,
    departamento: null,
    nit: null,
    codigoDane: null,
    estado: fila.serviceStatus,
    observacion: fila.serviceNote,
    activa: Boolean(fila.active),
    creadaEn: fila.createdAt,
    cuentasActivas: Number(fila.users),
    procesos: Number(fila.processes),
  };
}

function entradaLocal(datos: DatosInstitucion) {
  return { name: datos.nombre, city: datos.ciudad, serviceStatus: datos.estado, serviceNote: datos.observacion ?? undefined };
}

/** Demostración local: usa la administración SQLite existente; no guarda departamento, NIT ni código DANE. */
export function crearPuertoInstitucionesLocal(): PuertoInstituciones {
  return {
    async listar() {
      return listManagedInstitutions().map(mapear);
    },
    async obtener(id) {
      const fila = getManagedInstitution(id);
      return fila ? mapear(fila) : null;
    },
    async guardar(id, datos, actor) {
      if (id === null) return createInstitution(actor, entradaLocal(datos));
      updateInstitution(actor, { id, ...entradaLocal(datos) });
      return id;
    },
  };
}
```

Crear `src/modules/admin/institutions/institution-runtime.ts`:

```ts
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearPuertoInstitucionesLocal } from './institution-port-local';
import { crearPuertoInstitucionesSupabase } from './institution-port-supabase';
import type { PuertoInstituciones } from './institution-service';

/** Supabase cuando está configurado (producción); SQLite en la demostración local. */
export function puertoInstituciones(): PuertoInstituciones {
  return supabaseConfigurado() ? crearPuertoInstitucionesSupabase(crearClienteSupabaseServidor()) : crearPuertoInstitucionesLocal();
}
```

- [ ] **Paso 7: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/institution-service.test.ts tests/unit/institution-port-supabase.test.ts tests/integration/institution-port-local.test.ts` y `corepack pnpm typecheck`
Esperado: PASAN todas (14 del servicio, 11 del adaptador, 2 de integración); `tsc` sin errores.

- [ ] **Paso 8: sin confirmación**

Se confirma en la Tarea 8.

---

### Task 7: Ruta `/api/admin/institutions` con departamento, NIT y código DANE

**Archivos**
- Modificar (reescribir): `src/app/api/admin/institutions/route.ts`
- Probar: `tests/unit/admin-institutions-route.test.ts`

Antes de escribir, lea `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.

- [ ] **Paso 1: escribir la prueba que falla**

Crear `tests/unit/admin-institutions-route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { PuertoInstituciones } from '../../src/modules/admin/institutions/institution-service';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  puerto: { listar: vi.fn(), obtener: vi.fn(), guardar: vi.fn() } satisfies Record<keyof PuertoInstituciones, unknown>,
}));

vi.mock('@/platform/auth/current-user', () => ({ currentUser: () => mocks.currentUser() }));
vi.mock('@/modules/admin/institutions/institution-runtime', () => ({ puertoInstituciones: () => mocks.puerto }));
// El código anterior a esta tarea usaba SQLite: la prueba que falla nunca debe escribir en data/lexcon.sqlite.
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse en esta prueba.'); } }));

import * as ruta from '../../src/app/api/admin/institutions/route';
import { ErrorInstitucion } from '../../src/modules/admin/institutions/institution-service';

const ADMIN = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const CUERPO = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: '', codigoDane: '', estado: 'ACTIVE', observacion: '' };
const DATOS = { nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null };
const EXISTENTE = { id: 'ie-1', nombre: 'IE INEM', ciudad: 'Montería', departamento: 'Córdoba', nit: null, codigoDane: null, estado: 'ACTIVE', observacion: null, activa: true, creadaEn: '2026-10-01T00:00:00.000Z', cuentasActivas: 0, procesos: 0 };

function solicitud(metodo: 'POST' | 'PATCH', cuerpo: unknown, crudo?: string): Request {
  return new Request('http://localhost/api/admin/institutions', { method: metodo, headers: { 'content-type': 'application/json' }, body: crudo ?? JSON.stringify(cuerpo) });
}

describe('/api/admin/institutions', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.currentUser.mockReset();
    mocks.currentUser.mockResolvedValue(ADMIN);
    for (const funcion of Object.values(mocks.puerto)) funcion.mockReset();
    mocks.puerto.obtener.mockResolvedValue(EXISTENTE);
    mocks.puerto.guardar.mockImplementation(async (id: string | null) => id ?? 'ie-nueva');
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('ya no ofrece DELETE: el servicio se finaliza editando el estado', () => {
    expect('DELETE' in ruta).toBe(false);
  });

  it.each([null, { ...ADMIN, role: 'ARKA_ATTORNEY' }])('responde 403 sin Administrador (%o)', async (usuario) => {
    mocks.currentUser.mockResolvedValue(usuario);
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it.each(['no es json', 'null', '[]', '7'])('responde 400 si el cuerpo no es un objeto JSON (%s)', async (crudo) => {
    const respuesta = await ruta.POST(solicitud('POST', null, crudo));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'La solicitud no es válida.' });
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it('POST crea la IE y responde 201 con su identificador', async () => {
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(201);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(await respuesta.json()).toEqual({ ok: true, id: 'ie-nueva' });
    expect(mocks.puerto.guardar).toHaveBeenCalledWith(null, DATOS, ADMIN);
  });

  it('POST con datos inválidos responde 400 con el mensaje del servicio', async () => {
    const respuesta = await ruta.POST(solicitud('POST', { ...CUERPO, departamento: '' }));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'El departamento debe tener entre 2 y 100 caracteres.' });
  });

  it('un NIT duplicado responde 409 con un mensaje claro', async () => {
    mocks.puerto.guardar.mockRejectedValue(new ErrorInstitucion('DUPLICADA', 'Ya existe una Institución Educativa con ese NIT.'));
    const respuesta = await ruta.POST(solicitud('POST', { ...CUERPO, nit: '800123456-7' }));
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: 'Ya existe una Institución Educativa con ese NIT.' });
  });

  it('PATCH responde 404 si la IE no existe', async () => {
    mocks.puerto.obtener.mockResolvedValue(null);
    const respuesta = await ruta.PATCH(solicitud('PATCH', { ...CUERPO, id: 'ie-9' }));
    expect(respuesta.status).toBe(404);
    expect(mocks.puerto.guardar).not.toHaveBeenCalled();
  });

  it('PATCH actualiza y responde 200', async () => {
    const respuesta = await ruta.PATCH(solicitud('PATCH', { ...CUERPO, id: 'ie-1', estado: 'SUSPENDED_ARREARS' }));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, id: 'ie-1' });
    expect(mocks.puerto.guardar).toHaveBeenCalledWith('ie-1', { ...DATOS, estado: 'SUSPENDED_ARREARS' }, ADMIN);
  });

  it('un error inesperado responde 500 genérico y registra solo el tipo', async () => {
    mocks.puerto.guardar.mockRejectedValue(new TypeError('detalle con datos'));
    const respuesta = await ruta.POST(solicitud('POST', CUERPO));
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: 'No fue posible guardar la Institución Educativa.' });
    expect(consola).toHaveBeenCalledWith('[instituciones] fallo inesperado', 'TypeError');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('detalle');
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/admin-institutions-route.test.ts`
Esperado: FALLA: `DELETE` sigue exportado; el POST actual lee `name`/`city`, llama a SQLite (la simulación lanza) y responde 400 en lugar de 201; los 403 no llevan `Cache-Control`.

- [ ] **Paso 3: implementar**

Reemplazar todo el contenido de `src/app/api/admin/institutions/route.ts` por:

```ts
import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { actualizarInstitucion, crearInstitucion, ErrorInstitucion, type CodigoErrorInstitucion, type EntradaInstitucion } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';

export const dynamic = 'force-dynamic';

const MAXIMO_CUERPO = 10_000;
const ESTADO_HTTP: Record<CodigoErrorInstitucion, number> = { NO_AUTORIZADO: 403, DATOS_INVALIDOS: 400, NO_ENCONTRADA: 404, DUPLICADA: 409, FALLO: 500 };

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

async function leerCuerpo(solicitud: Request): Promise<Record<string, unknown> | null> {
  let texto: string;
  try { texto = await solicitud.text(); } catch { return null; }
  if (texto.length > MAXIMO_CUERPO) return null;
  let valor: unknown;
  try { valor = JSON.parse(texto); } catch { return null; }
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function entrada(cuerpo: Record<string, unknown>): EntradaInstitucion {
  return { nombre: cuerpo.nombre, ciudad: cuerpo.ciudad, departamento: cuerpo.departamento, nit: cuerpo.nit, codigoDane: cuerpo.codigoDane, estado: cuerpo.estado, observacion: cuerpo.observacion };
}

function responderError(error: unknown): NextResponse {
  if (error instanceof ErrorInstitucion) return responder({ error: error.message }, ESTADO_HTTP[error.codigo]);
  // Diagnóstico sin datos de la solicitud ni texto del proveedor: etiqueta fija y tipo de error.
  console.error('[instituciones] fallo inesperado', error instanceof Error ? error.name : typeof error);
  return responder({ error: 'No fue posible guardar la Institución Educativa.' }, 500);
}

export async function POST(solicitud: Request) {
  try {
    const usuario = await currentUser();
    if (!usuario || usuario.role !== 'ARKA_ADMIN') return responder({ error: 'No autorizado.' }, 403);
    const cuerpo = await leerCuerpo(solicitud);
    if (!cuerpo) return responder({ error: 'La solicitud no es válida.' }, 400);
    const id = await crearInstitucion(puertoInstituciones(), usuario, entrada(cuerpo));
    return responder({ ok: true, id }, 201);
  } catch (error) {
    return responderError(error);
  }
}

export async function PATCH(solicitud: Request) {
  try {
    const usuario = await currentUser();
    if (!usuario || usuario.role !== 'ARKA_ADMIN') return responder({ error: 'No autorizado.' }, 403);
    const cuerpo = await leerCuerpo(solicitud);
    if (!cuerpo) return responder({ error: 'La solicitud no es válida.' }, 400);
    const id = await actualizarInstitucion(puertoInstituciones(), usuario, cuerpo.id, entrada(cuerpo));
    return responder({ ok: true, id }, 200);
  } catch (error) {
    return responderError(error);
  }
}
```

El `DELETE` anterior desaparece a propósito: ninguna pantalla lo usaba después de esta migración (finalizar el servicio es elegir «Servicio finalizado» al editar), y la guarda `rutaNoDisponible('INSTITUCIONES')` de la Parte 0 ya no es necesaria.

- [ ] **Paso 4: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/admin-institutions-route.test.ts`
Esperado: PASA (13 casos). Nota: desde aquí y hasta el paso 5 de la Tarea 8, `tests/unit/funciones-coherencia.test.ts` falla a propósito («cada manejador de las rutas no disponibles responde 501»): la ruta ya no tiene guarda pero `INSTITUCIONES` todavía figura como no disponible. La Tarea 8 lo resuelve antes de confirmar.

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 8.

---

### Task 8: Pantallas de Instituciones Educativas, habilitación y confirmación de A1

**Archivos**
- Modificar (reescribir): `src/app/dashboard/admin/institution-management.tsx`, `src/app/dashboard/admin/institution-directory.tsx`, `src/app/dashboard/admin/institutions/page.tsx`, `src/app/dashboard/admin/institutions/new/page.tsx`, `src/app/dashboard/admin/institutions/[institutionId]/page.tsx`
- Modificar: `src/platform/features.ts`, `docs/current-state.md`
- Probar: `tests/unit/funciones-coherencia.test.ts` (existente) y `tests/unit/features.test.ts` (existente)

Antes de escribir, lea `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.

- [ ] **Paso 1: marcar la función como disponible (la prueba de coherencia pasa a fallar)**

En `src/platform/features.ts`, reemplazar el bloque:

```ts
  INSTITUCIONES: {
    etiqueta: 'Instituciones Educativas',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/institutions/page.tsx', 'app/dashboard/admin/institutions/new/page.tsx', 'app/dashboard/admin/institutions/[institutionId]/page.tsx'],
    api: ['app/api/admin/institutions/route.ts'],
    menu: ['/dashboard/admin/institutions', '/dashboard/admin/institutions/new'],
    modulos: ['modules/admin/service-administration.ts'],
  },
```

por:

```ts
  INSTITUCIONES: {
    etiqueta: 'Instituciones Educativas',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/institutions/page.tsx', 'app/dashboard/admin/institutions/new/page.tsx', 'app/dashboard/admin/institutions/[institutionId]/page.tsx'],
    api: ['app/api/admin/institutions/route.ts'],
    menu: ['/dashboard/admin/institutions', '/dashboard/admin/institutions/new'],
    modulos: ['modules/admin/institutions/institution-runtime.ts', 'modules/admin/institutions/institution-port-supabase.ts'],
  },
```

- [ ] **Paso 2: ejecutar y comprobar que falla**

Ejecutar: `corepack pnpm exec vitest run tests/unit/funciones-coherencia.test.ts`
Esperado: FALLA «las funciones disponibles tienen rama Supabase...»: las tres páginas de instituciones aún dependen de `service-administration.ts` (SQLite) y conservan `exigirFuncion(`.

- [ ] **Paso 3: reescribir el formulario (componente cliente)**

Reemplazar todo `src/app/dashboard/admin/institution-management.tsx` por:

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitucionAdministrada } from '@/modules/admin/institutions/institution-service';

/** Registro (sin `institucion`) o edición de una Institución Educativa. */
export function InstitutionManagement({ institucion }: { institucion?: InstitucionAdministrada }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const editando = Boolean(institucion);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/institutions', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: institucion?.id,
          nombre: data.get('nombre'),
          ciudad: data.get('ciudad'),
          departamento: data.get('departamento'),
          nit: data.get('nit'),
          codigoDane: data.get('codigoDane'),
          estado: data.get('estado'),
          observacion: data.get('observacion'),
        }),
      });
      const body = await response.json() as { error?: string; id?: string };
      if (!response.ok) { setMessage(body.error ?? 'No fue posible completar la acción.'); return; }
      if (editando) { setMessage('Institución Educativa actualizada.'); router.refresh(); return; }
      router.push(`/dashboard/admin/institutions/${body.id}`);
    } catch {
      setMessage('No fue posible conectar con LEXCON. Intente de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="management-layout create-only"><section className="surface management-form">
    <p className="section-kicker">{editando ? 'Editar institución' : 'Nueva institución'}</p>
    <h2>{institucion ? institucion.nombre : 'Registrar Institución Educativa'}</h2>
    <p>Registre la IE, su ubicación, sus códigos de identificación y su estado de servicio.</p>
    <form onSubmit={submit}>
      <label>Nombre de la IE<input required name="nombre" minLength={3} maxLength={120} defaultValue={institucion?.nombre ?? ''} /></label>
      <label>Ciudad o municipio<input required name="ciudad" minLength={2} maxLength={100} defaultValue={institucion?.ciudad ?? ''} placeholder="Ej.: Montería" /></label>
      <label>Departamento<input required name="departamento" minLength={2} maxLength={100} defaultValue={institucion?.departamento ?? ''} placeholder="Ej.: Córdoba" /></label>
      <label>NIT (opcional)<input name="nit" maxLength={20} inputMode="numeric" defaultValue={institucion?.nit ?? ''} placeholder="Ej.: 800123456-7" /></label>
      <label>Código DANE (opcional)<input name="codigoDane" maxLength={15} inputMode="numeric" defaultValue={institucion?.codigoDane ?? ''} /></label>
      <label>Estado del servicio<select name="estado" defaultValue={institucion?.estado ?? 'ACTIVE'}><option value="ACTIVE">Servicio activo</option><option value="SUSPENDED_ARREARS">Suspendida por mora</option><option value="ENDED">Servicio finalizado</option></select></label>
      <label>Observación administrativa<textarea name="observacion" maxLength={500} defaultValue={institucion?.observacion ?? ''} placeholder="Motivo o referencia administrativa" /></label>
      <div className="management-buttons"><button className="primary-button" disabled={busy}>{busy ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar IE'}</button></div>
    </form>
    {message && <p className="form-message" role="status">{message}</p>}
  </section></div>;
}
```

- [ ] **Paso 4: reescribir el directorio y las tres páginas**

Reemplazar todo `src/app/dashboard/admin/institution-directory.tsx` por:

```tsx
import Link from 'next/link';
import type { InstitucionAdministrada } from '@/modules/admin/institutions/institution-service';

const status: Record<string, string> = { ACTIVE: 'Servicio activo', SUSPENDED_ARREARS: 'Suspendida por mora', ENDED: 'Servicio finalizado' };

export function InstitutionDirectory({ institutions }: { institutions: InstitucionAdministrada[] }) {
  return <section className="institution-directory"><div className="directory-heading"><div><p className="section-kicker">Directorio institucional</p><h2>Seleccione una Institución Educativa</h2><p>Abra su ficha para consultar servicio, personas habilitadas y procesos.</p></div><Link className="primary-button" href="/dashboard/admin/institutions/new">Registrar Institución <span aria-hidden="true">→</span></Link></div>{institutions.length ? <div className="institution-card-grid">{institutions.map((institution) => <Link className={`institution-card ${institution.estado.toLowerCase()}`} href={`/dashboard/admin/institutions/${institution.id}`} key={institution.id}><span className="institution-card-icon" aria-hidden="true">⌂</span><div><strong>{institution.nombre}</strong><span className="institution-card-status">{status[institution.estado]}</span><small>{institution.departamento ? `${institution.ciudad}, ${institution.departamento}` : institution.ciudad}</small><small>{institution.cuentasActivas} cuentas activas · {institution.procesos} procesos</small></div><b aria-hidden="true">→</b></Link>)}</div> : <div className="empty-state"><strong>Aún no hay Instituciones Educativas registradas.</strong></div>}</section>;
}
```

Reemplazar todo `src/app/dashboard/admin/institutions/page.tsx` por:

```tsx
import { listarInstituciones } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { InstitutionDirectory } from '../institution-directory';

export default async function InstitutionsPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const instituciones = await listarInstituciones(puertoInstituciones(), user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de servicio</p><h1>Instituciones Educativas</h1><p>Consulte cada Institución Educativa contratante y abra su ficha de servicio.</p></div></header><InstitutionDirectory institutions={instituciones} /></div></WorkspaceShell>;
}
```

Reemplazar todo `src/app/dashboard/admin/institutions/new/page.tsx` por:

```tsx
import { WorkspaceShell } from '../../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { InstitutionManagement } from '../../institution-management';

export default async function NewInstitutionPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions/new"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de servicio</p><h1>Registrar Institución Educativa</h1><p>Registre la IE contratante, su relación de servicio y el estado inicial.</p></div></header><InstitutionManagement /></div></WorkspaceShell>;
}
```

Reemplazar todo `src/app/dashboard/admin/institutions/[institutionId]/page.tsx` por:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerInstitucion } from '@/modules/admin/institutions/institution-service';
import { puertoInstituciones } from '@/modules/admin/institutions/institution-runtime';
import { listProcessesFor } from '@/modules/processes/process-queries';
import { processConsecutive, processContractType } from '@/modules/processes/process-presentation';
import { WorkspaceShell } from '../../../_components/workspace-shell';
import { phaseLabel, ProcessStatus } from '../../../_components/process-status';
import { requireWorkspaceUser } from '../../../require-workspace-user';
import { InstitutionManagement } from '../../institution-management';

const status: Record<string, string> = { ACTIVE: 'Servicio activo', SUSPENDED_ARREARS: 'Suspendida por mora', ENDED: 'Servicio finalizado' };

export default async function InstitutionDetailPage({ params }: { params: Promise<{ institutionId: string }> }) {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const institution = await obtenerInstitucion(puertoInstituciones(), user, (await params).institutionId);
  if (!institution) notFound();
  const processes = (await listProcessesFor(user)).filter((process) => process.institutionId === institution.id);
  const ubicacion = institution.departamento ? `${institution.ciudad}, ${institution.departamento}` : institution.ciudad;
  const codigos = [institution.nit ? `NIT ${institution.nit}` : null, institution.codigoDane ? `Código DANE ${institution.codigoDane}` : null].filter((valor): valor is string => valor !== null).join(' · ');

  return <WorkspaceShell user={user} activePath="/dashboard/admin/institutions"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Ficha de Institución Educativa</p><h1>{institution.nombre}</h1><p>Información de servicio y procesos de contratación de la Institución Educativa.</p></div></header>
    <section className="institution-detail"><div className="detail-status"><span className={`service-state ${institution.estado.toLowerCase()}`}>{status[institution.estado]}</span><strong>{institution.activa ? 'Acceso institucional habilitado' : 'Acceso institucional no habilitado'}</strong><small>{ubicacion}</small><small>{codigos || 'NIT y código DANE sin registrar.'}</small><small>{institution.observacion ?? 'Sin observación administrativa registrada.'}</small></div><div className="detail-count"><strong>{institution.cuentasActivas}</strong><span>Cuentas activas de la IE</span></div><div className="detail-count"><strong>{institution.procesos}</strong><span>Procesos registrados</span></div><Link className="detail-back" href="/dashboard/admin/processes">← Procesos por Institución Educativa</Link></section>
    <section className="attorney-process-directory admin-institution-processes" aria-labelledby="institution-processes-title"><div className="section-heading"><div><p className="section-kicker">Procesos de contratación</p><h2 id="institution-processes-title">Procesos de {institution.nombre}</h2></div><span>{processes.length} {processes.length === 1 ? 'proceso' : 'procesos'}</span></div>{processes.length ? <ul>{processes.map((process) => <li key={process.id}><Link href={`/dashboard/processes/${process.id}`}><span className="attorney-process-icon" aria-hidden="true">▤</span><div className="process-identity"><strong>Proceso No. {processConsecutive(process)}</strong><span>{processContractType(process.objectDescription)}</span><small>{phaseLabel(process.phase)} · Creado el {new Date(process.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</small></div><ProcessStatus status={process.status} /><b aria-hidden="true">→</b></Link></li>)}</ul> : <div className="empty-state"><strong>Esta Institución Educativa no tiene procesos registrados.</strong></div>}</section>
    <InstitutionManagement institucion={institution} />
  </div></WorkspaceShell>;
}
```

- [ ] **Paso 5: ejecutar y comprobar que pasa**

Ejecutar: `corepack pnpm exec vitest run tests/unit/funciones-coherencia.test.ts tests/unit/features.test.ts tests/unit/navigation.test.ts`
Esperado: PASAN. Con Supabase simulado, el menú del Administrador ya muestra «Instituciones Educativas» con el rótulo de sección.

- [ ] **Paso 6: documentar**

En `docs/current-state.md`, reemplazar `impide que una pantalla o ruta nueva que dependa de SQLite quede fuera de la tabla.` por esa misma frase seguida de:

```markdown
- **Instituciones Educativas (A1):** listado, ficha, registro y edición funcionan con Supabase mediante `src/modules/admin/institutions/` (servicio, puerto, adaptadores Supabase y SQLite, y `institution-runtime.ts`). El formulario pide departamento y admite NIT y código DANE opcionales y únicos (un duplicado responde 409 con un mensaje claro). La ficha de la IE incluye el formulario de edición; finalizar el servicio es elegir «Servicio finalizado» y ya no existe `DELETE /api/admin/institutions`. Cada cambio de estado cierra el periodo de servicio vigente y abre uno nuevo en `periodos_servicio_ie` y deja un evento `INSTITUCION_*` en `eventos_auditoria`, todo dentro de `guardar_institucion` (migración `20261015120000_administracion_instituciones_y_eventos.sql`, **pendiente de aplicar** en el proyecto remoto). En modo local el departamento, el NIT y el código DANE no se guardan (la base SQLite de demostración no tiene esas columnas).
```

- [ ] **Paso 7: verificación del grupo**

Ejecutar: `corepack pnpm typecheck` y `corepack pnpm exec vitest run`
Esperado: sin errores; todas las pruebas pasan.

- [ ] **Paso 8: Commit (solo con autorización explícita)**

```bash
git add supabase/migrations/20261015120000_administracion_instituciones_y_eventos.sql \
  src/modules/admin/institutions/institution-service.ts src/modules/admin/institutions/institution-port-supabase.ts \
  src/modules/admin/institutions/institution-port-local.ts src/modules/admin/institutions/institution-runtime.ts \
  src/modules/admin/service-administration.ts src/app/api/admin/institutions/route.ts \
  src/app/dashboard/admin/institution-management.tsx src/app/dashboard/admin/institution-directory.tsx \
  src/app/dashboard/admin/institutions/page.tsx src/app/dashboard/admin/institutions/new/page.tsx "src/app/dashboard/admin/institutions/[institutionId]/page.tsx" \
  src/platform/features.ts \
  tests/unit/helpers/supabase-falso.ts tests/unit/migracion-administracion.test.ts tests/unit/institution-service.test.ts \
  tests/unit/institution-port-supabase.test.ts tests/integration/institution-port-local.test.ts tests/unit/admin-institutions-route.test.ts \
  docs/current-state.md
git commit -m "feat: administrar las Instituciones Educativas sobre Supabase" \
  -m "Servicio con puerto y adaptadores Supabase y SQLite. guardar_institucion crea o actualiza la IE, cierra y abre su periodo de servicio y registra la auditoría con registrar_evento_administrativo en una sola transacción. El formulario gana departamento, NIT y código DANE, y la ficha permite editar. La migración queda pendiente de aplicar." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

---

## Grupo 3 · A2: abogados y cuentas en Usuarios y accesos

### Task 9: Módulo Equipo jurídico (solo lectura)

**Archivos**
- Crear: `src/modules/admin/legal-team/legal-team-service.ts`, `src/modules/admin/legal-team/legal-team-port-supabase.ts`, `src/modules/admin/legal-team/legal-team-port-local.ts`, `src/modules/admin/legal-team/legal-team-runtime.ts`
- Probar: `tests/unit/legal-team.test.ts`, `tests/integration/legal-team-port-local.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/legal-team.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { crearPuertoEquipoJuridicoSupabase } from '../../src/modules/admin/legal-team/legal-team-port-supabase';
import { listarEquipoJuridico, type PuertoEquipoJuridico } from '../../src/modules/admin/legal-team/legal-team-service';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };

describe('servicio de Equipo jurídico', () => {
  it('solo el Administrador lo consulta y se ordena por nombre', async () => {
    const puerto = {
      listarAbogadosActivos: vi.fn(async () => [
        { id: 'u-2', nombre: 'Zoila', correo: 'z@correo.com', procesosAsignados: 0 },
        { id: 'u-1', nombre: 'Álvaro', correo: 'a@correo.com', procesosAsignados: 2 },
      ]),
    } satisfies PuertoEquipoJuridico;
    await expect(listarEquipoJuridico(puerto, RECTOR)).rejects.toThrow('No tienes autorización para consultar el equipo jurídico.');
    expect(puerto.listarAbogadosActivos).not.toHaveBeenCalled();
    expect((await listarEquipoJuridico(puerto, ADMIN)).map((abogado) => abogado.nombre)).toEqual(['Álvaro', 'Zoila']);
  });
});

describe('adaptador Supabase de Equipo jurídico', () => {
  it('lista abogados con rol y perfil activos y cuenta sus procesos asignados', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        asignaciones_roles_usuario: () => ({ data: [{ id_usuario: 'u-1', roles: { codigo: 'ABOGADO_ARKA' } }, { id_usuario: 'u-2', roles: { codigo: 'ABOGADO_ARKA' } }, { id_usuario: 'u-1', roles: { codigo: 'ABOGADO_ARKA' } }] }),
        perfiles_usuario: () => ({ data: [{ id_usuario: 'u-1', nombre_mostrado: 'Laura', correo_electronico: 'laura@correo.com' }] }),
        responsables_proceso: () => ({ data: [{ id_usuario: 'u-1' }, { id_usuario: 'u-1' }] }),
      },
    });
    expect(await crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).toEqual([{ id: 'u-1', nombre: 'Laura', correo: 'laura@correo.com', procesosAsignados: 2 }]);
    const [asignaciones] = consultasDe(falso.consultas, 'asignaciones_roles_usuario');
    expect(operaciones(asignaciones, 'eq')).toEqual([['activa', true], ['roles.codigo', 'ABOGADO_ARKA']]);
    const [perfiles] = consultasDe(falso.consultas, 'perfiles_usuario');
    expect(operaciones(perfiles, 'eq')).toEqual([['activo', true]]);
    expect(operaciones(perfiles, 'in')).toEqual([['id_usuario', ['u-1', 'u-2']]]);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
  });

  it('sin abogados no hace más consultas', async () => {
    const falso = crearSupabaseFalso({ tablas: { asignaciones_roles_usuario: () => ({ data: [] }) } });
    expect(await crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).toEqual([]);
    expect(falso.consultas.map((consulta) => consulta.tabla)).toEqual(['asignaciones_roles_usuario']);
  });

  it('un error de consulta responde con un mensaje genérico', async () => {
    const falso = crearSupabaseFalso({ tablas: { asignaciones_roles_usuario: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).rejects.toThrow('No fue posible consultar el equipo jurídico.');
  });
});
```

Crear `tests/integration/legal-team-port-local.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { crearPuertoEquipoJuridicoLocal } from '../../src/modules/admin/legal-team/legal-team-port-local';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';

const original = process.env.LEXCON_DATABASE_URL;
let directorio = '';

afterEach(() => {
  closeDatabaseForTests();
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = '';
  if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original;
});

function preparar(): { activa: string } {
  directorio = mkdtempSync(join(tmpdir(), 'lexcon-equipo-'));
  process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
  migrate();
  const db = getSqlite();
  const ahora = new Date().toISOString();
  const ie = randomUUID(); const rector = randomUUID(); const activa = randomUUID(); const inactivo = randomUUID(); const proceso = randomUUID();
  db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(ie, 'IE A', ahora);
  const usuario = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
  usuario.run(rector, 'rector@test.invalid', 'Rector', 'hash', ahora);
  usuario.run(activa, 'activa@test.invalid', 'Abogada Activa', 'hash', ahora);
  usuario.run(inactivo, 'inactivo@test.invalid', 'Abogado Inactivo', 'hash', ahora);
  const membresia = db.prepare('INSERT INTO memberships (id, user_id, institution_id, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  membresia.run(randomUUID(), rector, ie, 'IE_RECTOR', 1, ahora);
  membresia.run(randomUUID(), activa, null, 'ARKA_ATTORNEY', 1, ahora);
  membresia.run(randomUUID(), inactivo, null, 'ARKA_ATTORNEY', 0, ahora);
  db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(proceso, ie, 'MARKET', 'RECEIVED', rector, ahora);
  db.prepare('INSERT INTO attorney_assignments (id, process_id, user_id, active, created_at) VALUES (?, ?, ?, 1, ?)').run(randomUUID(), proceso, activa, ahora);
  return { activa };
}

describe('puerto local de Equipo jurídico (SQLite)', () => {
  it('lista solo abogados activos con sus procesos asignados', async () => {
    const { activa } = preparar();
    expect(await crearPuertoEquipoJuridicoLocal().listarAbogadosActivos()).toEqual([{ id: activa, nombre: 'Abogada Activa', correo: 'activa@test.invalid', procesosAsignados: 1 }]);
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/legal-team.test.ts tests/integration/legal-team-port-local.test.ts`
Esperado: FALLAN con «Failed to resolve import» (`src/modules/admin/legal-team/` no existe).

- [ ] **Paso 3: implementar**

Crear `src/modules/admin/legal-team/legal-team-service.ts`:

```ts
import type { CurrentUser } from '@/platform/auth/current-user';
import { hasCapability } from '@/modules/access/authorization';

export interface AbogadoEquipo { id: string; nombre: string; correo: string; procesosAsignados: number }

export interface PuertoEquipoJuridico {
  /** Abogados con rol y perfil activos, con el número de procesos que tienen asignados. */
  listarAbogadosActivos(): Promise<AbogadoEquipo[]>;
}

/** Vista de solo lectura: invitar, corregir el correo o desactivar se hace en Usuarios y accesos. */
export async function listarEquipoJuridico(puerto: PuertoEquipoJuridico, actor: CurrentUser): Promise<AbogadoEquipo[]> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new Error('No tienes autorización para consultar el equipo jurídico.');
  }
  const abogados = await puerto.listarAbogadosActivos();
  return [...abogados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
```

Crear `src/modules/admin/legal-team/legal-team-port-supabase.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PuertoEquipoJuridico } from './legal-team-service';

const MENSAJE = 'No fue posible consultar el equipo jurídico.';

export function crearPuertoEquipoJuridicoSupabase(supabase: SupabaseClient): PuertoEquipoJuridico {
  return {
    async listarAbogadosActivos() {
      const { data: asignaciones, error } = await supabase.from('asignaciones_roles_usuario')
        .select('id_usuario,roles!inner(codigo)').eq('activa', true).eq('roles.codigo', 'ABOGADO_ARKA');
      if (error) throw new Error(MENSAJE);
      const ids = [...new Set(((asignaciones ?? []) as unknown as Array<{ id_usuario: string }>).map((fila) => fila.id_usuario))];
      if (!ids.length) return [];
      const [perfiles, responsables] = await Promise.all([
        supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado,correo_electronico').eq('activo', true).in('id_usuario', ids),
        supabase.from('responsables_proceso').select('id_usuario').eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true).in('id_usuario', ids),
      ]);
      if (perfiles.error || responsables.error) throw new Error(MENSAJE);
      const asignados = new Map<string, number>();
      for (const fila of (responsables.data ?? []) as unknown as Array<{ id_usuario: string }>) {
        asignados.set(fila.id_usuario, (asignados.get(fila.id_usuario) ?? 0) + 1);
      }
      return ((perfiles.data ?? []) as unknown as Array<{ id_usuario: string; nombre_mostrado: string; correo_electronico: string }>).map((perfil) => ({
        id: perfil.id_usuario,
        nombre: perfil.nombre_mostrado,
        correo: perfil.correo_electronico,
        procesosAsignados: asignados.get(perfil.id_usuario) ?? 0,
      }));
    },
  };
}
```

Crear `src/modules/admin/legal-team/legal-team-port-local.ts`:

```ts
import { getSqlite } from '@/platform/database/client';
import type { AbogadoEquipo, PuertoEquipoJuridico } from './legal-team-service';

/** Demostración local: abogados con usuario y membresía activos y sus asignaciones vigentes. */
export function crearPuertoEquipoJuridicoLocal(): PuertoEquipoJuridico {
  return {
    async listarAbogadosActivos() {
      return getSqlite().prepare(`SELECT u.id AS id, u.display_name AS nombre, u.email AS correo, COUNT(DISTINCT a.process_id) AS procesosAsignados
        FROM users u
        JOIN memberships m ON m.user_id = u.id AND m.role = 'ARKA_ATTORNEY' AND m.active = 1
        LEFT JOIN attorney_assignments a ON a.user_id = u.id AND a.active = 1
        WHERE u.active = 1
        GROUP BY u.id
        ORDER BY u.display_name`).all() as AbogadoEquipo[];
    },
  };
}
```

Crear `src/modules/admin/legal-team/legal-team-runtime.ts`:

```ts
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearPuertoEquipoJuridicoLocal } from './legal-team-port-local';
import { crearPuertoEquipoJuridicoSupabase } from './legal-team-port-supabase';
import type { PuertoEquipoJuridico } from './legal-team-service';

export function puertoEquipoJuridico(): PuertoEquipoJuridico {
  return supabaseConfigurado() ? crearPuertoEquipoJuridicoSupabase(crearClienteSupabaseServidor()) : crearPuertoEquipoJuridicoLocal();
}
```

- [ ] **Paso 4: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/legal-team.test.ts tests/integration/legal-team-port-local.test.ts`
Esperado: PASAN (5 pruebas).

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 10.

---

### Task 10: Retiro de abogados con contraseña y de Accesos, menú y Usuarios y accesos

**Archivos**
- Eliminar: `src/app/api/admin/attorneys/route.ts`, `src/app/api/admin/accesses/route.ts`, `src/modules/admin/access-management.ts`, `src/app/dashboard/admin/attorney-management.tsx`, `src/app/dashboard/admin/admin-accesses.tsx`
- Modificar (reescribir): `src/app/dashboard/admin/lawyers/page.tsx`, `src/app/dashboard/admin/lawyers/new/page.tsx`, `src/app/dashboard/admin/accesses/page.tsx`, `src/app/dashboard/admin/users/page.tsx`, `src/modules/admin/service-administration.ts`
- Modificar: `src/app/dashboard/_components/navigation.ts`, `src/platform/features.ts`, `src/modules/access/supabase-user-administration.ts`, `src/app/dashboard/admin/user-access-management.tsx`, `tests/integration/access-by-role.test.ts`, `tests/unit/navigation.test.ts`, `docs/current-state.md`
- Probar: `tests/unit/administracion-retirada.test.ts`, `tests/unit/rol-inicial.test.ts`

Menú final del Administrador después de esta tarea (con Supabase y en local):

| Sección | Opción | Destino |
| --- | --- | --- |
| OPERACIÓN CONTRACTUAL | Bandeja de trabajo | `/dashboard/admin` |
| | Procesos por IE | `/dashboard/admin/processes` |
| | Asignar responsable jurídico | `/dashboard/admin/assignments` (visible con Supabase desde la Tarea 11) |
| | Alertas y bloqueos | `/dashboard/admin/alerts` (visible con Supabase desde la Tarea 13) |
| ADMINISTRACIÓN LEXCON | Instituciones Educativas | `/dashboard/admin/institutions` |
| | Registrar Institución Educativa | `/dashboard/admin/institutions/new` |
| | Equipo jurídico | `/dashboard/admin/lawyers` (solo lectura) |
| | Registrar abogado Lexcon | `/dashboard/admin/users?rol=ABOGADO_ARKA` |
| | Usuarios y accesos | `/dashboard/admin/users` |
| | Registro de actuaciones | `/dashboard/admin/audit` (visible con Supabase desde la Tarea 13) |
| MI ESPACIO | Mi cuenta | `/dashboard/account` |

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/administracion-retirada.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');
const leer = (relativa: string): string => readFileSync(join(SRC, relativa), 'utf8');

const RETIRADOS = [
  'app/api/admin/attorneys/route.ts',
  'app/api/admin/accesses/route.ts',
  'modules/admin/access-management.ts',
  'app/dashboard/admin/attorney-management.tsx',
  'app/dashboard/admin/admin-accesses.tsx',
];

describe('administración unificada en Usuarios y accesos', () => {
  it.each(RETIRADOS)('%s ya no existe', (ruta) => {
    expect(existsSync(join(SRC, ruta))).toBe(false);
  });

  it('service-administration ya no crea ni edita abogados', () => {
    expect(leer('modules/admin/service-administration.ts')).not.toMatch(/createAttorney|updateAttorney|listManagedAttorneys|hashPassword/);
  });

  it('las pantallas retiradas redirigen a Usuarios y accesos', () => {
    expect(leer('app/dashboard/admin/lawyers/new/page.tsx')).toContain("redirect('/dashboard/admin/users?rol=ABOGADO_ARKA')");
    expect(leer('app/dashboard/admin/accesses/page.tsx')).toContain("redirect('/dashboard/admin/users')");
  });

  it('Equipo jurídico enlaza con Usuarios y accesos para invitar', () => {
    expect(leer('app/dashboard/admin/lawyers/page.tsx')).toContain('href="/dashboard/admin/users?rol=ABOGADO_ARKA"');
  });
});
```

Crear `tests/unit/rol-inicial.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rolInicialDesdeConsulta } from '../../src/modules/access/supabase-user-administration';

describe('rol preseleccionado en Usuarios y accesos', () => {
  it.each<[unknown, string]>([
    ['RECTOR_IE', 'RECTOR_IE'],
    ['ABOGADO_ARKA', 'ABOGADO_ARKA'],
    ['COMITE_EVALUADOR', 'ABOGADO_ARKA'],
    [['RECTOR_IE'], 'ABOGADO_ARKA'],
    [undefined, 'ABOGADO_ARKA'],
  ])('%o → %s', (valor, esperado) => {
    expect(rolInicialDesdeConsulta(valor)).toBe(esperado);
  });
});
```

Añadir al final del `describe('menú lateral', ...)` de `tests/unit/navigation.test.ts` (antes de su `});` final):

```ts
  it('Registrar abogado Lexcon lleva a Usuarios y accesos con el rol Abogado y Equipo jurídico está disponible', () => {
    mocks.configurado.mockReturnValue(true);
    const items = navFor(ADMIN);
    expect(items).toContainEqual(expect.objectContaining({ label: 'Registrar abogado Lexcon', href: '/dashboard/admin/users?rol=ABOGADO_ARKA' }));
    expect(items.map((item) => item.href)).not.toContain('/dashboard/admin/lawyers/new');
    expect(items.map((item) => item.label)).toContain('Equipo jurídico');
  });
```

- [ ] **Paso 2: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/administracion-retirada.test.ts tests/unit/rol-inicial.test.ts tests/unit/navigation.test.ts`
Esperado: FALLAN: los archivos retirados existen; `rolInicialDesdeConsulta` no existe; el menú sigue llevando a `/dashboard/admin/lawyers/new` (oculto con Supabase).

- [ ] **Paso 3: eliminar lo retirado**

```bash
cd "/c/CODEX - CURSO Y APLICACIONES CREADAS/LEXCON-IAG-NUEVO"
rm src/app/api/admin/attorneys/route.ts src/app/api/admin/accesses/route.ts src/modules/admin/access-management.ts \
  src/app/dashboard/admin/attorney-management.tsx src/app/dashboard/admin/admin-accesses.tsx
rmdir src/app/api/admin/attorneys src/app/api/admin/accesses
```

En `tests/integration/access-by-role.test.ts`: borrar la línea `import { setAccessActive } from '../../src/modules/admin/access-management';` y el caso completo `it('permite al administrador activar o desactivar otro acceso y protege el propio', () => { ... });` (la activación y desactivación de cuentas vive en Usuarios y accesos, ya probada en `tests/unit/admin-users-route.test.ts`). El primer caso no cambia.

Reemplazar todo `src/modules/admin/service-administration.ts` por (conserva la administración local de IE; quita abogados):

```ts
import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../../platform/auth/current-user';
import { getSqlite } from '../../platform/database/client';
import { hasCapability } from '../access/authorization';

/**
 * Instituciones Educativas en la base SQLite de la demostración local. Con Supabase se usa
 * src/modules/admin/institutions/; los abogados se invitan desde Usuarios y accesos.
 */
export const institutionServiceStatuses = ['ACTIVE', 'SUSPENDED_ARREARS', 'ENDED'] as const;
export type InstitutionServiceStatus = typeof institutionServiceStatuses[number];

export interface ManagedInstitution { id: string; name: string; city: string; active: boolean; serviceStatus: InstitutionServiceStatus; serviceNote: string | null; createdAt: string; users: number; processes: number }

function assertAdmin(actor: CurrentUser): void {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) throw new Error('No tienes autorización para administrar el servicio.');
}
function cleanName(value: string, field: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 3 || cleaned.length > 120) throw new Error(`${field} debe tener entre 3 y 120 caracteres.`);
  return cleaned;
}
function cleanCity(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 100) throw new Error('La ciudad o municipio debe tener entre 2 y 100 caracteres.');
  return cleaned;
}
function serviceStatus(value: string): InstitutionServiceStatus {
  if (!institutionServiceStatuses.includes(value as InstitutionServiceStatus)) throw new Error('Selecciona un estado de servicio válido.');
  return value as InstitutionServiceStatus;
}
function addAudit(actor: CurrentUser, action: string, targetType: string, targetId: string): void {
  getSqlite().prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)').run(randomUUID(), actor.id, action, targetType, targetId, new Date().toISOString());
}

export function listManagedInstitutions(): ManagedInstitution[] {
  return getSqlite().prepare(`SELECT institution.id, institution.name, institution.city, institution.active, institution.service_status AS serviceStatus, institution.service_note AS serviceNote, institution.created_at AS createdAt, COUNT(DISTINCT membership.user_id) AS users, COUNT(DISTINCT process.id) AS processes FROM institutions institution LEFT JOIN memberships membership ON membership.institution_id = institution.id AND membership.active = 1 LEFT JOIN processes process ON process.institution_id = institution.id GROUP BY institution.id ORDER BY institution.active DESC, institution.name`).all() as ManagedInstitution[];
}

export function getManagedInstitution(id: string): ManagedInstitution | null {
  return getSqlite().prepare(`SELECT institution.id, institution.name, institution.city, institution.active, institution.service_status AS serviceStatus, institution.service_note AS serviceNote, institution.created_at AS createdAt, COUNT(DISTINCT membership.user_id) AS users, COUNT(DISTINCT process.id) AS processes FROM institutions institution LEFT JOIN memberships membership ON membership.institution_id = institution.id AND membership.active = 1 LEFT JOIN processes process ON process.institution_id = institution.id WHERE institution.id = ? GROUP BY institution.id`).get(id) as ManagedInstitution | undefined ?? null;
}

export function createInstitution(actor: CurrentUser, input: { name: string; city: string; serviceStatus: string; serviceNote?: string }): string {
  assertAdmin(actor); const status = serviceStatus(input.serviceStatus); const id = randomUUID(); const now = new Date().toISOString();
  getSqlite().prepare('INSERT INTO institutions (id, name, city, active, service_status, service_note, service_status_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, cleanName(input.name, 'El nombre de la Institución Educativa'), cleanCity(input.city), status === 'ACTIVE' ? 1 : 0, status, input.serviceNote?.trim() || null, now, now);
  addAudit(actor, 'INSTITUTION_CREATED', 'institution', id);
  return id;
}

export function updateInstitution(actor: CurrentUser, input: { id: string; name: string; city: string; serviceStatus: string; serviceNote?: string }): void {
  assertAdmin(actor); const status = serviceStatus(input.serviceStatus); const db = getSqlite();
  const existing = db.prepare('SELECT id FROM institutions WHERE id = ?').get(input.id) as { id: string } | undefined;
  if (!existing) throw new Error('La Institución Educativa no existe.');
  const now = new Date().toISOString();
  db.prepare('UPDATE institutions SET name = ?, city = ?, active = ?, service_status = ?, service_note = ?, service_status_changed_at = ? WHERE id = ?').run(cleanName(input.name, 'El nombre de la Institución Educativa'), cleanCity(input.city), status === 'ACTIVE' ? 1 : 0, status, input.serviceNote?.trim() || null, now, input.id);
  addAudit(actor, status === 'ENDED' ? 'INSTITUTION_SERVICE_ENDED' : status === 'SUSPENDED_ARREARS' ? 'INSTITUTION_SERVICE_SUSPENDED' : 'INSTITUTION_UPDATED', 'institution', input.id);
}
```

- [ ] **Paso 4: pantallas de Equipo jurídico y redirecciones**

Reemplazar todo `src/app/dashboard/admin/lawyers/page.tsx` por:

```tsx
import Link from 'next/link';
import { listarEquipoJuridico } from '@/modules/admin/legal-team/legal-team-service';
import { puertoEquipoJuridico } from '@/modules/admin/legal-team/legal-team-runtime';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function LawyersPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const abogados = await listarEquipoJuridico(puertoEquipoJuridico(), user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/lawyers"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de equipo</p><h1>Equipo jurídico</h1><p>Abogados Lexcon con acceso activo y sus procesos asignados. Para invitar, corregir un correo o desactivar una cuenta use Usuarios y accesos.</p></div></header>
    <section className="attorney-directory"><div className="directory-heading"><div><p className="section-kicker">Equipo jurídico Lexcon</p><h2>Abogados disponibles para asignación</h2></div><Link className="primary-button" href="/dashboard/admin/users?rol=ABOGADO_ARKA">Invitar abogado <span aria-hidden="true">→</span></Link></div>
      {abogados.length ? <div className="attorney-card-grid">{abogados.map((abogado) => <article className="attorney-card" key={abogado.id}><span className="attorney-card-avatar" aria-hidden="true">{abogado.nombre.slice(0, 1)}</span><div><strong>{abogado.nombre}</strong><span className="availability active">Disponible para asignación</span><small>{abogado.correo}</small><small>{abogado.procesosAsignados} {abogado.procesosAsignados === 1 ? 'proceso asignado' : 'procesos asignados'}</small></div><div className="card-actions"><Link href="/dashboard/admin/users">Gestionar cuenta</Link></div></article>)}</div> : <div className="empty-state"><strong>Aún no hay abogados Lexcon activos.</strong><p>Invite al primero desde Usuarios y accesos.</p></div>}
    </section>
  </div></WorkspaceShell>;
}
```

Reemplazar todo `src/app/dashboard/admin/lawyers/new/page.tsx` por:

```tsx
import { redirect } from 'next/navigation';
import { requireWorkspaceUser } from '../../../require-workspace-user';

/** Pantalla retirada: los abogados se invitan desde Usuarios y accesos con el rol Abogado preseleccionado. */
export default async function NewAttorneyPage() {
  await requireWorkspaceUser(['ARKA_ADMIN']);
  redirect('/dashboard/admin/users?rol=ABOGADO_ARKA');
}
```

Reemplazar todo `src/app/dashboard/admin/accesses/page.tsx` por:

```tsx
import { redirect } from 'next/navigation';
import { requireWorkspaceUser } from '../../require-workspace-user';

/** Pantalla retirada: activar y desactivar cuentas se hace en Usuarios y accesos. */
export default async function AccessesPage() {
  await requireWorkspaceUser(['ARKA_ADMIN']);
  redirect('/dashboard/admin/users');
}
```

- [ ] **Paso 5: Usuarios y accesos con rol preseleccionado y aviso en modo local**

En `src/modules/access/supabase-user-administration.ts`, reemplazar `function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }` por:

```ts
function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

/** Rol preseleccionado del formulario de invitación a partir de `?rol=` (Abogado si falta o no es válido). */
export function rolInicialDesdeConsulta(valor: unknown): RolAdministrable {
  return typeof valor === 'string' && (rolesAdministrables as readonly string[]).includes(valor) ? valor as RolAdministrable : 'ABOGADO_ARKA';
}
```

En `src/app/dashboard/admin/user-access-management.tsx`:

1. Reemplazar `export function UserAccessManagement({ usuarios: initialUsuarios, instituciones, idActor }: { usuarios: UsuarioAdministrado[]; instituciones: InstitucionParaAcceso[]; idActor: string }) {` por:

```tsx
export function UserAccessManagement({ usuarios: initialUsuarios, instituciones, idActor, rolInicial = 'ABOGADO_ARKA' }: { usuarios: UsuarioAdministrado[]; instituciones: InstitucionParaAcceso[]; idActor: string; rolInicial?: RolAdministrable }) {
```

2. Reemplazar `const [rol, setRol] = useState<RolAdministrable>('ABOGADO_ARKA');` por `const [rol, setRol] = useState<RolAdministrable>(rolInicial);`
3. Reemplazar `formulario.reset(); setRol('ABOGADO_ARKA'); router.refresh();` por `formulario.reset(); setRol(rolInicial); router.refresh();`

Reemplazar todo `src/app/dashboard/admin/users/page.tsx` por:

```tsx
import { listarInstitucionesParaAcceso, listarUsuariosAdministrados, rolInicialDesdeConsulta } from '@/modules/access/supabase-user-administration';
import { supabaseConfigurado } from '@/platform/supabase/server';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';
import { UserAccessManagement } from '../user-access-management';

/** Una configuración parcial o no HTTPS lanza; para esta pantalla significa que Supabase no está disponible. */
function configurado(): boolean {
  try { return supabaseConfigurado(); } catch { return false; }
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ [clave: string]: string | string[] | undefined }> }) {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const encabezado = <header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de acceso</p><h1>Usuarios y accesos</h1><p>Invite a las personas que necesitan entrar a LEXCON. Cada una define su propia contraseña mediante un enlace enviado a su correo.</p></div></header>;
  if (!configurado()) {
    return <WorkspaceShell user={user} activePath="/dashboard/admin/users"><div className="page-stack admin-module">{encabezado}<section className="surface"><p>Usuarios y accesos está disponible cuando LEXCON usa el acceso con Supabase. La demostración local usa las cuentas ficticias de la pantalla de acceso.</p></section></div></WorkspaceShell>;
  }
  const rolInicial = rolInicialDesdeConsulta((await searchParams).rol);
  const [usuarios, instituciones] = await Promise.all([listarUsuariosAdministrados(user), listarInstitucionesParaAcceso(user)]);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/users"><div className="page-stack admin-module">{encabezado}<UserAccessManagement usuarios={usuarios} instituciones={instituciones} idActor={user.id} rolInicial={rolInicial} /></div></WorkspaceShell>;
}
```

- [ ] **Paso 6: menú y tabla de funciones**

En `src/app/dashboard/_components/navigation.ts`, reemplazar `    { href: '/dashboard/admin/lawyers/new', label: 'Registrar abogado Lexcon', icon: '+' },` por:

```ts
    { href: '/dashboard/admin/users?rol=ABOGADO_ARKA', label: 'Registrar abogado Lexcon', icon: '+' },
```

En `src/platform/features.ts`:

1. Borrar la línea `  | 'ACCESOS'` del tipo `ClaveFuncion`.
2. Borrar el bloque completo `  ACCESOS: { ... },` (la pantalla ahora redirige y su ruta de API ya no existe).
3. Reemplazar el bloque `EQUIPO_JURIDICO` por:

```ts
  EQUIPO_JURIDICO: {
    etiqueta: 'Equipo jurídico',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/lawyers/page.tsx', 'app/dashboard/admin/lawyers/new/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/lawyers'],
    modulos: ['modules/admin/legal-team/legal-team-runtime.ts', 'modules/admin/legal-team/legal-team-port-supabase.ts'],
  },
```

- [ ] **Paso 7: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/administracion-retirada.test.ts tests/unit/rol-inicial.test.ts tests/unit/navigation.test.ts tests/unit/funciones-coherencia.test.ts tests/unit/features.test.ts tests/integration/access-by-role.test.ts` y `corepack pnpm typecheck`
Esperado: PASAN; sin errores de tipos (si `tsc` señala `.next/types` de las rutas eliminadas, ejecute `corepack pnpm build` y repita).

- [ ] **Paso 8: documentar**

En `docs/current-state.md`, reemplazar `En modo local el departamento, el NIT y el código DANE no se guardan (la base SQLite de demostración no tiene esas columnas).` por esa misma frase seguida de:

```markdown
- **Abogados y cuentas (A2):** Equipo jurídico (`/dashboard/admin/lawyers`, módulo `src/modules/admin/legal-team/`) es una vista de solo lectura de los abogados activos, con su correo y procesos asignados, que enlaza con Usuarios y accesos. «Registrar abogado Lexcon» abre Usuarios y accesos con el rol Abogado preseleccionado (`?rol=ABOGADO_ARKA`). Se retiraron la creación y edición de abogados con contraseña temporal (`/api/admin/attorneys`), la lista de Accesos del centro de control (`/api/admin/accesses`, `access-management.ts`); `/dashboard/admin/lawyers/new` y `/dashboard/admin/accesses` redirigen a Usuarios y accesos. En modo local Usuarios y accesos muestra un aviso: la demostración usa las cuentas ficticias.
```

- [ ] **Paso 9: verificación del grupo**

Ejecutar: `corepack pnpm typecheck` y `corepack pnpm exec vitest run`
Esperado: sin errores; todas las pruebas pasan (una prueba de integración menos: el caso de `setAccessActive`).

- [ ] **Paso 10: Commit (solo con autorización explícita)**

```bash
git add src/app/api/admin/attorneys/route.ts src/app/api/admin/accesses/route.ts src/modules/admin/access-management.ts \
  src/app/dashboard/admin/attorney-management.tsx src/app/dashboard/admin/admin-accesses.tsx \
  src/modules/admin/legal-team/legal-team-service.ts src/modules/admin/legal-team/legal-team-port-supabase.ts \
  src/modules/admin/legal-team/legal-team-port-local.ts src/modules/admin/legal-team/legal-team-runtime.ts \
  src/modules/admin/service-administration.ts src/modules/access/supabase-user-administration.ts \
  src/app/dashboard/admin/lawyers/page.tsx src/app/dashboard/admin/lawyers/new/page.tsx src/app/dashboard/admin/accesses/page.tsx \
  src/app/dashboard/admin/users/page.tsx src/app/dashboard/admin/user-access-management.tsx \
  src/app/dashboard/_components/navigation.ts src/platform/features.ts \
  tests/unit/legal-team.test.ts tests/integration/legal-team-port-local.test.ts tests/unit/administracion-retirada.test.ts \
  tests/unit/rol-inicial.test.ts tests/unit/navigation.test.ts tests/integration/access-by-role.test.ts \
  docs/current-state.md
git commit -m "feat: unificar abogados y cuentas en Usuarios y accesos" \
  -m "Equipo jurídico pasa a ser una vista de solo lectura sobre Supabase o SQLite. Registrar abogado Lexcon abre Usuarios y accesos con el rol Abogado preseleccionado; se retiran la creación de abogados con contraseña temporal y la lista de Accesos, cuyas pantallas redirigen a Usuarios y accesos." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

(`git add` sobre un archivo eliminado prepara su eliminación.)

---

## Grupo 4 · A3: Asignar responsable jurídico

### Task 11: Consulta propia de procesos sin responsable, contrato de `asignar_abogado_proceso` y diagnóstico

**Archivos**
- Modificar: `src/modules/processes/supabase-process-summaries.ts`, `src/modules/processes/process-queries.ts`, `src/modules/assignments/attorney-assignment.ts`, `src/app/dashboard/admin/assignments/page.tsx`, `src/app/api/admin/attorney-assignments/route.ts`, `src/platform/features.ts`, `docs/current-state.md`
- Probar: `tests/unit/procesos-sin-responsable.test.ts`, `tests/unit/attorney-assignment-remote.test.ts`, `tests/unit/migracion-asignar-abogado.test.ts`

Causa real del error actual: el código revisado no muestra un fallo determinista (la rama Supabase existe, `listProcessesFor` con un usuario vacío no usa el `id` para `ARKA_ADMIN`, y la función SQL ya validaba y auditaba). Lo que sí falta es diagnóstico: hoy cualquier error de la RPC se convierte en «No fue posible registrar la asignación jurídica.» sin dejar rastro. Esta tarea (1) elimina la dependencia del listado general, (2) registra el código de PostgreSQL y, cuando es uno de los tres textos fijos de la función, el motivo, y (3) muestra a la persona un mensaje específico para esos tres casos. Si en la Tarea 16 el error persiste, el registro del servidor (`[asignacion]` o el *digest* de Next) indicará la causa; se pedirá ese registro a la persona responsable.

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/procesos-sin-responsable.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ cliente: null as unknown, listarGeneral: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => true, crearClienteSupabaseServidor: () => mocks.cliente }));
vi.mock('@/modules/processes/supabase-process-summaries', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../src/modules/processes/supabase-process-summaries')>()),
  listarResumenesProcesosSupabase: (...argumentos: unknown[]) => mocks.listarGeneral(...argumentos),
}));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse con Supabase.'); } }));

import { listUnassignedProcesses } from '../../src/modules/processes/process-queries';
import { listarProcesosSinResponsableSupabase } from '../../src/modules/processes/supabase-process-summaries';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const PROCESOS = [
  { id: 'p-1', id_institucion: 'ie-1', consecutivo_institucional: 1, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-03T00:00:00.000Z', objeto_contractual: 'Suministro de papelería' },
  { id: 'p-2', id_institucion: 'ie-2', consecutivo_institucional: 1, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-02T00:00:00.000Z', objeto_contractual: null },
  { id: 'p-3', id_institucion: 'ie-1', consecutivo_institucional: 2, fase_actual: 'MERCADO', estado_actual: 'PENDIENTE_ACTUACION', abierto_en: '2026-10-01T00:00:00.000Z', objeto_contractual: null },
];

function falsoCon(responsables: Array<{ id_proceso: string }>) {
  return crearSupabaseFalso({
    tablas: {
      procesos_contratacion: () => ({ data: PROCESOS }),
      responsables_proceso: () => ({ data: responsables }),
      instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
    },
  });
}

describe('procesos sin responsable jurídico (Supabase)', () => {
  beforeEach(() => {
    mocks.listarGeneral.mockReset();
  });

  it('devuelve solo los procesos sin ABOGADO activo, con su institución', async () => {
    const falso = falsoCon([{ id_proceso: 'p-2' }]);
    const procesos = await listarProcesosSinResponsableSupabase(falso.cliente);
    expect(procesos).toEqual([
      { id: 'p-1', institutionId: 'ie-1', institutionSequence: 1, phase: 'MERCADO', status: 'PENDIENTE_ACTUACION', createdAt: '2026-10-03T00:00:00.000Z', institutionName: 'IE INEM', attorneyName: null, objectDescription: 'Suministro de papelería' },
      { id: 'p-3', institutionId: 'ie-1', institutionSequence: 2, phase: 'MERCADO', status: 'PENDIENTE_ACTUACION', createdAt: '2026-10-01T00:00:00.000Z', institutionName: 'IE INEM', attorneyName: null, objectDescription: null },
    ]);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
    const [instituciones] = consultasDe(falso.consultas, 'instituciones_educativas');
    expect(operaciones(instituciones, 'in')).toEqual([['id', ['ie-1']]]);
  });

  it('si todos tienen responsable no consulta instituciones', async () => {
    const falso = falsoCon(PROCESOS.map((proceso) => ({ id_proceso: proceso.id })));
    expect(await listarProcesosSinResponsableSupabase(falso.cliente)).toEqual([]);
    expect(consultasDe(falso.consultas, 'instituciones_educativas')).toEqual([]);
  });

  it('listUnassignedProcesses usa la consulta propia y no el listado general con un usuario vacío', async () => {
    mocks.cliente = falsoCon([]).cliente;
    expect((await listUnassignedProcesses()).map((proceso) => proceso.id)).toEqual(['p-1', 'p-2', 'p-3']);
    expect(mocks.listarGeneral).not.toHaveBeenCalled();
  });

  it('un error de consulta se informa sin datos', async () => {
    const falso = crearSupabaseFalso({ tablas: { procesos_contratacion: () => ({ error: { message: 'fallo' } }) } });
    await expect(listarProcesosSinResponsableSupabase(falso.cliente)).rejects.toThrow(/No fue posible consultar los procesos remotos/);
  });
});
```

Crear `tests/unit/attorney-assignment-remote.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), notificar: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({
  supabaseConfigurado: () => true,
  crearClienteSupabaseServidor: () => ({ rpc: (...argumentos: unknown[]) => mocks.rpc(...argumentos) }),
}));
vi.mock('@/modules/automation/iag-drafts', () => ({ notifyAssignedAttorney: (...argumentos: unknown[]) => mocks.notificar(...argumentos) }));
vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse con Supabase.'); } }));

import { assignAttorneyRemote } from '../../src/modules/assignments/attorney-assignment';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };

describe('assignAttorneyRemote con Supabase', () => {
  let consola: MockInstance;

  beforeEach(() => {
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.rpc.mockReset();
    mocks.notificar.mockReset();
  });

  afterEach(() => {
    consola.mockRestore();
  });

  it('llama a asignar_abogado_proceso y no ejecuta el aviso SQLite', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await assignAttorneyRemote(ADMIN, 'p-1', 'u-9');
    expect(mocks.rpc).toHaveBeenCalledWith('asignar_abogado_proceso', { p_id_proceso: 'p-1', p_id_abogado: 'u-9', p_id_actor: 'a-1' });
    expect(mocks.notificar).not.toHaveBeenCalled();
  });

  it('un motivo conocido de la función se muestra y se registra con su código', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'P0001', message: 'Abogado no válido' } });
    await expect(assignAttorneyRemote(ADMIN, 'p-1', 'u-9')).rejects.toThrow('El abogado seleccionado no tiene un acceso activo de Abogado Lexcon.');
    expect(consola).toHaveBeenCalledWith('[asignacion] asignar_abogado_proceso falló', 'P0001', 'Abogado no válido');
  });

  it.each(['duplicate key value violates unique constraint "responsable_abogado_activo_unico"', 'constructor'])('un motivo desconocido responde genérico sin registrar el mensaje (%s)', async (mensaje) => {
    mocks.rpc.mockResolvedValue({ error: { code: '23505', message: mensaje } });
    await expect(assignAttorneyRemote(ADMIN, 'p-1', 'u-9')).rejects.toThrow('No fue posible registrar la asignación jurídica.');
    expect(consola).toHaveBeenCalledWith('[asignacion] asignar_abogado_proceso falló', '23505', 'motivo-no-reconocido');
    expect(JSON.stringify(consola.mock.calls)).not.toContain('duplicate');
  });

  it('sin la capacidad ATTORNEY_ASSIGN no llama a la base', async () => {
    await expect(assignAttorneyRemote(ABOGADO, 'p-1', 'u-9')).rejects.toThrow('No tienes autorización para asignar abogado.');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
```

Crear `tests/unit/migracion-asignar-abogado.test.ts` (prueba de caracterización del contrato existente: pasa desde el principio y protege la función contra cambios futuros):

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261008203000_asignar_abogado_proceso.sql'), 'utf8');

describe('contrato de asignar_abogado_proceso', () => {
  it('es security definer con search_path fijo', () => {
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = pg_catalog, public/i);
  });

  it('valida un Administrador y un Abogado activos', () => {
    expect(sql).toMatch(/r\.codigo = 'ADMINISTRADOR_ARKA'/);
    expect(sql).toMatch(/r\.codigo = 'ABOGADO_ARKA'/);
    expect((sql.match(/p\.activo/g) ?? []).length).toBe(2);
  });

  it('retira al abogado anterior antes de registrar el nuevo', () => {
    expect(sql).toMatch(/update public\.responsables_proceso set activo = false, retirado_en = now\(\)\s+where id_proceso = p_id_proceso and tipo_responsabilidad = 'ABOGADO' and activo/i);
    expect(sql.indexOf('update public.responsables_proceso')).toBeLessThan(sql.indexOf('insert into public.responsables_proceso'));
  });

  it('audita ABOGADO_ASIGNADO en eventos_auditoria (la aplicación no duplica la auditoría)', () => {
    expect(sql).toMatch(/insert into public\.eventos_auditoria[\s\S]*'ABOGADO_ASIGNADO'/i);
  });

  it('solo service_role puede ejecutarla', () => {
    expect(sql).toMatch(/revoke all on function public\.asignar_abogado_proceso\(uuid, uuid, uuid\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.asignar_abogado_proceso\(uuid, uuid, uuid\) to service_role/i);
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i);
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar**

Ejecutar: `corepack pnpm exec vitest run tests/unit/procesos-sin-responsable.test.ts tests/unit/attorney-assignment-remote.test.ts tests/unit/migracion-asignar-abogado.test.ts`
Esperado: FALLAN `procesos-sin-responsable` («listarProcesosSinResponsableSupabase is not a function»; `listUnassignedProcesses` llama al listado general) y los casos de motivo de `attorney-assignment-remote` (mensaje genérico y sin `console.error`). `migracion-asignar-abogado` PASA (caracterización).

- [ ] **Paso 3: implementar la consulta propia**

En `src/modules/processes/supabase-process-summaries.ts`:

1. Reemplazar `import type { CurrentUser } from '../../platform/auth/current-user';` por:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CurrentUser } from '../../platform/auth/current-user';
```

2. Añadir al final del archivo:

```ts
/**
 * Procesos sin responsable jurídico activo (responsables_proceso de tipo ABOGADO), para Asignar responsable jurídico.
 * Consulta propia: no reutiliza el listado por rol ni necesita un usuario.
 */
export async function listarProcesosSinResponsableSupabase(supabase: SupabaseClient): Promise<ResumenProcesoRemoto[]> {
  const [procesosRespuesta, responsablesRespuesta] = await Promise.all([
    supabase.from('procesos_contratacion').select('id, id_institucion, consecutivo_institucional, fase_actual, estado_actual, abierto_en, objeto_contractual').order('abierto_en', { ascending: false }),
    supabase.from('responsables_proceso').select('id_proceso').eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true),
  ]);
  const procesos = resultado(procesosRespuesta, 'No fue posible consultar los procesos remotos') as FilaProceso[];
  const asignados = new Set((resultado(responsablesRespuesta, 'No fue posible consultar las asignaciones jurídicas') as Array<Pick<FilaResponsable, 'id_proceso'>>).map((fila) => fila.id_proceso));
  const pendientes = procesos.filter((proceso) => !asignados.has(proceso.id));
  if (!pendientes.length) return [];
  const idsInstituciones = [...new Set(pendientes.map((proceso) => proceso.id_institucion))];
  const instituciones = resultado(await supabase.from('instituciones_educativas').select('id, nombre').in('id', idsInstituciones), 'No fue posible consultar las Instituciones Educativas') as FilaInstitucion[];
  const nombres = new Map(instituciones.map((institucion) => [institucion.id, institucion.nombre]));
  return pendientes.map((proceso) => ({
    id: proceso.id,
    institutionId: proceso.id_institucion,
    institutionSequence: proceso.consecutivo_institucional,
    phase: proceso.fase_actual,
    status: proceso.estado_actual,
    createdAt: proceso.abierto_en,
    institutionName: nombres.get(proceso.id_institucion) ?? 'Institución no disponible',
    attorneyName: null,
    objectDescription: proceso.objeto_contractual,
  }));
}
```

En `src/modules/processes/process-queries.ts`:

1. Reemplazar `import { supabaseConfigurado } from '../../platform/supabase/server';` por `import { crearClienteSupabaseServidor, supabaseConfigurado } from '../../platform/supabase/server';`
2. Reemplazar `import { listarResumenesProcesosSupabase } from './supabase-process-summaries';` por `import { listarProcesosSinResponsableSupabase, listarResumenesProcesosSupabase } from './supabase-process-summaries';`
3. Reemplazar la función completa `listUnassignedProcesses` (desde `export async function listUnassignedProcesses(): Promise<ProcessSummary[]> {` hasta su `}` de cierre, incluida la línea que construye `{ id: '', name: '', ... }`) por:

```ts
export async function listUnassignedProcesses(): Promise<ProcessSummary[]> {
  if (!supabaseConfigurado()) return listLocalUnassignedProcesses();
  return listarProcesosSinResponsableSupabase(crearClienteSupabaseServidor());
}
```

- [ ] **Paso 4: implementar el diagnóstico de la asignación**

En `src/modules/assignments/attorney-assignment.ts`, reemplazar la función completa `assignAttorneyRemote` por:

```ts
/** Textos fijos que lanza asignar_abogado_proceso (sin datos personales): se pueden mostrar y registrar. */
const MOTIVOS_ASIGNACION: Record<string, string> = {
  'Actor no autorizado': 'Su cuenta de Administrador no está activa para asignar responsables.',
  'Abogado no válido': 'El abogado seleccionado no tiene un acceso activo de Abogado Lexcon.',
  'Proceso no válido': 'El proceso seleccionado no existe.',
};

/**
 * Con Supabase, asignar_abogado_proceso valida, retira al abogado anterior y audita ABOGADO_ASIGNADO.
 * El aviso al abogado (notifyAssignedAttorney) depende de SQLite y no se ejecuta aquí: queda para el subproyecto C.
 */
export async function assignAttorneyRemote(actor: CurrentUser, processId: string, attorneyId: string): Promise<void> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ATTORNEY_ASSIGN')) throw new Error('No tienes autorización para asignar abogado.');
  if (!supabaseConfigurado()) return assignAttorney(actor, processId, attorneyId);
  const { error } = await crearClienteSupabaseServidor().rpc('asignar_abogado_proceso', { p_id_proceso: processId, p_id_abogado: attorneyId, p_id_actor: actor.id });
  if (!error) return;
  const motivo = Object.hasOwn(MOTIVOS_ASIGNACION, error.message) ? MOTIVOS_ASIGNACION[error.message] : null;
  // Diagnóstico con etiqueta fija: el código de PostgreSQL y, solo si es uno de los textos fijos de la función, ese texto.
  console.error('[asignacion] asignar_abogado_proceso falló', error.code || 'sin-código', motivo ? error.message : 'motivo-no-reconocido');
  throw new Error(motivo ?? 'No fue posible registrar la asignación jurídica.');
}
```

La ruta `POST /api/admin/attorney-assignments` ya devuelve `error.message` con estado 400: el mensaje específico llega a la pantalla sin cambios en la ruta.

- [ ] **Paso 5: habilitar la función**

En `src/app/dashboard/admin/assignments/page.tsx`: borrar la línea `import { exigirFuncion } from '../../_components/no-disponible';` y reemplazar `const user = await requireWorkspaceUser(['ARKA_ADMIN']); const noDisponible = exigirFuncion('ASIGNACION_JURIDICA', user, '/dashboard/admin/assignments'); if (noDisponible) return noDisponible;` por `const user = await requireWorkspaceUser(['ARKA_ADMIN']);`

En `src/app/api/admin/attorney-assignments/route.ts`: borrar la línea `import { rutaNoDisponible } from '@/platform/features-http';` y reemplazar todas las apariciones (`replace_all`) de `const noDisponible = rutaNoDisponible('ASIGNACION_JURIDICA'); if (noDisponible) return noDisponible; ` por una cadena vacía.

En `src/platform/features.ts`, reemplazar:

```ts
    etiqueta: 'Asignar responsable jurídico',
    subproyecto: 'A',
    // Tiene rama Supabase, pero falla en producción (diseño del 2026-10-15): se habilita al corregirla en A3.
    disponibleConSupabase: false,
```

por:

```ts
    etiqueta: 'Asignar responsable jurídico',
    subproyecto: 'A',
    disponibleConSupabase: true,
```

- [ ] **Paso 6: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/procesos-sin-responsable.test.ts tests/unit/attorney-assignment-remote.test.ts tests/unit/migracion-asignar-abogado.test.ts tests/unit/funciones-coherencia.test.ts tests/integration/access-by-role.test.ts`
Esperado: PASAN todas (la integración confirma que la asignación local con SQLite no cambió).

- [ ] **Paso 7: documentar**

En `docs/current-state.md`, reemplazar `En modo local Usuarios y accesos muestra un aviso: la demostración usa las cuentas ficticias.` por esa misma frase seguida de:

```markdown
- **Asignar responsable jurídico (A3):** `listUnassignedProcesses` usa una consulta propia (`listarProcesosSinResponsableSupabase`: procesos sin responsable activo de tipo `ABOGADO`) y ya no construye un usuario vacío para reutilizar el listado general. La asignación sigue en `asignar_abogado_proceso`, que valida al Administrador y al Abogado, retira al anterior y audita `ABOGADO_ASIGNADO` (contrato protegido por `tests/unit/migracion-asignar-abogado.test.ts`). Si la función rechaza la asignación, la pantalla muestra el motivo (cuenta de Administrador inactiva, abogado sin acceso activo o proceso inexistente) y el servidor registra `[asignacion]` con el código de PostgreSQL. La causa del error observado en producción no se reprodujo con adaptadores simulados: si persiste, se revisará ese registro. En modo Supabase no se envía el aviso al abogado asignado (`notifyAssignedAttorney` depende de SQLite); queda para el subproyecto C.
```

- [ ] **Paso 8: verificación del grupo**

Ejecutar: `corepack pnpm typecheck` y `corepack pnpm exec vitest run`
Esperado: sin errores; todas las pruebas pasan.

- [ ] **Paso 9: Commit (solo con autorización explícita)**

```bash
git add src/modules/processes/supabase-process-summaries.ts src/modules/processes/process-queries.ts src/modules/assignments/attorney-assignment.ts \
  src/app/dashboard/admin/assignments/page.tsx src/app/api/admin/attorney-assignments/route.ts src/platform/features.ts \
  tests/unit/procesos-sin-responsable.test.ts tests/unit/attorney-assignment-remote.test.ts tests/unit/migracion-asignar-abogado.test.ts \
  docs/current-state.md
git commit -m "fix: asignar responsable jurídico con Supabase y diagnosticar sus fallos" \
  -m "listUnassignedProcesses consulta los procesos sin responsable activo sin construir un usuario vacío. assignAttorneyRemote muestra el motivo cuando asignar_abogado_proceso rechaza la asignación y registra el código de PostgreSQL con etiqueta fija; el contrato de la función queda protegido por una prueba." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

---

## Grupo 5 · A4: Alertas y bloqueos, Registro de actuaciones

### Task 12: `getAdminControlCenter` asíncrona con adaptadores Supabase y SQLite

**Archivos**
- Modificar (reescribir): `src/modules/admin/control-center.ts`
- Crear: `src/modules/admin/control-center-local.ts`, `src/modules/admin/control-center-supabase.ts`
- Probar: `tests/unit/control-center.test.ts`, `tests/integration/control-center-local.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/control-center.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/database/client', () => ({ getSqlite: () => { throw new Error('SQLite no debe usarse en esta prueba.'); } }));

import { LIMITE_EVENTOS, obtenerCentroControl, type PuertoCentroControl } from '../../src/modules/admin/control-center';
import { crearPuertoCentroControlSupabase } from '../../src/modules/admin/control-center-supabase';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const ABOGADO: CurrentUser = { id: 'b-1', name: 'Beto', role: 'ARKA_ATTORNEY', institutionId: null, institutionName: null };
const CONTADORES = { processes: 5, unassigned: 2, blocked: 2, institutions: 4, auditEvents: 9 };

describe('centro de control', () => {
  it('solo el Administrador lo consulta y pide los últimos eventos con el límite acordado', async () => {
    const puerto = { contadores: vi.fn(async () => CONTADORES), bloqueosActivos: vi.fn(async () => []), ultimosEventos: vi.fn(async () => []) } satisfies PuertoCentroControl;
    await expect(obtenerCentroControl(puerto, ABOGADO)).rejects.toThrow('No tienes autorización para consultar el centro de control.');
    expect(puerto.contadores).not.toHaveBeenCalled();
    expect(await obtenerCentroControl(puerto, ADMIN)).toEqual({ counts: CONTADORES, blocks: [], events: [] });
    expect(puerto.ultimosEventos).toHaveBeenCalledWith(LIMITE_EVENTOS);
    expect(LIMITE_EVENTOS).toBe(8);
  });
});

describe('adaptador Supabase del centro de control', () => {
  it('cuenta procesos, sin responsable, bloqueos, IE activas y eventos', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        procesos_contratacion: () => ({ count: 5 }),
        responsables_proceso: () => ({ count: 3 }),
        bloqueos_proceso: () => ({ count: 2 }),
        instituciones_educativas: () => ({ count: 4 }),
        eventos_auditoria: () => ({ count: 9 }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).contadores()).toEqual(CONTADORES);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'select')).toEqual([['id', { count: 'exact', head: true }]]);
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
    expect(operaciones(consultasDe(falso.consultas, 'instituciones_educativas')[0], 'eq')).toEqual([['activo', true]]);
  });

  it('lista los bloqueos activos con la institución del proceso', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        bloqueos_proceso: () => ({ data: [{ id_proceso: 'p-1', alcance: 'MERCADO', motivo: 'No existe reglamento institucional aplicable.', creado_en: '2026-10-10T00:00:00.000Z' }] }),
        procesos_contratacion: () => ({ data: [{ id: 'p-1', id_institucion: 'ie-1' }] }),
        instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).bloqueosActivos()).toEqual([
      { processId: 'p-1', institutionName: 'IE INEM', scope: 'MERCADO', reason: 'No existe reglamento institucional aplicable.', createdAt: '2026-10-10T00:00:00.000Z' },
    ]);
    const [bloqueos] = consultasDe(falso.consultas, 'bloqueos_proceso');
    expect(operaciones(bloqueos, 'eq')).toEqual([['activo', true]]);
    expect(operaciones(bloqueos, 'order')).toEqual([['creado_en', { ascending: false }]]);
  });

  it('sin bloqueos no consulta procesos', async () => {
    const falso = crearSupabaseFalso({ tablas: { bloqueos_proceso: () => ({ data: [] }) } });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).bloqueosActivos()).toEqual([]);
    expect(falso.consultas.map((consulta) => consulta.tabla)).toEqual(['bloqueos_proceso']);
  });

  it('lista los últimos eventos con el nombre de quien actuó', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        eventos_auditoria: () => ({ data: [
          { accion: 'ABOGADO_ASIGNADO', id_actor: 'u-1', id_institucion: 'ie-1', creado_en: '2026-10-12T00:00:00.000Z' },
          { accion: 'ADMIN_RECOVERED', id_actor: null, id_institucion: null, creado_en: '2026-10-11T00:00:00.000Z' },
        ] }),
        perfiles_usuario: () => ({ data: [{ id_usuario: 'u-1', nombre_mostrado: 'Ana' }] }),
        instituciones_educativas: () => ({ data: [{ id: 'ie-1', nombre: 'IE INEM' }] }),
      },
    });
    expect(await crearPuertoCentroControlSupabase(falso.cliente).ultimosEventos(8)).toEqual([
      { action: 'ABOGADO_ASIGNADO', actorName: 'Ana', institutionName: 'IE INEM', createdAt: '2026-10-12T00:00:00.000Z' },
      { action: 'ADMIN_RECOVERED', actorName: 'Sistema LEXCON', institutionName: null, createdAt: '2026-10-11T00:00:00.000Z' },
    ]);
    const [eventos] = consultasDe(falso.consultas, 'eventos_auditoria');
    expect(operaciones(eventos, 'order')).toEqual([['creado_en', { ascending: false }]]);
    expect(operaciones(eventos, 'limit')).toEqual([[8]]);
  });

  it('un error de consulta responde con un mensaje genérico', async () => {
    const falso = crearSupabaseFalso({ tablas: { eventos_auditoria: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoCentroControlSupabase(falso.cliente).ultimosEventos(8)).rejects.toThrow('No fue posible consultar el centro de control.');
  });
});
```

Crear `tests/integration/control-center-local.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { obtenerCentroControl } from '../../src/modules/admin/control-center';
import { crearPuertoCentroControlLocal } from '../../src/modules/admin/control-center-local';
import { closeDatabaseForTests, getSqlite } from '../../src/platform/database/client';
import { migrate } from '../../src/platform/database/migrate';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const original = process.env.LEXCON_DATABASE_URL;
let directorio = '';

afterEach(() => {
  closeDatabaseForTests();
  if (directorio) rmSync(directorio, { recursive: true, force: true });
  directorio = '';
  if (original === undefined) delete process.env.LEXCON_DATABASE_URL; else process.env.LEXCON_DATABASE_URL = original;
});

describe('centro de control local (SQLite)', () => {
  it('conserva contadores, bloqueos y eventos de la demostración', async () => {
    directorio = mkdtempSync(join(tmpdir(), 'lexcon-control-'));
    process.env.LEXCON_DATABASE_URL = join(directorio, 'test.sqlite');
    migrate();
    const db = getSqlite();
    const ahora = new Date().toISOString();
    const ie = randomUUID(); const admin = randomUUID(); const rector = randomUUID(); const proceso = randomUUID();
    db.prepare('INSERT INTO institutions (id, name, active, created_at) VALUES (?, ?, 1, ?)').run(ie, 'IE A', ahora);
    const usuario = db.prepare('INSERT INTO users (id, email, display_name, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)');
    usuario.run(admin, 'admin@test.invalid', 'Admin', 'hash', ahora);
    usuario.run(rector, 'rector@test.invalid', 'Rector', 'hash', ahora);
    db.prepare('INSERT INTO processes (id, institution_id, regulation_version_id, phase, status, created_by_user_id, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)').run(proceso, ie, 'MARKET', 'BLOCKED_REGULATION', rector, ahora);
    db.prepare('INSERT INTO workflow_blocks (id, process_id, scope, reason, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(randomUUID(), proceso, 'MARKET', 'No existe reglamento institucional aplicable.', ahora);
    db.prepare('INSERT INTO audit_events (id, process_id, actor_user_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), proceso, admin, 'PROCESS_OPENED_FROM_QUOTES', 'process', proceso, ahora);
    const actor: CurrentUser = { id: admin, name: 'Admin', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };

    expect(await obtenerCentroControl(crearPuertoCentroControlLocal(), actor)).toEqual({
      counts: { processes: 1, unassigned: 1, blocked: 1, institutions: 1, auditEvents: 1 },
      blocks: [{ processId: proceso, institutionName: 'IE A', scope: 'MARKET', reason: 'No existe reglamento institucional aplicable.', createdAt: ahora }],
      events: [{ action: 'PROCESS_OPENED_FROM_QUOTES', actorName: 'Admin', institutionName: 'IE A', createdAt: ahora }],
    });
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/control-center.test.ts tests/integration/control-center-local.test.ts`
Esperado: FALLAN: `control-center-supabase` y `control-center-local` no existen; `obtenerCentroControl` y `LIMITE_EVENTOS` no se exportan.

- [ ] **Paso 3: implementar**

Reemplazar todo `src/modules/admin/control-center.ts` por:

```ts
import type { CurrentUser } from '../../platform/auth/current-user';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '../../platform/supabase/server';
import { hasCapability } from '../access/authorization';
import { crearPuertoCentroControlLocal } from './control-center-local';
import { crearPuertoCentroControlSupabase } from './control-center-supabase';

/** Eventos que muestra Registro de actuaciones (el mismo número que mostraba la versión SQLite). */
export const LIMITE_EVENTOS = 8;

export interface AdminControlCenter {
  counts: { processes: number; unassigned: number; blocked: number; institutions: number; auditEvents: number };
  blocks: Array<{ processId: string; institutionName: string; scope: string; reason: string; createdAt: string }>;
  events: Array<{ action: string; actorName: string; institutionName: string | null; createdAt: string }>;
}

export interface PuertoCentroControl {
  contadores(): Promise<AdminControlCenter['counts']>;
  bloqueosActivos(): Promise<AdminControlCenter['blocks']>;
  ultimosEventos(limite: number): Promise<AdminControlCenter['events']>;
}

export async function obtenerCentroControl(puerto: PuertoCentroControl, actor: CurrentUser): Promise<AdminControlCenter> {
  if (!hasCapability({ userId: actor.id, role: actor.role, institutionId: actor.institutionId, assignedProcessIds: new Set() }, 'ACCESS_MANAGE')) {
    throw new Error('No tienes autorización para consultar el centro de control.');
  }
  const [counts, blocks, events] = await Promise.all([puerto.contadores(), puerto.bloqueosActivos(), puerto.ultimosEventos(LIMITE_EVENTOS)]);
  return { counts, blocks, events };
}

/** Alertas y bloqueos y Registro de actuaciones: Supabase cuando está configurado; SQLite en la demostración local. */
export async function getAdminControlCenter(actor: CurrentUser): Promise<AdminControlCenter> {
  const puerto = supabaseConfigurado() ? crearPuertoCentroControlSupabase(crearClienteSupabaseServidor()) : crearPuertoCentroControlLocal();
  return obtenerCentroControl(puerto, actor);
}
```

Crear `src/modules/admin/control-center-local.ts`:

```ts
import { getSqlite } from '../../platform/database/client';
import type { AdminControlCenter, PuertoCentroControl } from './control-center';

/** Demostración local: las mismas consultas SQLite de la versión anterior. */
export function crearPuertoCentroControlLocal(): PuertoCentroControl {
  const uno = (sql: string): number => (getSqlite().prepare(sql).get() as { count: number }).count;
  return {
    async contadores() {
      return {
        processes: uno('SELECT COUNT(*) AS count FROM processes'),
        unassigned: uno('SELECT COUNT(*) AS count FROM processes p WHERE NOT EXISTS (SELECT 1 FROM attorney_assignments a WHERE a.process_id = p.id AND a.active = 1)'),
        blocked: uno('SELECT COUNT(*) AS count FROM workflow_blocks WHERE active = 1'),
        institutions: uno('SELECT COUNT(*) AS count FROM institutions WHERE active = 1'),
        auditEvents: uno('SELECT COUNT(*) AS count FROM audit_events'),
      };
    },
    async bloqueosActivos() {
      return getSqlite().prepare(`SELECT block.process_id AS processId, institution.name AS institutionName, block.scope, block.reason, block.created_at AS createdAt FROM workflow_blocks block JOIN processes process ON process.id = block.process_id JOIN institutions institution ON institution.id = process.institution_id WHERE block.active = 1 ORDER BY block.created_at DESC`).all() as AdminControlCenter['blocks'];
    },
    async ultimosEventos(limite) {
      return getSqlite().prepare(`SELECT event.action, actor.display_name AS actorName, institution.name AS institutionName, event.created_at AS createdAt FROM audit_events event JOIN users actor ON actor.id = event.actor_user_id LEFT JOIN processes process ON process.id = event.process_id LEFT JOIN institutions institution ON institution.id = process.institution_id ORDER BY event.created_at DESC LIMIT ?`).all(limite) as AdminControlCenter['events'];
    },
  };
}
```

Crear `src/modules/admin/control-center-supabase.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminControlCenter, PuertoCentroControl } from './control-center';

const MENSAJE = 'No fue posible consultar el centro de control.';
/** Eventos sin actor (p. ej. la recuperación desde /setup). */
const SIN_ACTOR = 'Sistema LEXCON';

type FilaBloqueo = { id_proceso: string; alcance: string; motivo: string; creado_en: string };
type FilaProceso = { id: string; id_institucion: string };
type FilaInstitucion = { id: string; nombre: string };
type FilaEvento = { accion: string; id_actor: string | null; id_institucion: string | null; creado_en: string };
type FilaPerfil = { id_usuario: string; nombre_mostrado: string };

function filas<T>(respuesta: { data: unknown; error: unknown }): T[] {
  if (respuesta.error) throw new Error(MENSAJE);
  return (respuesta.data ?? []) as T[];
}

async function contar(consulta: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw new Error(MENSAJE);
  return count ?? 0;
}

async function nombresInstituciones(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const instituciones = filas<FilaInstitucion>(await supabase.from('instituciones_educativas').select('id,nombre').in('id', ids));
  return new Map(instituciones.map((institucion) => [institucion.id, institucion.nombre]));
}

/** Adaptador delgado con consultas separadas, como supabase-process-summaries.ts. */
export function crearPuertoCentroControlSupabase(supabase: SupabaseClient): PuertoCentroControl {
  return {
    async contadores() {
      const [processes, asignados, blocked, institutions, auditEvents] = await Promise.all([
        contar(supabase.from('procesos_contratacion').select('id', { count: 'exact', head: true })),
        contar(supabase.from('responsables_proceso').select('id', { count: 'exact', head: true }).eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true)),
        contar(supabase.from('bloqueos_proceso').select('id', { count: 'exact', head: true }).eq('activo', true)),
        contar(supabase.from('instituciones_educativas').select('id', { count: 'exact', head: true }).eq('activo', true)),
        contar(supabase.from('eventos_auditoria').select('id', { count: 'exact', head: true })),
      ]);
      // Un índice único garantiza a lo sumo un ABOGADO activo por proceso.
      return { processes, unassigned: Math.max(processes - asignados, 0), blocked, institutions, auditEvents };
    },
    async bloqueosActivos() {
      const bloqueos = filas<FilaBloqueo>(await supabase.from('bloqueos_proceso').select('id_proceso,alcance,motivo,creado_en').eq('activo', true).order('creado_en', { ascending: false }));
      if (!bloqueos.length) return [];
      const procesos = filas<FilaProceso>(await supabase.from('procesos_contratacion').select('id,id_institucion').in('id', [...new Set(bloqueos.map((bloqueo) => bloqueo.id_proceso))]));
      const institucionPorProceso = new Map(procesos.map((proceso) => [proceso.id, proceso.id_institucion]));
      const nombres = await nombresInstituciones(supabase, [...new Set(procesos.map((proceso) => proceso.id_institucion))]);
      return bloqueos.map((bloqueo): AdminControlCenter['blocks'][number] => ({
        processId: bloqueo.id_proceso,
        institutionName: nombres.get(institucionPorProceso.get(bloqueo.id_proceso) ?? '') ?? 'Institución no disponible',
        scope: bloqueo.alcance,
        reason: bloqueo.motivo,
        createdAt: bloqueo.creado_en,
      }));
    },
    async ultimosEventos(limite) {
      const eventos = filas<FilaEvento>(await supabase.from('eventos_auditoria').select('accion,id_actor,id_institucion,creado_en').order('creado_en', { ascending: false }).limit(limite));
      if (!eventos.length) return [];
      const idsActores = [...new Set(eventos.flatMap((evento) => (evento.id_actor ? [evento.id_actor] : [])))];
      const perfiles = idsActores.length ? filas<FilaPerfil>(await supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado').in('id_usuario', idsActores)) : [];
      const nombresActores = new Map(perfiles.map((perfil) => [perfil.id_usuario, perfil.nombre_mostrado]));
      const nombres = await nombresInstituciones(supabase, [...new Set(eventos.flatMap((evento) => (evento.id_institucion ? [evento.id_institucion] : [])))]);
      return eventos.map((evento): AdminControlCenter['events'][number] => ({
        action: evento.accion,
        actorName: (evento.id_actor ? nombresActores.get(evento.id_actor) : undefined) ?? SIN_ACTOR,
        institutionName: evento.id_institucion ? nombres.get(evento.id_institucion) ?? null : null,
        createdAt: evento.creado_en,
      }));
    },
  };
}
```

- [ ] **Paso 4: ejecutar y comprobar**

Ejecutar: `corepack pnpm exec vitest run tests/unit/control-center.test.ts tests/integration/control-center-local.test.ts`
Esperado: PASAN (7 pruebas). `corepack pnpm typecheck` todavía FALLA en `alerts/page.tsx` y `audit/page.tsx` (llaman a `getAdminControlCenter()` sin actor y de forma síncrona): se corrige en la Tarea 13 antes de confirmar.

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 13.

---

### Task 13: Pantallas de Alertas y bloqueos y Registro de actuaciones, etiquetas y confirmación de A4

**Archivos**
- Crear: `src/modules/admin/audit-labels.ts`
- Modificar (reescribir): `src/app/dashboard/admin/alerts/page.tsx`, `src/app/dashboard/admin/audit/page.tsx`
- Modificar: `src/app/dashboard/_components/process-status.tsx`, `src/platform/features.ts`, `docs/current-state.md`
- Probar: `tests/unit/audit-labels.test.ts`, `tests/unit/process-status-labels.test.ts`

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `tests/unit/audit-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { etiquetaAccion } from '../../src/modules/admin/audit-labels';

describe('etiquetas del Registro de actuaciones', () => {
  it.each<[string, string]>([
    ['ABOGADO_ASIGNADO', 'Abogado asignado'],
    ['EXPEDIENTE_ABIERTO_DESDE_COTIZACIONES', 'Proceso creado desde cotizaciones'],
    ['ACCESS_CREATED', 'Acceso creado por invitación'],
    ['EMAIL_CORRECTED', 'Correo corregido por Administración'],
    ['INSTITUCION_CREADA', 'Institución registrada'],
    ['INSTITUCION_SERVICIO_REACTIVADO', 'Servicio reactivado'],
    ['ATTORNEY_ASSIGNED', 'Abogado asignado'],
    ['INSTITUTION_SERVICE_ENDED', 'Servicio finalizado'],
  ])('%s → %s', (accion, etiqueta) => {
    expect(etiquetaAccion(accion)).toBe(etiqueta);
  });

  it('una acción desconocida se muestra tal cual, también si coincide con una propiedad del prototipo', () => {
    expect(etiquetaAccion('ACCION_NUEVA')).toBe('ACCION_NUEVA');
    expect(etiquetaAccion('constructor')).toBe('constructor');
  });
});
```

Crear `tests/unit/process-status-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { phaseLabel } from '../../src/app/dashboard/_components/process-status';

describe('etiquetas de etapa', () => {
  it('traduce también el alcance de bloqueo que usa Supabase', () => {
    expect(phaseLabel('MERCADO')).toBe('Etapa de mercado');
    expect(phaseLabel('MARKET')).toBe('Etapa de mercado');
    expect(phaseLabel('OTRA')).toBe('OTRA');
  });
});
```

- [ ] **Paso 2: ejecutar y comprobar que fallan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/audit-labels.test.ts tests/unit/process-status-labels.test.ts`
Esperado: FALLAN: `audit-labels` no existe; `phaseLabel('MERCADO')` devuelve `'MERCADO'`.

- [ ] **Paso 3: implementar etiquetas**

Crear `src/modules/admin/audit-labels.ts`:

```ts
/** Acciones de eventos_auditoria (Supabase, nomenclatura mixta heredada) y de audit_events (demostración local). */
const ETIQUETAS: Readonly<Record<string, string>> = {
  EXPEDIENTE_ABIERTO_DESDE_COTIZACIONES: 'Proceso creado desde cotizaciones',
  ABOGADO_ASIGNADO: 'Abogado asignado',
  ACCESS_CREATED: 'Acceso creado por invitación',
  ACCESS_ACTIVATED: 'Acceso activado',
  ACCESS_DEACTIVATED: 'Acceso desactivado',
  ADMIN_RECOVERED: 'Acceso de Administrador recuperado',
  EMAIL_CORRECTED: 'Correo corregido por Administración',
  EMAIL_CHANGE_REQUESTED: 'Cambio de correo solicitado',
  PASSWORD_CHANGED: 'Contraseña cambiada',
  INSTITUCION_CREADA: 'Institución registrada',
  INSTITUCION_ACTUALIZADA: 'Institución actualizada',
  INSTITUCION_SERVICIO_SUSPENDIDO: 'Servicio suspendido por mora',
  INSTITUCION_SERVICIO_FINALIZADO: 'Servicio finalizado',
  INSTITUCION_SERVICIO_REACTIVADO: 'Servicio reactivado',
  PROCESS_OPENED_FROM_QUOTES: 'Proceso creado desde cotizaciones',
  ATTORNEY_ASSIGNED: 'Abogado asignado',
  INSTITUTION_CREATED: 'Institución registrada',
  INSTITUTION_UPDATED: 'Institución actualizada',
  INSTITUTION_SERVICE_SUSPENDED: 'Servicio suspendido por mora',
  INSTITUTION_SERVICE_ENDED: 'Servicio finalizado',
  ATTORNEY_CREATED: 'Abogado registrado',
  ATTORNEY_UPDATED: 'Abogado actualizado',
  ATTORNEY_DEACTIVATED: 'Abogado desactivado',
};

export function etiquetaAccion(accion: string): string {
  return Object.hasOwn(ETIQUETAS, accion) ? ETIQUETAS[accion] : accion;
}
```

En `src/app/dashboard/_components/process-status.tsx`, reemplazar `const labels: Record<string, string> = { MARKET: 'Etapa de mercado',` por:

```tsx
const labels: Record<string, string> = { MERCADO: 'Etapa de mercado', MARKET: 'Etapa de mercado',
```

- [ ] **Paso 4: reescribir las pantallas**

Reemplazar todo `src/app/dashboard/admin/alerts/page.tsx` por:

```tsx
import Link from 'next/link';
import { getAdminControlCenter } from '@/modules/admin/control-center';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { phaseLabel } from '../../_components/process-status';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function AlertsPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const control = await getAdminControlCenter(user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/alerts"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Seguimiento operativo</p><h1>Alertas y bloqueos</h1><p>Revise impedimentos activos. Cada alerta abre directamente el expediente y la actuación afectada.</p></div></header><section className="alert-directory"><div className="directory-heading"><div><p className="section-kicker">Bloqueos vigentes</p><h2>Actuaciones que requieren revisión</h2></div><span>{control.counts.blocked} activas</span></div>{control.blocks.length ? <div className="alert-card-grid">{control.blocks.map((block) => <Link href={`/dashboard/processes/${block.processId}`} className="alert-card" key={`${block.processId}-${block.createdAt}`}><span aria-hidden="true">!</span><div><strong>{block.institutionName}</strong><small>{phaseLabel(block.scope)}</small><p>{block.reason}</p></div><b aria-hidden="true">→</b></Link>)}</div> : <div className="empty-state"><strong>No hay alertas operativas activas.</strong></div>}</section></div></WorkspaceShell>;
}
```

Reemplazar todo `src/app/dashboard/admin/audit/page.tsx` por:

```tsx
import { etiquetaAccion } from '@/modules/admin/audit-labels';
import { getAdminControlCenter } from '@/modules/admin/control-center';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function AuditPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const control = await getAdminControlCenter(user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/audit"><div className="page-stack admin-control admin-module"><header className="page-heading app-page-heading"><div><p className="section-kicker">Registro inmutable</p><h1>Trazabilidad</h1><p>Consulte las últimas actuaciones administrativas, institucionales y jurídicas registradas por LEXCON IAG.</p></div></header><section className="audit-directory"><div className="directory-heading"><div><p className="section-kicker">Eventos registrados</p><h2>Historial de actuaciones</h2></div><span>{control.counts.auditEvents} registradas</span></div>{control.events.length ? <ol className="audit-timeline">{control.events.map((event, index) => <li key={`${event.createdAt}-${index}`}><i aria-hidden="true" /><div><strong>{etiquetaAccion(event.action)}</strong><span>{event.actorName}{event.institutionName ? ` · ${event.institutionName}` : ''}</span></div><time>{new Date(event.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</time></li>)}</ol> : <div className="empty-state"><strong>Aún no hay actuaciones registradas.</strong></div>}</section></div></WorkspaceShell>;
}
```

- [ ] **Paso 5: habilitar las funciones**

En `src/platform/features.ts`, reemplazar:

```ts
  ALERTAS_BLOQUEOS: {
    etiqueta: 'Alertas y bloqueos',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/alerts/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/alerts'],
    modulos: ['modules/admin/control-center.ts'],
  },
  REGISTRO_ACTUACIONES: {
    etiqueta: 'Registro de actuaciones',
    subproyecto: 'A',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/admin/audit/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/audit'],
    modulos: ['modules/admin/control-center.ts'],
  },
```

por:

```ts
  ALERTAS_BLOQUEOS: {
    etiqueta: 'Alertas y bloqueos',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/alerts/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/alerts'],
    modulos: ['modules/admin/control-center.ts', 'modules/admin/control-center-supabase.ts'],
  },
  REGISTRO_ACTUACIONES: {
    etiqueta: 'Registro de actuaciones',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/audit/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/audit'],
    modulos: ['modules/admin/control-center.ts', 'modules/admin/control-center-supabase.ts'],
  },
```

- [ ] **Paso 6: ejecutar y comprobar que pasan**

Ejecutar: `corepack pnpm exec vitest run tests/unit/audit-labels.test.ts tests/unit/process-status-labels.test.ts tests/unit/funciones-coherencia.test.ts tests/unit/navigation.test.ts` y `corepack pnpm typecheck`
Esperado: PASAN; sin errores de tipos.

- [ ] **Paso 7: documentar**

En `docs/current-state.md`, reemplazar `depende de SQLite); queda para el subproyecto C.` (final del punto A3) por ese mismo texto seguido de:

```markdown
- **Alertas y bloqueos y Registro de actuaciones (A4):** `getAdminControlCenter(actor)` es asíncrona, exige `ACCESS_MANAGE` y lee de Supabase los bloqueos activos (`bloqueos_proceso` con su institución), los últimos 8 eventos de `eventos_auditoria` con el nombre de quien actuó («Sistema LEXCON» si no hay actor) y los contadores; en modo local conserva las consultas SQLite. Las acciones se muestran con `src/modules/admin/audit-labels.ts`, que cubre la nomenclatura de Supabase y la local. La pantalla de Accesos ya no existe, así que el centro de control dejó de listar membresías. Solo el Administrador puede ver Alertas y bloqueos y Registro de actuaciones.
```

- [ ] **Paso 8: verificación del grupo**

Ejecutar: `corepack pnpm typecheck` y `corepack pnpm exec vitest run`
Esperado: sin errores; todas las pruebas pasan.

- [ ] **Paso 9: Commit (solo con autorización explícita)**

```bash
git add src/modules/admin/control-center.ts src/modules/admin/control-center-local.ts src/modules/admin/control-center-supabase.ts \
  src/modules/admin/audit-labels.ts src/app/dashboard/admin/alerts/page.tsx src/app/dashboard/admin/audit/page.tsx \
  src/app/dashboard/_components/process-status.tsx src/platform/features.ts \
  tests/unit/control-center.test.ts tests/integration/control-center-local.test.ts tests/unit/audit-labels.test.ts tests/unit/process-status-labels.test.ts \
  docs/current-state.md
git commit -m "feat: leer alertas, bloqueos y registro de actuaciones desde Supabase" \
  -m "getAdminControlCenter pasa a ser asíncrona con puerto y adaptadores Supabase y SQLite, y exige la capacidad de administración. Las pantallas traducen las acciones de auditoría de ambas bases y el alcance MERCADO de los bloqueos." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

---

## Grupo 6 · Documentación y verificación completa

### Task 14: Decisión 056, arquitectura, estado actual y README

**Archivos**
- Crear: `docs/decisions/056-administracion-supabase-y-funciones-no-disponibles.md`
- Modificar: `docs/architecture.md`, `docs/current-state.md`, `README.md`

- [ ] **Paso 1: escribir la decisión**

Crear `docs/decisions/056-administracion-supabase-y-funciones-no-disponibles.md`:

```markdown
# 056. Administración sobre Supabase y aviso de funciones no disponibles

- **Fecha:** 2026-10-15
- **Estado:** Aceptada. Diseño: `docs/superpowers/specs/2026-10-15-administracion-supabase-design.md`; plan: `docs/superpowers/plans/2026-10-15-administracion-supabase-plan.md`.

## Contexto

En producción LEXCON usa solo Supabase (el contenedor no tiene SQLite), pero buena parte del código de negocio nació sobre SQLite y esas pantallas fallaban con un error de servidor. Corregirlas una por una, a medida que fallaban, no era sostenible.

## Decisión

- **Tabla de funciones:** `src/platform/features.ts` declara cada función que nació sobre SQLite (páginas, rutas de API, opciones de menú y módulos) y si está disponible con Supabase. `funcionDisponible` devuelve siempre `true` en modo local y el valor declarado con Supabase; una configuración de Supabase incompleta cuenta como modo Supabase. Las páginas no disponibles llaman a `exigirFuncion` (pantalla uniforme dentro del marco), las rutas responden 501 con `rutaNoDisponible` y `navFor` oculta sus opciones. `tests/unit/funciones-coherencia.test.ts` analiza las importaciones de cada `page.tsx` y `route.ts` para que ninguna entrada dependiente de SQLite quede fuera de la tabla y para que una función marcada como disponible tenga rama Supabase y no conserve guardas. La tabla es la lista de trabajo de los subproyectos B y C.
- **Patrón de Administración:** servicio puro (reglas y capacidad `ACCESS_MANAGE` o `ATTORNEY_ASSIGN`), puerto, adaptador Supabase delgado con la clave de servicio, adaptador SQLite para la demostración y un `*-runtime.ts` que elige con `supabaseConfigurado()`. Pruebas con un cliente de Supabase simulado.
- **Instituciones Educativas:** las escrituras usan `guardar_institucion`, que en una transacción crea o actualiza la IE (`activo` solo con estado `ACTIVO`), cierra el periodo de servicio vigente y abre uno nuevo cuando cambia el estado, y audita con `registrar_evento_administrativo` (lista cerrada `INSTITUCION_*`, cadena de hash a cargo del disparador existente). Ambas son `security definer`, con `search_path` fijo y ejecutables solo por `service_role`. Se agregan departamento (obligatorio en la base), NIT y código DANE (opcionales y únicos).
- **Abogados y cuentas unificados:** LEXCON no asigna contraseñas. Equipo jurídico es de solo lectura; los abogados se invitan, corrigen y desactivan en Usuarios y accesos. Se retiran la creación de abogados con contraseña temporal y la lista de Accesos.
- **Asignación jurídica:** consulta propia de procesos sin responsable; `asignar_abogado_proceso` sigue siendo la única escritura y la única auditoría.
- **Centro de control:** `getAdminControlCenter` es asíncrona y lee bloqueos, eventos y contadores de Supabase.

## Consecuencias

- La migración `20261015120000_administracion_instituciones_y_eventos.sql` debe aplicarse antes de desplegar; sin ella, registrar o editar una IE responde 500 y el servidor registra el código de PostgREST.
- En modo local no se guardan departamento, NIT ni código DANE, Usuarios y accesos solo muestra un aviso y ya no se pueden crear abogados.
- Con Supabase no se avisa al abogado asignado: `notifyAssignedAttorney` depende de SQLite (subproyecto C).
- Los conteos de cuentas y procesos por IE se calculan en la aplicación descargando filas: suficiente para la escala del piloto.
- Una función nueva que dependa de SQLite hace fallar la prueba de coherencia hasta declararla en la tabla.
```

- [ ] **Paso 2: arquitectura**

En `docs/architecture.md`, reemplazar la línea completa que empieza por ``- `src/modules/admin/`: el resumen de la bandeja`` (la que termina en `preserva sus expedientes.`) por:

```markdown
- `src/modules/admin/`: el resumen de la bandeja (`inbox-summary.ts` y `donut-segments.ts`) son funciones puras que se calculan sobre `listProcessesFor`, por lo que funcionan con SQLite y con Supabase. Instituciones Educativas (`institutions/`), Equipo jurídico (`legal-team/`) y el centro de control de Alertas y bloqueos y Registro de actuaciones (`control-center.ts`) siguen el patrón servicio + puerto + adaptadores Supabase y SQLite; `audit-labels.ts` traduce las acciones de auditoría de ambas bases. `service-administration.ts` conserva solo la administración local de Instituciones Educativas. La finalización de una relación de servicio desactiva la IE de forma lógica y preserva sus procesos.
```

Después, reemplazar `## Directorio jurídico por IE` por:

```markdown
## Administración sobre Supabase y funciones no disponibles

`src/platform/features.ts` es la tabla de funciones que todavía dependen de SQLite (decisión 056). `funcionDisponible(clave)` devuelve `true` en modo local y el valor declarado cuando `supabaseConfigurado()` es verdadero; una configuración incompleta cuenta como modo Supabase para no caer nunca en SQLite. Las páginas de esas funciones llaman a `exigirFuncion` (`src/app/dashboard/_components/no-disponible.tsx`), que muestra «Esta función estará disponible próximamente» dentro de `WorkspaceShell`; sus rutas de API responden 501 sin caché con `rutaNoDisponible` (`src/platform/features-http.ts`), y `navFor` (`src/app/dashboard/_components/navigation.ts`) oculta sus opciones y pasa el rótulo de sección a la siguiente opción visible. `tests/unit/funciones-coherencia.test.ts` analiza las importaciones de cada `page.tsx` y `route.ts`.

La Administración sigue el patrón de `/setup` y Mi cuenta: servicio puro con las reglas y la capacidad, puerto, adaptador Supabase delgado con la clave de servicio y adaptador SQLite para la demostración; un `*-runtime.ts` elige el adaptador con `supabaseConfigurado()`.

- Instituciones Educativas (`src/modules/admin/institutions/`): las escrituras llaman a `public.guardar_institucion`, que en una transacción crea o actualiza la IE, cierra y abre el periodo de `periodos_servicio_ie` cuando cambia el estado y registra el evento con `public.registrar_evento_administrativo` (`supabase/migrations/20261015120000_administracion_instituciones_y_eventos.sql`). Los NIT y códigos DANE duplicados responden 409.
- Equipo jurídico (`src/modules/admin/legal-team/`): vista de solo lectura; invitar, corregir el correo o desactivar se hace en Usuarios y accesos (`?rol=ABOGADO_ARKA` preselecciona el rol). `/dashboard/admin/lawyers/new` y `/dashboard/admin/accesses` redirigen allí.
- Asignación jurídica: `listUnassignedProcesses` usa `listarProcesosSinResponsableSupabase`; `assignAttorneyRemote` llama a `asignar_abogado_proceso` y registra sus fallos con la etiqueta `[asignacion]` y el código de PostgreSQL.
- Alertas y bloqueos y Registro de actuaciones: `getAdminControlCenter(actor)` lee `bloqueos_proceso`, `eventos_auditoria`, perfiles e instituciones con consultas separadas; los contadores usan `count: 'exact', head: true`.

## Directorio jurídico por IE
```

- [ ] **Paso 3: estado actual**

En `docs/current-state.md`:

1. Reemplazar `También puede registrar, modificar o desactivar abogados Arka.` por `Los abogados se invitan, corrigen y desactivan desde Usuarios y accesos; Equipo jurídico es una vista de consulta.`
2. Reemplazar `El registro de Institución Educativa y el registro de abogado son módulos independientes.` por `El registro de Institución Educativa es un módulo independiente; los abogados se registran por invitación en Usuarios y accesos.`
3. Reemplazar `Solo el Administrador puede ver Alertas y bloqueos y Registro de actuaciones.` por esa misma frase seguida de:

```markdown
- **Pendiente para operar:** aplicar en el proyecto remoto la migración `20261015120000_administracion_instituciones_y_eventos.sql` (primero `corepack pnpm dlx supabase@latest db push --dry-run`, después `db push` con la confirmación de la persona responsable), volver a desplegar en Dokploy y recorrer la lista de verificación del plan (Tarea 16). Las funciones de los subproyectos B (expediente) y C (flujo, avisos y worker) siguen marcadas como no disponibles en `src/platform/features.ts`.
```

- [ ] **Paso 4: README**

En `README.md`:

1. Reemplazar ``- `docs/decisions/`: decisiones técnicas numeradas.`` por:

```markdown
- `docs/superpowers/specs/2026-10-15-administracion-supabase-design.md`: diseño aprobado de la migración de Administración a Supabase y del aviso de funciones no disponibles.
- `docs/superpowers/plans/2026-10-15-administracion-supabase-plan.md`: plan de implementación de ese diseño.
- `docs/decisions/`: decisiones técnicas numeradas.
```

2. Reemplazar `## Despliegue temporal en Dokploy` por:

```markdown
## Administración con Supabase

Con Supabase activo, las funciones que todavía dependen de SQLite (manual de contratación, cotizaciones posteriores a la apertura, estudio de mercado, comité evaluador, actuaciones del flujo, documentos generados por IAG y alertas al dispositivo) muestran «Esta función estará disponible próximamente» y no aparecen en el menú; la tabla está en `src/platform/features.ts`. En la demostración local todas siguen disponibles.

Instituciones Educativas, Equipo jurídico, Asignar responsable jurídico, Alertas y bloqueos y Registro de actuaciones funcionan con Supabase. Los abogados se invitan desde **Usuarios y accesos**: la opción **Registrar abogado Lexcon** abre esa pantalla con el rol Abogado elegido. LEXCON ya no crea abogados con contraseña temporal.

Antes de desplegar esta versión aplique la migración `20261015120000_administracion_instituciones_y_eventos.sql`: revise primero `corepack pnpm dlx supabase@latest db push --dry-run` y, con la confirmación de la persona responsable, ejecute `corepack pnpm dlx supabase@latest db push`. Sin ella, registrar o editar una Institución Educativa responde con un error.

## Despliegue temporal en Dokploy
```

- [ ] **Paso 5: sin confirmación**

Se confirma en la Tarea 15, junto con la verificación completa.

---

### Task 15: Verificación completa y confirmación de la documentación

**Archivos**
- Ninguno nuevo (solo comprobaciones).

- [ ] **Paso 1: guías**

Ejecutar: `node scripts/sync-agent-guides.mjs --check`
Esperado: termina sin error (`AGENTS.md` y `CLAUDE.md` idénticos; este plan no los toca).

- [ ] **Paso 2: tipos**

Ejecutar: `corepack pnpm typecheck`
Esperado: sin errores. Si los hay solo en `.next/types` o `.next/dev/types` por rutas eliminadas (`/api/admin/attorneys`, `/api/admin/accesses`), ejecute `corepack pnpm build` y repita.

- [ ] **Paso 3: pruebas**

Ejecutar: `corepack pnpm exec vitest run`
Esperado: todas pasan. Cuenta orientativa: las existentes (unas 348) menos 1 (caso de `setAccessActive` retirado) más las nuevas de este plan (unas 115).

- [ ] **Paso 4: compilación**

Ejecutar: `corepack pnpm build`
Esperado: compila sin errores (requiere red para la fuente). Confirme en la salida que ya no aparecen `/api/admin/attorneys` ni `/api/admin/accesses` y que siguen `/dashboard/admin/lawyers/new` y `/dashboard/admin/accesses` (redirecciones).

- [ ] **Paso 5: revisión de lo preparado**

Ejecutar: `git status --short`
Esperado: solo los cuatro archivos de documentación de la Tarea 14. Ningún archivo de `data/`, `storage/`, `tmp/`, `.env*`, `.next/` ni `node_modules/`.

- [ ] **Paso 6: Commit (solo con autorización explícita)**

```bash
git add docs/decisions/056-administracion-supabase-y-funciones-no-disponibles.md docs/architecture.md docs/current-state.md README.md
git commit -m "docs: documentar la administración sobre Supabase y las funciones no disponibles" \
  -m "Decisión 056, sección de arquitectura, estado actual con la migración pendiente de aplicar y README con el aviso de funciones no disponibles y el registro de abogados por invitación." \
  -m "Co-Authored-By: <línea de coautoría que indique su entorno> <noreply@anthropic.com>"
```

Publicar (`git push`) o fusionar con `main` (rama que despliega Dokploy) también requiere autorización explícita y separada.

---

## Verificación en el dominio (con la persona responsable)

### Task 16: Aplicar la migración, desplegar y recorrer la lista de verificación

**Archivos**
- Ninguno, salvo que la persona responsable pida dejar constancia en `docs/current-state.md` (en ese caso, un cambio de documentación con su propia autorización de confirmación).

Esta tarea es manual y se hace con la persona responsable presente. Nada se aplica de forma automática.

- [ ] **Paso 1: requisitos**

Los seis grupos confirmados y la versión publicada en la rama que despliega Dokploy, cada operación con su autorización explícita. La CLI de Supabase ya está enlazada al proyecto remoto LEXCON IAG.

- [ ] **Paso 2: simulación de la migración**

Ejecutar: `corepack pnpm dlx supabase@latest db push --dry-run`
Esperado: lista **solo** `20261015120000_administracion_instituciones_y_eventos.sql`. Si aparece cualquier otra migración, deténgase y consulte.

- [ ] **Paso 3: aplicar (solo con confirmación expresa)**

Muestre la salida del paso 2 y pregunte: «¿Aplico la migración 20261015120000 al proyecto remoto?». Solo con un «sí» explícito:

Ejecutar: `corepack pnpm dlx supabase@latest db push`
Esperado: la migración aplicada sin errores.

- [ ] **Paso 4: comprobar las funciones (lectura, en el editor SQL de Supabase, por la persona responsable)**

```sql
select proname, prosecdef, proacl
from pg_proc
where proname in ('guardar_institucion', 'registrar_evento_administrativo');
```

Esperado: dos filas, `prosecdef = true`, y `proacl` con `service_role=X` y sin `anon`, `authenticated` ni `PUBLIC`.

- [ ] **Paso 5: volver a desplegar en Dokploy (con confirmación)**

La persona responsable lanza el despliegue de la aplicación (o lo autoriza expresamente). Esperar a que el contenedor esté sano (`/api/health`).

- [ ] **Paso 6: lista de verificación (como Administrador en `https://lexcon.arkaiag.com`)**

- [ ] El menú muestra: Bandeja de trabajo, Procesos por IE, Asignar responsable jurídico, Alertas y bloqueos, Instituciones Educativas, Registrar Institución Educativa, Equipo jurídico, Registrar abogado Lexcon, Usuarios y accesos, Registro de actuaciones y Mi cuenta.
- [ ] Registrar Institución Educativa con nombre, ciudad, **departamento**, sin NIT ni DANE: abre su ficha con «Servicio activo».
- [ ] Editar esa IE agregando NIT y código DANE: la ficha los muestra. Registrar otra IE con el mismo NIT: aparece «Ya existe una Institución Educativa con ese NIT.» y no se crea.
- [ ] Cambiar el estado a «Suspendida por mora» con una observación: la ficha dice «Acceso institucional no habilitado». En el editor de tablas de Supabase, `periodos_servicio_ie` de esa IE tiene un periodo cerrado (`finaliza_en` de hoy) y uno abierto `SUSPENDIDO` con la observación como motivo.
- [ ] Reactivar («Servicio activo»): se abre un nuevo periodo `ACTIVO`.
- [ ] Registro de actuaciones muestra «Institución registrada», «Institución actualizada», «Servicio suspendido por mora» y «Servicio reactivado» con el nombre del Administrador y la IE.
- [ ] Equipo jurídico → «Invitar abogado»: abre Usuarios y accesos con el rol Abogado elegido. Si la persona responsable quiere probar una invitación, que use un buzón propio de prueba (no se inventan correos ni datos de terceros).
- [ ] Asignar responsable jurídico: el proceso pendiente aparece; asignarlo a un abogado activo muestra «La asignación jurídica fue registrada.», el proceso deja la lista y Registro de actuaciones muestra «Abogado asignado».
- [ ] Alertas y bloqueos: los bloqueos activos (p. ej. «No existe reglamento institucional aplicable.», etapa «Etapa de mercado») abren su proceso.
- [ ] `/dashboard/admin/lawyers/new` y `/dashboard/admin/accesses` redirigen a Usuarios y accesos.
- [ ] Como Rector o Apoyo IE: el menú no muestra «Manual de contratación IE»; abrir `/dashboard/regulations` directamente muestra «Esta función estará disponible próximamente» dentro del marco; `GET /api/regulations` (pestaña Red del navegador) responde 501.

- [ ] **Paso 7: si la asignación sigue fallando**

Pida a la persona responsable las líneas del registro del contenedor en Dokploy alrededor del intento (las que contengan `[asignacion]`, `[instituciones]` o el *digest* del error de Next). No copie claves, correos ni cookies. Con el código de PostgreSQL o el motivo registrado, abra una corrección específica (y su prueba) antes de dar A3 por cerrado.

- [ ] **Paso 8: dejar constancia (opcional, con autorización)**

Si la persona responsable lo pide, actualice en `docs/current-state.md` el punto «Pendiente para operar» indicando que la migración quedó aplicada y verificada (con fecha), y confírmelo solo con su autorización explícita.

---

## Autorrevisión del plan

- **Cobertura del diseño:** Parte 0 (tabla, `funcionDisponible`, `exigirFuncion`/`NoDisponible`, menú, 501, prueba de coherencia) → Tareas 1 a 4. A1 (módulo, listar y ver con cuentas y procesos, crear y editar con validaciones y estados, periodos atómicos, duplicados, campos del formulario) → Tareas 5 a 8. A2 (Equipo jurídico de solo lectura, menú hacia Usuarios y accesos, retiro de `/api/admin/attorneys`, de la parte de abogados de `service-administration.ts`, de Accesos y de `access-management.ts`) → Tareas 9 y 10. A3 (consulta propia, contrato de `asignar_abogado_proceso`, sin `notifyAssignedAttorney` con Supabase, causa del error) → Tarea 11 y Tarea 16, paso 7. A4 (`getAdminControlCenter` asíncrona, pantallas, solo Administrador) → Tareas 12 y 13. Migración con ambas funciones → Tarea 5. Seguridad (clave solo en servidor, mensajes genéricos, registro con etiqueta y código) → Tareas 6, 7, 11 y 12. Documentación → Tareas 4, 8, 10, 11, 13 y 14. Verificación en el dominio → Tarea 16.
- **Sin marcadores pendientes:** cada paso de código contiene el código completo; las únicas sustituciones que hace quien implementa son la línea de coautoría del commit, que depende de su entorno.
- **Nombres coherentes entre tareas:** `ClaveFuncion`, `FUNCIONES`, `funcionDisponible`, `rutaMenuDisponible`, `claveDeRutaMenu`, `MENSAJE_NO_DISPONIBLE`, `rutaNoDisponible`, `exigirFuncion`, `NoDisponible`, `navFor`; `InstitucionAdministrada`, `DatosInstitucion`, `EntradaInstitucion`, `PuertoInstituciones`, `ErrorInstitucion`, `crearPuertoInstitucionesSupabase`, `crearPuertoInstitucionesLocal`, `puertoInstituciones`; `AbogadoEquipo`, `PuertoEquipoJuridico`, `listarEquipoJuridico`, `puertoEquipoJuridico`; `listarProcesosSinResponsableSupabase`; `AdminControlCenter`, `PuertoCentroControl`, `obtenerCentroControl`, `getAdminControlCenter`, `LIMITE_EVENTOS`; `etiquetaAccion`; `rolInicialDesdeConsulta`; `crearSupabaseFalso`, `operaciones`, `consultasDe`.
- **Cada prueba falla antes de su implementación:** módulos inexistentes (Tareas 1, 2, 3, 6, 9, 12, 13), guardas ausentes (Tarea 4), archivo SQL inexistente (Tarea 5), ruta con contrato antiguo (Tarea 7), función marcada disponible con páginas aún SQLite (Tarea 8), archivos aún presentes y menú antiguo (Tarea 10), función y diagnóstico inexistentes (Tarea 11). Excepción declarada: `migracion-asignar-abogado.test.ts` es una prueba de caracterización de SQL ya existente y pasa desde el principio.
- **TypeScript estricto:** los resultados de supabase-js se convierten con `as unknown as` (como `supabase-user-administration.ts`); los `it.each` con tuplas mixtas declaran su tipo; los tipos que importan componentes cliente son `import type`; las rutas solo exportan manejadores y `dynamic`. Entre la Tarea 12 y la 13 `tsc` falla a propósito en dos páginas, y entre la Tarea 7 y el paso 5 de la Tarea 8 falla a propósito la prueba de coherencia: ambos estados intermedios se corrigen antes de confirmar su grupo.
