# Configuración inicial del administrador y Mi cuenta: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el primer administrador cree su acceso desde `/setup` con un código de servidor, que cualquier rol cambie su contraseña y su correo desde Mi cuenta, y que el administrador corrija el correo de otra persona que ya no pueda abrir el suyo.

**Architecture:** La lógica de negocio vive en servicios puros (`setup-administrator.ts`, `account-service.ts`, `email-correction.ts`) que dependen de un "puerto" (interfaz) para hablar con Supabase. Así se prueban con dobles en `vitest` sin red. Adaptadores delgados implementan cada puerto con `@supabase/supabase-js`. Un trigger en Postgres sincroniza `perfiles_usuario.correo_electronico` cuando cambia `auth.users.email`, de modo que todos los caminos de cambio de correo quedan coherentes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase Auth + Postgres (clave de servicio solo en servidor), Vitest. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-11-setup-administrador-y-mi-cuenta-design.md`

---

## Reglas de ejecución (leer antes de empezar)

1. **Next.js de esta versión no es el que conoces.** Antes de escribir una ruta, página o `layout`, lee la guía correspondiente en `node_modules/next/dist/docs/` y respeta los avisos de obsolescencia.
2. **Git:** `CLAUDE.md` prohíbe `git add`, `git commit` y `git push` sin autorización explícita para esa operación. Cada paso "Commit" de este plan se ejecuta **solo** si la persona lo autorizó para esa tarea; si no, deja los cambios sin preparar y avisa.
3. **El hook de pre-commit exige documentación preparada** en todo commit que incluya código. Por eso cada commit de este plan incluye un paso de documentación.
4. **Nunca** conectes pruebas ni scripts a la base de Supabase de producción. Las pruebas unitarias no necesitan red. La verificación contra Supabase real se hace solo en el dominio, siguiendo la Tarea 10.
5. **No guardes** secretos, contraseñas ni el código `LEXCON_SETUP_TOKEN` en archivos versionados.
6. Comandos de comprobación del proyecto: `corepack pnpm typecheck`, `corepack pnpm test`, `node scripts/sync-agent-guides.mjs --check`. Una prueba suelta: `corepack pnpm exec vitest run tests/unit/<archivo>.test.ts`.
7. Idioma de la interfaz, mensajes y comentarios del repositorio: **español**.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/platform/auth/password-policy.ts` | Crear | Longitud mínima (8) y validación única de contraseñas web. |
| `src/platform/security/attempt-limiter.ts` | Crear | Limitador de intentos fallidos en memoria. |
| `src/platform/security/mask-email.ts` | Crear | Enmascara correos para auditoría. |
| `src/modules/access/setup-administrator.ts` | Crear | Servicio de `/setup` (primer administrador y recuperación) sobre un puerto. |
| `src/modules/access/setup-administrator-supabase.ts` | Crear | Adaptador de Supabase para el puerto de `/setup`. |
| `src/app/api/setup/route.ts` | Crear | Endpoint `POST /api/setup` con limitación de intentos. |
| `src/app/setup/page.tsx` | Crear | Página de servidor: decide el modo o responde "no encontrada". |
| `src/app/setup/setup-form.tsx` | Crear | Formulario de cliente de `/setup`. |
| `supabase/migrations/20261011150000_sincronizar_correo_y_auditar_acceso.sql` | Crear | Trigger de sincronización de correo y función de auditoría de accesos. |
| `src/modules/access/account-service.ts` | Crear | Servicio de Mi cuenta sobre un puerto. |
| `src/modules/access/account-port-supabase.ts` | Crear | Adaptador de Supabase para Mi cuenta. |
| `src/app/api/account/route.ts` | Crear | `PATCH /api/account` (nombre, contraseña, correo). |
| `src/app/dashboard/account/page.tsx` | Crear | Página Mi cuenta. |
| `src/app/dashboard/account/account-forms.tsx` | Crear | Formularios de cliente de Mi cuenta. |
| `src/app/dashboard/_components/workspace-shell.tsx` | Modificar | Añadir "Mi cuenta" a la navegación de cuatro roles. |
| `src/modules/access/email-correction.ts` | Crear | Servicio de corrección de correo por el administrador + adaptador. |
| `src/app/api/admin/users/route.ts` | Modificar | Acción `CORREGIR_CORREO`. |
| `src/app/dashboard/admin/user-access-management.tsx` | Reescribir | Misma funcionalidad, legible, más "Corregir correo". |
| `src/app/api/auth/update-password/route.ts` | Modificar | Usar la política de 8 caracteres. |
| `src/app/auth/update-password/update-password-form.tsx` | Modificar | Mínimo y texto de 8 caracteres. |
| `.env.example`, `README.md`, `docs/architecture.md`, `docs/current-state.md`, `docs/decisions/054-configuracion-inicial-y-mi-cuenta.md` | Modificar/Crear | Documentación obligatoria. |
| `tests/unit/*.test.ts` | Crear | Una prueba por unidad (ver cada tarea). |

---

### Task 1: Política de contraseñas de 8 caracteres

**Files:**
- Create: `src/platform/auth/password-policy.ts`
- Create: `tests/unit/password-policy.test.ts`
- Modify: `src/app/api/auth/update-password/route.ts:9`
- Modify: `src/app/auth/update-password/update-password-form.tsx`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `tests/unit/password-policy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, validarContrasena } from '../../src/platform/auth/password-policy';

describe('política de contraseñas web', () => {
  it('exige al menos 8 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(() => validarContrasena('1234567')).toThrow('al menos 8 caracteres');
    expect(validarContrasena('12345678')).toBe('12345678');
  });

  it('rechaza valores que no son texto', () => {
    expect(() => validarContrasena(undefined)).toThrow('al menos 8 caracteres');
    expect(() => validarContrasena(12345678)).toThrow('al menos 8 caracteres');
  });

  it('rechaza contraseñas excesivamente largas', () => {
    expect(() => validarContrasena('a'.repeat(129))).toThrow('no puede superar 128');
    expect(validarContrasena('a'.repeat(128))).toHaveLength(128);
  });
});
```

- [ ] **Step 2: Ejecutarla y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/password-policy.test.ts`
Expected: FAIL con `Failed to resolve import "../../src/platform/auth/password-policy"`.

- [ ] **Step 3: Implementar**

Crear `src/platform/auth/password-policy.ts`:

```ts
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Política única de contraseñas de los flujos web (activación, recuperación, /setup y Mi cuenta). */
export function validarContrasena(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`);
  }
  return password;
}
```

- [ ] **Step 4: Ejecutar la prueba y comprobar que pasa**

Run: `corepack pnpm exec vitest run tests/unit/password-policy.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Aplicar la política a la ruta de definir contraseña**

En `src/app/api/auth/update-password/route.ts`, agregar el import y reemplazar la línea 9.

Agregar bajo los imports existentes:

```ts
import { validarContrasena } from '@/platform/auth/password-policy';
```

Reemplazar:

```ts
    if (!password || password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
```

por:

```ts
    validarContrasena(password);
```

- [ ] **Step 6: Alinear el formulario de cliente**

En `src/app/auth/update-password/update-password-form.tsx`:

1. Agregar bajo los imports: `import { MIN_PASSWORD_LENGTH } from '@/platform/auth/password-policy';`
2. Reemplazar las dos apariciones de `minLength={12}` por `minLength={MIN_PASSWORD_LENGTH}`.
3. Reemplazar el texto `Use una contraseña única de al menos doce caracteres.` por `Use una contraseña única de al menos ocho caracteres.`

- [ ] **Step 7: Comprobar tipos y suite**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: sin errores de tipos; todas las pruebas pasan.

(El commit de esta tarea se agrupa con el de la Tarea 6.)

---

### Task 2: Limitador de intentos y enmascarado de correos

**Files:**
- Create: `src/platform/security/attempt-limiter.ts`
- Create: `src/platform/security/mask-email.ts`
- Create: `tests/unit/attempt-limiter.test.ts`
- Create: `tests/unit/mask-email.test.ts`

- [ ] **Step 1: Escribir las pruebas que fallan**

`tests/unit/attempt-limiter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AttemptLimiter } from '../../src/platform/security/attempt-limiter';

function crear() {
  let ahora = 1_000_000;
  const limitador = new AttemptLimiter({ maxFailures: 5, windowMs: 15 * 60_000, now: () => ahora });
  return { limitador, avanzar: (ms: number) => { ahora += ms; } };
}

describe('limitador de intentos', () => {
  it('no bloquea antes de alcanzar el máximo de fallos', () => {
    const { limitador } = crear();
    for (let i = 0; i < 4; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('bloquea al quinto fallo durante la ventana completa', () => {
    const { limitador, avanzar } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(true);
    avanzar(14 * 60_000);
    expect(limitador.isBlocked('ip-1')).toBe(true);
    avanzar(61_000);
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('cuenta cada clave por separado', () => {
    const { limitador } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-2')).toBe(false);
  });

  it('olvida los fallos antiguos fuera de la ventana', () => {
    const { limitador, avanzar } = crear();
    for (let i = 0; i < 4; i++) limitador.recordFailure('ip-1');
    avanzar(16 * 60_000);
    limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('reset elimina el estado de una clave', () => {
    const { limitador } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    limitador.reset('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });
});
```

`tests/unit/mask-email.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { enmascararCorreo } from '../../src/platform/security/mask-email';

describe('enmascarado de correos', () => {
  it('conserva la primera letra y el dominio', () => {
    expect(enmascararCorreo('persona@dominio.com')).toBe('p******@dominio.com');
  });

  it('usa al menos tres asteriscos en usuarios cortos', () => {
    expect(enmascararCorreo('ab@x.co')).toBe('a***@x.co');
  });

  it('no revela nada si el valor no parece un correo', () => {
    expect(enmascararCorreo('sin-arroba')).toBe('***');
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `corepack pnpm exec vitest run tests/unit/attempt-limiter.test.ts tests/unit/mask-email.test.ts`
Expected: FAIL por imports no resueltos.

- [ ] **Step 3: Implementar el limitador**

`src/platform/security/attempt-limiter.ts`:

```ts
export interface AttemptLimiterOptions {
  maxFailures: number;
  windowMs: number;
  now?: () => number;
}

interface Estado { failures: number[]; blockedUntil: number }

/**
 * Limitador en memoria del proceso. Es suficiente para el despliegue de una sola
 * instancia en Dokploy; con varias instancias cada una llevaría su propio conteo.
 */
export class AttemptLimiter {
  private readonly state = new Map<string, Estado>();

  constructor(private readonly options: AttemptLimiterOptions) {}

  private now(): number { return (this.options.now ?? Date.now)(); }

  isBlocked(key: string): boolean {
    const estado = this.state.get(key);
    return Boolean(estado && estado.blockedUntil > this.now());
  }

  recordFailure(key: string): void {
    const ahora = this.now();
    const estado = this.state.get(key) ?? { failures: [], blockedUntil: 0 };
    estado.failures = estado.failures.filter((momento) => momento > ahora - this.options.windowMs);
    estado.failures.push(ahora);
    if (estado.failures.length >= this.options.maxFailures) {
      estado.blockedUntil = ahora + this.options.windowMs;
      estado.failures = [];
    }
    this.state.set(key, estado);
    if (this.state.size > 5000) this.prune(ahora);
  }

  reset(key: string): void { this.state.delete(key); }

  private prune(ahora: number): void {
    for (const [key, estado] of this.state) {
      const vigentes = estado.failures.some((momento) => momento > ahora - this.options.windowMs);
      if (estado.blockedUntil <= ahora && !vigentes) this.state.delete(key);
    }
  }
}
```

- [ ] **Step 4: Implementar el enmascarado**

`src/platform/security/mask-email.ts`:

```ts
/** Oculta casi todo el usuario del correo para dejarlo en auditoría sin exponerlo completo. */
export function enmascararCorreo(correo: string): string {
  const [local, dominio] = correo.split('@');
  if (!local || !dominio) return '***';
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${dominio}`;
}
```

- [ ] **Step 5: Ejecutar y comprobar que pasan**

Run: `corepack pnpm exec vitest run tests/unit/attempt-limiter.test.ts tests/unit/mask-email.test.ts`
Expected: PASS (8 pruebas).

---

### Task 3: Servicio de `/setup` (primer administrador y recuperación)

**Files:**
- Create: `src/modules/access/setup-administrator.ts`
- Create: `tests/unit/setup-administrator.test.ts`

- [ ] **Step 1: Escribir la prueba que falla**

`tests/unit/setup-administrator.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  codigoConfiguracionActivo, codigoCoincide, crearPrimerAdministrador, ErrorConfiguracion,
  estadoConfiguracion, listarAdministradores, recuperarAdministrador, type PuertoConfiguracion,
} from '../../src/modules/access/setup-administrator';

const CODIGO = 'codigo-de-prueba-con-24-caracteres!';

function puertoFalso(parcial: Partial<PuertoConfiguracion> = {}): PuertoConfiguracion {
  return {
    contarAdministradoresActivos: vi.fn().mockResolvedValue(0),
    listarAdministradoresActivos: vi.fn().mockResolvedValue([]),
    crearUsuarioAuth: vi.fn().mockResolvedValue({ id: 'u-1' }),
    registrarAdministrador: vi.fn().mockResolvedValue(undefined),
    eliminarUsuarioAuth: vi.fn().mockResolvedValue(undefined),
    actualizarCredenciales: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

const entradaValida = { codigo: CODIGO, nombre: 'Ana Pérez', correo: 'Ana@Correo.com', contrasena: 'clave-segura-1' };

describe('código de configuración', () => {
  it('solo está activo si tiene al menos 24 caracteres', () => {
    expect(codigoConfiguracionActivo({ LEXCON_SETUP_TOKEN: 'corto' } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(codigoConfiguracionActivo({} as NodeJS.ProcessEnv)).toBeNull();
    expect(codigoConfiguracionActivo({ LEXCON_SETUP_TOKEN: `  ${CODIGO}  ` } as unknown as NodeJS.ProcessEnv)).toBe(CODIGO);
  });

  it('compara en tiempo constante sin lanzar con longitudes distintas', () => {
    expect(codigoCoincide(CODIGO, CODIGO)).toBe(true);
    expect(codigoCoincide(CODIGO, `${CODIGO}x`)).toBe(false);
    expect(codigoCoincide(CODIGO, 'x')).toBe(false);
    expect(codigoCoincide(CODIGO, undefined)).toBe(false);
  });
});

describe('estado de configuración', () => {
  it('es primer administrador cuando no hay administradores activos', async () => {
    await expect(estadoConfiguracion(puertoFalso())).resolves.toBe('PRIMER_ADMINISTRADOR');
  });

  it('es recuperación cuando ya existe uno', async () => {
    const puerto = puertoFalso({ contarAdministradoresActivos: vi.fn().mockResolvedValue(1) });
    await expect(estadoConfiguracion(puerto)).resolves.toBe('RECUPERACION');
  });
});

describe('crearPrimerAdministrador', () => {
  it('crea la cuenta con el correo en minúsculas y registra el rol', async () => {
    const puerto = puertoFalso();
    await crearPrimerAdministrador(puerto, CODIGO, entradaValida);
    expect(puerto.crearUsuarioAuth).toHaveBeenCalledWith({ correo: 'ana@correo.com', contrasena: 'clave-segura-1', nombre: 'Ana Pérez' });
    expect(puerto.registrarAdministrador).toHaveBeenCalledWith({ idUsuario: 'u-1', nombre: 'Ana Pérez', correo: 'ana@correo.com' });
  });

  it('rechaza un código incorrecto sin tocar el puerto', async () => {
    const puerto = puertoFalso();
    await expect(crearPrimerAdministrador(puerto, CODIGO, { ...entradaValida, codigo: 'otro' })).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('responde "no disponible" si el servidor no tiene código', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), null, entradaValida)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
  });

  it('rechaza contraseñas de menos de 8 caracteres', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), CODIGO, { ...entradaValida, contrasena: '1234567' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo inválido', async () => {
    await expect(crearPrimerAdministrador(puertoFalso(), CODIGO, { ...entradaValida, correo: 'sin-arroba' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('no permite crear otro administrador si ya existe uno activo', async () => {
    const puerto = puertoFalso({ contarAdministradoresActivos: vi.fn().mockResolvedValue(1) });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('elimina la cuenta de Auth si falla el registro del rol', async () => {
    const puerto = puertoFalso({ registrarAdministrador: vi.fn().mockRejectedValue(new Error('rpc')) });
    await expect(crearPrimerAdministrador(puerto, CODIGO, entradaValida)).rejects.toMatchObject({ codigo: 'FALLO' });
    expect(puerto.eliminarUsuarioAuth).toHaveBeenCalledWith('u-1');
  });
});

describe('recuperación del administrador', () => {
  const admin = { id: 'a-1', nombre: 'Ana', correo: 'ana@correo.com' };
  const conAdmin = () => puertoFalso({
    contarAdministradoresActivos: vi.fn().mockResolvedValue(1),
    listarAdministradoresActivos: vi.fn().mockResolvedValue([admin]),
  });

  it('lista administradores solo con el código correcto', async () => {
    await expect(listarAdministradores(conAdmin(), CODIGO, 'otro')).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    await expect(listarAdministradores(conAdmin(), CODIGO, CODIGO)).resolves.toEqual([admin]);
  });

  it('no lista si todavía no hay administradores', async () => {
    await expect(listarAdministradores(puertoFalso(), CODIGO, CODIGO)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
  });

  it('actualiza correo y contraseña y deja auditoría enmascarada', async () => {
    const puerto = conAdmin();
    await recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: 'Nuevo@Correo.com', contrasena: 'otra-clave-123' });
    expect(puerto.actualizarCredenciales).toHaveBeenCalledWith('a-1', { correo: 'nuevo@correo.com', contrasena: 'otra-clave-123' });
    expect(puerto.registrarEvento).toHaveBeenCalledWith('ADMIN_RECOVERED', 'a-1', { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' });
  });

  it('permite cambiar solo la contraseña', async () => {
    const puerto = conAdmin();
    await recuperarAdministrador(puerto, CODIGO, { codigo: CODIGO, idUsuario: 'a-1', correo: '', contrasena: 'otra-clave-123' });
    expect(puerto.actualizarCredenciales).toHaveBeenCalledWith('a-1', { contrasena: 'otra-clave-123' });
  });

  it('rechaza un identificador que no es un administrador activo', async () => {
    await expect(recuperarAdministrador(conAdmin(), CODIGO, { codigo: CODIGO, idUsuario: 'otra', correo: '', contrasena: 'otra-clave-123' }))
      .rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('el error de código incorrecto es una ErrorConfiguracion', async () => {
    await expect(recuperarAdministrador(conAdmin(), CODIGO, { codigo: 'x', idUsuario: 'a-1', correo: '', contrasena: 'otra-clave-123' }))
      .rejects.toBeInstanceOf(ErrorConfiguracion);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/setup-administrator.test.ts`
Expected: FAIL por import no resuelto.

- [ ] **Step 3: Implementar el servicio**

`src/modules/access/setup-administrator.ts`:

```ts
import { createHash, timingSafeEqual } from 'node:crypto';
import { validarContrasena } from '@/platform/auth/password-policy';
import { enmascararCorreo } from '@/platform/security/mask-email';

export const LONGITUD_MINIMA_CODIGO = 24;
export const MENSAJE_CODIGO = 'No fue posible validar el código; verifique e intente más tarde.';

export type EstadoConfiguracion = 'PRIMER_ADMINISTRADOR' | 'RECUPERACION';
export type CodigoErrorConfiguracion = 'CODIGO_INVALIDO' | 'NO_DISPONIBLE' | 'DATOS_INVALIDOS' | 'FALLO';

export class ErrorConfiguracion extends Error {
  constructor(readonly codigo: CodigoErrorConfiguracion, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConfiguracion';
  }
}

export interface AdministradorResumen { id: string; nombre: string; correo: string }

export interface PuertoConfiguracion {
  contarAdministradoresActivos(): Promise<number>;
  listarAdministradoresActivos(): Promise<AdministradorResumen[]>;
  crearUsuarioAuth(entrada: { correo: string; contrasena: string; nombre: string }): Promise<{ id: string }>;
  registrarAdministrador(entrada: { idUsuario: string; nombre: string; correo: string }): Promise<void>;
  eliminarUsuarioAuth(idUsuario: string): Promise<void>;
  actualizarCredenciales(idUsuario: string, cambios: { correo?: string; contrasena?: string }): Promise<void>;
  registrarEvento(accion: 'ADMIN_RECOVERED', idUsuario: string, datos: Record<string, string>): Promise<void>;
}

/** Devuelve el código del servidor o null si no está definido o es demasiado corto. */
export function codigoConfiguracionActivo(entorno: NodeJS.ProcessEnv = process.env): string | null {
  const valor = entorno.LEXCON_SETUP_TOKEN?.trim();
  return valor && valor.length >= LONGITUD_MINIMA_CODIGO ? valor : null;
}

/** Comparación en tiempo constante: se comparan resúmenes SHA-256 de igual longitud. */
export function codigoCoincide(esperado: string, recibido: unknown): boolean {
  if (typeof recibido !== 'string') return false;
  const a = createHash('sha256').update(esperado).digest();
  const b = createHash('sha256').update(recibido).digest();
  return timingSafeEqual(a, b);
}

export async function estadoConfiguracion(puerto: PuertoConfiguracion): Promise<EstadoConfiguracion> {
  return (await puerto.contarAdministradoresActivos()) > 0 ? 'RECUPERACION' : 'PRIMER_ADMINISTRADOR';
}

function exigirCodigo(esperado: string | null, recibido: unknown): void {
  if (!esperado) throw new ErrorConfiguracion('NO_DISPONIBLE', 'No encontrada.');
  if (!codigoCoincide(esperado, recibido)) throw new ErrorConfiguracion('CODIGO_INVALIDO', MENSAJE_CODIGO);
}

function datos<T>(validar: () => T): T {
  try { return validar(); } catch (causa) {
    throw new ErrorConfiguracion('DATOS_INVALIDOS', causa instanceof Error ? causa.message : 'Los datos no son válidos.');
  }
}

function texto(valor: unknown, etiqueta: string, maximo: number): string {
  const limpio = typeof valor === 'string' ? valor.trim() : '';
  if (!limpio || limpio.length > maximo) throw new Error(`${etiqueta} no es válido.`);
  return limpio;
}

function correoValido(valor: unknown): string {
  const limpio = texto(valor, 'El correo', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(limpio)) throw new Error('El correo no es válido.');
  return limpio;
}

export async function crearPrimerAdministrador(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  entrada: { codigo: unknown; nombre: unknown; correo: unknown; contrasena: unknown },
): Promise<void> {
  exigirCodigo(esperado, entrada.codigo);
  const nombre = datos(() => texto(entrada.nombre, 'El nombre', 160));
  const correo = datos(() => correoValido(entrada.correo));
  const contrasena = datos(() => validarContrasena(entrada.contrasena));
  if ((await puerto.contarAdministradoresActivos()) > 0) {
    throw new ErrorConfiguracion('NO_DISPONIBLE', 'Ya existe un Administrador activo; use la recuperación.');
  }
  const { id } = await puerto.crearUsuarioAuth({ correo, contrasena, nombre });
  try {
    await puerto.registrarAdministrador({ idUsuario: id, nombre, correo });
  } catch {
    await puerto.eliminarUsuarioAuth(id).catch(() => undefined);
    throw new ErrorConfiguracion('FALLO', 'No fue posible registrar el Administrador. La cuenta fue cancelada.');
  }
}

export async function listarAdministradores(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  codigo: unknown,
): Promise<AdministradorResumen[]> {
  exigirCodigo(esperado, codigo);
  if ((await puerto.contarAdministradoresActivos()) === 0) {
    throw new ErrorConfiguracion('NO_DISPONIBLE', 'Todavía no existe un Administrador que recuperar.');
  }
  return puerto.listarAdministradoresActivos();
}

export async function recuperarAdministrador(
  puerto: PuertoConfiguracion,
  esperado: string | null,
  entrada: { codigo: unknown; idUsuario: unknown; correo: unknown; contrasena: unknown },
): Promise<void> {
  exigirCodigo(esperado, entrada.codigo);
  const contrasena = datos(() => validarContrasena(entrada.contrasena));
  const correoNuevo = typeof entrada.correo === 'string' && entrada.correo.trim() ? datos(() => correoValido(entrada.correo)) : null;
  const administradores = await listarAdministradores(puerto, esperado, entrada.codigo);
  const destino = administradores.find((administrador) => administrador.id === entrada.idUsuario);
  if (!destino) throw new ErrorConfiguracion('DATOS_INVALIDOS', 'Seleccione un Administrador activo.');
  await puerto.actualizarCredenciales(destino.id, correoNuevo ? { correo: correoNuevo, contrasena } : { contrasena });
  await puerto.registrarEvento('ADMIN_RECOVERED', destino.id, {
    correo_anterior: enmascararCorreo(destino.correo),
    correo_nuevo: correoNuevo ? enmascararCorreo(correoNuevo) : enmascararCorreo(destino.correo),
  });
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `corepack pnpm exec vitest run tests/unit/setup-administrator.test.ts`
Expected: PASS (todas las pruebas del archivo).

---

### Task 4: Adaptador de Supabase y ruta `POST /api/setup`

**Files:**
- Create: `src/modules/access/setup-administrator-supabase.ts`
- Create: `src/app/api/setup/route.ts`
- Create: `tests/unit/setup-route.test.ts`

Antes de escribir la ruta, lee `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (o el equivalente de esta versión) y confirma que `export const dynamic` y `NextResponse.json` siguen vigentes.

- [ ] **Step 1: Escribir la prueba de la ruta que falla**

`tests/unit/setup-route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PuertoConfiguracion } from '../../src/modules/access/setup-administrator';

const CODIGO = 'codigo-de-prueba-con-24-caracteres!';

const mocks = vi.hoisted(() => ({
  puerto: {
    contarAdministradoresActivos: vi.fn(),
    listarAdministradoresActivos: vi.fn(),
    crearUsuarioAuth: vi.fn(),
    registrarAdministrador: vi.fn(),
    eliminarUsuarioAuth: vi.fn(),
    actualizarCredenciales: vi.fn(),
    registrarEvento: vi.fn(),
  } satisfies Record<keyof PuertoConfiguracion, unknown>,
}));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => true, crearClienteSupabaseServidor: () => ({}) }));
vi.mock('@/modules/access/setup-administrator-supabase', () => ({ crearPuertoSupabase: () => mocks.puerto }));

function solicitud(cuerpo: unknown, ip = '10.0.0.1'): Request {
  return new Request('http://localhost/api/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(cuerpo),
  });
}

describe('POST /api/setup', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.LEXCON_SETUP_TOKEN = CODIGO;
    mocks.puerto.contarAdministradoresActivos.mockResolvedValue(0);
    mocks.puerto.crearUsuarioAuth.mockResolvedValue({ id: 'u-1' });
    mocks.puerto.registrarAdministrador.mockResolvedValue(undefined);
  });

  it('responde 404 cuando el servidor no tiene código configurado', async () => {
    delete process.env.LEXCON_SETUP_TOKEN;
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud({ accion: 'crear' }));
    expect(respuesta.status).toBe(404);
  });

  it('crea el primer administrador con el código correcto', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud({ accion: 'crear', codigo: CODIGO, nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'clave-segura-1' }));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(mocks.puerto.registrarAdministrador).toHaveBeenCalled();
  });

  it('usa el mismo mensaje genérico con código inválido y con bloqueo', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const mala = { accion: 'crear', codigo: 'incorrecto', nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'clave-segura-1' };
    const primera = await POST(solicitud(mala));
    expect(primera.status).toBe(403);
    const mensajeInvalido = (await primera.json() as { error: string }).error;
    for (let i = 0; i < 4; i++) await POST(solicitud(mala));
    const bloqueada = await POST(solicitud({ ...mala, codigo: CODIGO }));
    expect(bloqueada.status).toBe(403);
    expect((await bloqueada.json() as { error: string }).error).toBe(mensajeInvalido);
    expect(mocks.puerto.crearUsuarioAuth).not.toHaveBeenCalled();
  });

  it('no bloquea a otra dirección IP', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const mala = { accion: 'crear', codigo: 'incorrecto' };
    for (let i = 0; i < 5; i++) await POST(solicitud(mala, '10.0.0.9'));
    const otra = await POST(solicitud({ accion: 'crear', codigo: CODIGO, nombre: 'Ana', correo: 'ana@correo.com', contrasena: 'clave-segura-1' }, '10.0.0.10'));
    expect(otra.status).toBe(200);
  });

  it('devuelve 400 para una acción desconocida', async () => {
    const { POST } = await import('../../src/app/api/setup/route');
    const respuesta = await POST(solicitud({ accion: 'borrar', codigo: CODIGO }));
    expect(respuesta.status).toBe(400);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/setup-route.test.ts`
Expected: FAIL por import no resuelto de `route`.

- [ ] **Step 3: Implementar el adaptador de Supabase**

`src/modules/access/setup-administrator-supabase.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErrorConfiguracion, type PuertoConfiguracion } from './setup-administrator';

function mensajeAuth(error: { message?: string; code?: string }): ErrorConfiguracion {
  const texto = error.message?.toLowerCase() ?? '';
  if (texto.includes('already') || texto.includes('registered')) return new ErrorConfiguracion('DATOS_INVALIDOS', 'Ya existe una cuenta con este correo.');
  if (error.code === 'weak_password') return new ErrorConfiguracion('DATOS_INVALIDOS', 'La contraseña no cumple la política del servicio; use una más larga o menos común.');
  return new ErrorConfiguracion('FALLO', 'No fue posible completar la operación con el servicio de acceso.');
}

/** Adaptador delgado: toda la lógica de negocio está en setup-administrator.ts. */
export function crearPuertoSupabase(supabase: SupabaseClient): PuertoConfiguracion {
  return {
    async contarAdministradoresActivos() {
      const { count, error } = await supabase.from('asignaciones_roles_usuario')
        .select('id,roles!inner(codigo)', { count: 'exact', head: true })
        .eq('activa', true).eq('roles.codigo', 'ADMINISTRADOR_ARKA');
      if (error) throw new ErrorConfiguracion('FALLO', 'No fue posible verificar el estado de la configuración.');
      return count ?? 0;
    },
    async listarAdministradoresActivos() {
      const { data: asignaciones, error } = await supabase.from('asignaciones_roles_usuario')
        .select('id_usuario,roles!inner(codigo)').eq('activa', true).eq('roles.codigo', 'ADMINISTRADOR_ARKA');
      if (error) throw new ErrorConfiguracion('FALLO', 'No fue posible consultar los Administradores.');
      const ids = (asignaciones ?? []).map((fila) => fila.id_usuario as string);
      if (ids.length === 0) return [];
      const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles_usuario')
        .select('id_usuario,nombre_mostrado,correo_electronico').eq('activo', true).in('id_usuario', ids);
      if (errorPerfiles) throw new ErrorConfiguracion('FALLO', 'No fue posible consultar los Administradores.');
      return (perfiles ?? []).map((perfil) => ({ id: perfil.id_usuario as string, nombre: perfil.nombre_mostrado as string, correo: perfil.correo_electronico as string }));
    },
    async crearUsuarioAuth({ correo, contrasena, nombre }) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: correo, password: contrasena, email_confirm: true, user_metadata: { nombre_mostrado: nombre },
      });
      if (error || !data.user) throw mensajeAuth(error ?? {});
      return { id: data.user.id };
    },
    async registrarAdministrador({ idUsuario, nombre, correo }) {
      const { error } = await supabase.rpc('registrar_acceso_usuario', {
        p_id_usuario: idUsuario, p_nombre: nombre, p_correo: correo, p_codigo_rol: 'ADMINISTRADOR_ARKA', p_id_institucion: null, p_id_actor: null,
      });
      if (error) throw new Error('rpc');
    },
    async eliminarUsuarioAuth(idUsuario) {
      await supabase.auth.admin.deleteUser(idUsuario);
    },
    async actualizarCredenciales(idUsuario, cambios) {
      const { error } = await supabase.auth.admin.updateUserById(idUsuario, {
        ...(cambios.correo ? { email: cambios.correo, email_confirm: true } : {}),
        ...(cambios.contrasena ? { password: cambios.contrasena } : {}),
      });
      if (error) throw mensajeAuth(error);
    },
    async registrarEvento(accion, idUsuario, datos) {
      const { error } = await supabase.rpc('registrar_evento_acceso', { p_id_actor: null, p_id_usuario: idUsuario, p_accion: accion, p_datos: datos });
      if (error) throw new ErrorConfiguracion('FALLO', 'La recuperación se aplicó, pero no se pudo registrar en la auditoría.');
    },
  };
}
```

- [ ] **Step 4: Implementar la ruta**

`src/app/api/setup/route.ts`:

```ts
import { NextResponse } from 'next/server';
import {
  codigoConfiguracionActivo, crearPrimerAdministrador, ErrorConfiguracion, listarAdministradores,
  MENSAJE_CODIGO, recuperarAdministrador,
} from '@/modules/access/setup-administrator';
import { crearPuertoSupabase } from '@/modules/access/setup-administrator-supabase';
import { AttemptLimiter } from '@/platform/security/attempt-limiter';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';

export const dynamic = 'force-dynamic';

const VENTANA_MS = 15 * 60_000;
const porIp = new AttemptLimiter({ maxFailures: 5, windowMs: VENTANA_MS });
const enTotal = new AttemptLimiter({ maxFailures: 30, windowMs: VENTANA_MS });
const CLAVE_GLOBAL = 'global';

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

/** Detrás de Traefik (Dokploy) el primer valor es la IP real del cliente. */
function ipDe(solicitud: Request): string {
  return solicitud.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || solicitud.headers.get('x-real-ip') || 'desconocida';
}

export async function POST(solicitud: Request) {
  const esperado = codigoConfiguracionActivo();
  if (!esperado || !supabaseConfigurado()) return responder({ error: 'No encontrada.' }, 404);

  const ip = ipDe(solicitud);
  if (porIp.isBlocked(ip) || enTotal.isBlocked(CLAVE_GLOBAL)) return responder({ error: MENSAJE_CODIGO }, 403);

  let cuerpo: Record<string, unknown>;
  try { cuerpo = await solicitud.json() as Record<string, unknown>; } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }

  try {
    const puerto = crearPuertoSupabase(crearClienteSupabaseServidor());
    if (cuerpo.accion === 'crear') {
      await crearPrimerAdministrador(puerto, esperado, cuerpo as { codigo: unknown; nombre: unknown; correo: unknown; contrasena: unknown });
      porIp.reset(ip);
      return responder({ ok: true }, 200);
    }
    if (cuerpo.accion === 'listar') {
      const administradores = await listarAdministradores(puerto, esperado, cuerpo.codigo);
      porIp.reset(ip);
      return responder({ administradores }, 200);
    }
    if (cuerpo.accion === 'recuperar') {
      await recuperarAdministrador(puerto, esperado, cuerpo as { codigo: unknown; idUsuario: unknown; correo: unknown; contrasena: unknown });
      porIp.reset(ip);
      return responder({ ok: true }, 200);
    }
    return responder({ error: 'La acción solicitada no es válida.' }, 400);
  } catch (error) {
    if (error instanceof ErrorConfiguracion) {
      if (error.codigo === 'CODIGO_INVALIDO') {
        porIp.recordFailure(ip);
        enTotal.recordFailure(CLAVE_GLOBAL);
        return responder({ error: MENSAJE_CODIGO }, 403);
      }
      const estado = error.codigo === 'NO_DISPONIBLE' ? 409 : error.codigo === 'DATOS_INVALIDOS' ? 400 : 500;
      return responder({ error: error.message }, estado);
    }
    return responder({ error: 'No fue posible completar la operación.' }, 500);
  }
}
```

- [ ] **Step 5: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/setup-route.test.ts`
Expected: PASS (5 pruebas). Si `Request`/`NextResponse` fallan en el entorno de Node, revisa que `vitest.config.ts` use `environment: 'node'` (ya lo usa) y que Node sea 24.

- [ ] **Step 6: Tipos**

Run: `corepack pnpm typecheck`
Expected: sin errores.

---

### Task 5: Página y formulario de `/setup`

**Files:**
- Create: `src/app/setup/page.tsx`
- Create: `src/app/setup/setup-form.tsx`

Antes de escribir la página lee `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md` y `.../03-file-conventions/page.md`.

- [ ] **Step 1: Crear la página de servidor**

`src/app/setup/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { codigoConfiguracionActivo, estadoConfiguracion } from '@/modules/access/setup-administrator';
import { crearPuertoSupabase } from '@/modules/access/setup-administrator-supabase';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { SetupForm } from './setup-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Configuración inicial · LEXCON IAG', robots: { index: false, follow: false } };

export default async function SetupPage() {
  if (!codigoConfiguracionActivo() || !supabaseConfigurado()) notFound();
  const modo = await estadoConfiguracion(crearPuertoSupabase(crearClienteSupabaseServidor()));
  return <SetupForm modo={modo} />;
}
```

- [ ] **Step 2: Crear el formulario de cliente**

`src/app/setup/setup-form.tsx`:

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/platform/auth/password-policy';

type Modo = 'PRIMER_ADMINISTRADOR' | 'RECUPERACION';
interface Administrador { id: string; nombre: string; correo: string }

async function enviar(cuerpo: object): Promise<Record<string, unknown>> {
  const respuesta = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const datos = await respuesta.json() as Record<string, unknown>;
  if (!respuesta.ok) throw new Error(typeof datos.error === 'string' ? datos.error : 'No fue posible completar la operación.');
  return datos;
}

export function SetupForm({ modo }: { modo: Modo }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [administradores, setAdministradores] = useState<Administrador[] | null>(null);
  const [idUsuario, setIdUsuario] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState(false);

  const recuperando = modo === 'RECUPERACION';
  const enPasoDatos = !recuperando || administradores !== null;

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje('');
    if (enPasoDatos && contrasena !== confirmar) { setMensaje('Las contraseñas no coinciden.'); return; }
    setOcupado(true);
    try {
      if (!recuperando) {
        await enviar({ accion: 'crear', codigo, nombre, correo, contrasena });
        setHecho(true);
      } else if (administradores === null) {
        const datos = await enviar({ accion: 'listar', codigo });
        const lista = (datos.administradores ?? []) as Administrador[];
        setAdministradores(lista);
        setIdUsuario(lista[0]?.id ?? '');
      } else {
        await enviar({ accion: 'recuperar', codigo, idUsuario, correo, contrasena });
        setHecho(true);
      }
    } catch (causa) {
      setMensaje(causa instanceof Error ? causa.message : 'No fue posible completar la operación.');
    } finally {
      setOcupado(false);
    }
  }

  const titulo = recuperando ? 'Recupere el acceso del administrador.' : 'Cree al primer administrador.';
  const descripcion = recuperando
    ? 'Esta pantalla solo está disponible mientras el servidor tenga un código de configuración activo.'
    : 'Esta pantalla solo está disponible mientras el servidor tenga un código de configuración y no exista un administrador activo.';

  return <main className="access access-v2"><section className="access-frame">
    <section className="access-hero"><p className="eyebrow">Configuración inicial</p><h1>{titulo}</h1><p>{descripcion}</p></section>
    <section className="login-card">
      {hecho ? <div>
        <div className="login-card-heading"><span className="login-glyph" aria-hidden="true">✓</span><div><h2>{recuperando ? 'Acceso recuperado' : 'Administrador creado'}</h2><p>Ya puede iniciar sesión con el correo y la contraseña definidos.</p></div></div>
        <p className="form-message" role="status">Retire <strong>LEXCON_SETUP_TOKEN</strong> de la configuración de Dokploy y reinicie el servicio. Esta pantalla dejará de estar disponible.</p>
        <a className="primary-button" href="/login">Ir al inicio de sesión</a>
      </div> : <form className="login-form" onSubmit={enviarFormulario}>
        <div className="login-card-heading"><span className="login-glyph" aria-hidden="true">⌁</span><div><h2>{recuperando ? 'Recuperación' : 'Primer administrador'}</h2><p>Defina su usuario y su contraseña de acceso.</p></div></div>
        <label className="field-label" htmlFor="codigo">Código de configuración<input required id="codigo" name="codigo" type="password" autoComplete="off" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={recuperando && administradores !== null} /></label>
        {!recuperando && <>
          <label className="field-label" htmlFor="nombre">Nombre<input required id="nombre" name="nombre" maxLength={160} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label className="field-label" htmlFor="correo">Correo (será su usuario)<input required id="correo" name="correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
        </>}
        {recuperando && administradores !== null && <>
          <label className="field-label" htmlFor="admin">Administrador<select id="admin" required value={idUsuario} onChange={(e) => setIdUsuario(e.target.value)}>{administradores.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.correo}</option>)}</select></label>
          <label className="field-label" htmlFor="correo-nuevo">Correo nuevo (opcional)<input id="correo-nuevo" name="correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
        </>}
        {enPasoDatos && <>
          <label className="field-label" htmlFor="contrasena">Contraseña<span className="password-field"><input required minLength={MIN_PASSWORD_LENGTH} id="contrasena" type={ver ? 'text' : 'password'} autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} /><button className="password-visibility" type="button" aria-pressed={ver} onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button></span></label>
          <label className="field-label" htmlFor="confirmar">Confirmar contraseña<span className="password-field"><input required minLength={MIN_PASSWORD_LENGTH} id="confirmar" type={ver ? 'text' : 'password'} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} /></span></label>
        </>}
        {mensaje && <p className="form-message" role="alert">{mensaje}</p>}
        <button className="primary-button" disabled={ocupado || (recuperando && administradores !== null && !idUsuario)}>{ocupado ? 'Procesando…' : recuperando && administradores === null ? 'Continuar' : recuperando ? 'Recuperar acceso' : 'Crear administrador'}</button>
      </form>}
    </section>
  </section></main>;
}
```

- [ ] **Step 3: Tipos**

Run: `corepack pnpm typecheck`
Expected: sin errores.

- [ ] **Step 4: Verificación local temporal (autorizada)**

Con Supabase **sin configurar** en `.env.local`, `/setup` debe responder 404. Esto se comprueba arrancando una instancia temporal:

Run: `corepack pnpm exec next dev -p 3100` (en segundo plano), luego `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/setup`
Expected: `404`.
Detén la instancia al terminar: no dejes ningún servidor local en marcha.

---

### Task 6: Migración de Supabase (sincronía de correo y auditoría) y documentación del hito

**Files:**
- Create: `supabase/migrations/20261011150000_sincronizar_correo_y_auditar_acceso.sql`
- Create: `tests/unit/migracion-correo-auditoria.test.ts`
- Create: `docs/decisions/054-configuracion-inicial-y-mi-cuenta.md`
- Modify: `.env.example`, `README.md`, `docs/architecture.md`, `docs/current-state.md`

- [ ] **Step 1: Escribir la prueba estática que falla**

`tests/unit/migracion-correo-auditoria.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261011150000_sincronizar_correo_y_auditar_acceso.sql'), 'utf8');

describe('migración de correo y auditoría de acceso', () => {
  it('sincroniza el correo del perfil cuando cambia auth.users.email', () => {
    expect(sql).toMatch(/create or replace function public\.sincronizar_correo_perfil\(\)/i);
    expect(sql).toMatch(/after update of email on auth\.users/i);
    expect(sql).toMatch(/update public\.perfiles_usuario/i);
  });

  it('las funciones son security definer con search_path fijo', () => {
    expect((sql.match(/security definer/gi) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((sql.match(/set search_path = pg_catalog, public/gi) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('solo service_role puede ejecutar la auditoría de accesos', () => {
    expect(sql).toMatch(/revoke all on function public\.registrar_evento_acceso\(uuid, uuid, text, jsonb\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.registrar_evento_acceso\(uuid, uuid, text, jsonb\) to service_role/i);
  });

  it('solo acepta acciones de acceso conocidas', () => {
    for (const accion of ['ADMIN_RECOVERED', 'EMAIL_CORRECTED', 'EMAIL_CHANGE_REQUESTED', 'PASSWORD_CHANGED']) expect(sql).toContain(accion);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/migracion-correo-auditoria.test.ts`
Expected: FAIL (`ENOENT` al leer la migración).

- [ ] **Step 3: Escribir la migración**

`supabase/migrations/20261011150000_sincronizar_correo_y_auditar_acceso.sql`:

```sql
-- Mantiene coherente el correo del perfil con Auth y registra los cambios de acceso.
-- El correo de inicio de sesión vive en auth.users; el perfil es una copia para
-- mostrarlo y consultarlo. Un trigger evita que ambos se separen cuando una
-- persona confirma un cambio de correo o cuando el Administrador lo corrige.

create or replace function public.sincronizar_correo_perfil()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.perfiles_usuario
       set correo_electronico = lower(btrim(new.email)),
           actualizado_en = now()
     where id_usuario = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sincronizar_correo_perfil on auth.users;
create trigger sincronizar_correo_perfil
  after update of email on auth.users
  for each row execute function public.sincronizar_correo_perfil();

revoke all on function public.sincronizar_correo_perfil() from public, anon, authenticated;

create or replace function public.registrar_evento_acceso(
  p_id_actor uuid,
  p_id_usuario uuid,
  p_accion text,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_accion not in ('ADMIN_RECOVERED', 'EMAIL_CORRECTED', 'EMAIL_CHANGE_REQUESTED', 'PASSWORD_CHANGED') then
    raise exception 'La acción de acceso indicada no es válida.';
  end if;
  if not exists (select 1 from public.perfiles_usuario where id_usuario = p_id_usuario) then
    raise exception 'La cuenta indicada no existe.';
  end if;

  insert into public.eventos_auditoria (id_actor, accion, tipo_entidad, id_entidad, datos_despues)
  values (p_id_actor, p_accion, 'perfil_usuario', p_id_usuario, coalesce(p_datos, '{}'::jsonb));
end;
$$;

revoke all on function public.registrar_evento_acceso(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_evento_acceso(uuid, uuid, text, jsonb) to service_role;
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/migracion-correo-auditoria.test.ts`
Expected: PASS (4 pruebas).

- [ ] **Step 5: Documentar el hito**

1. `.env.example`: agregar al final:

```
# Código de un solo uso para /setup (primer administrador y recuperación). Mínimo 24
# caracteres aleatorios. Defínalo en el servidor solo mientras lo necesite y retírelo después.
# LEXCON_SETUP_TOKEN=
```

2. `docs/decisions/054-configuracion-inicial-y-mi-cuenta.md`:

```markdown
# 054. Configuración inicial del administrador y Mi cuenta

- **Fecha:** 2026-10-11
- **Estado:** Aceptada. Complementa la decisión 053.

## Contexto

El comando de terminal de la decisión 053 depende de entrar al contenedor y de que llegue un correo. La persona responsable necesita crear su acceso desde el navegador, cambiar su contraseña y su correo, y recuperar el acceso si pierde ambos.

## Decisión

- `/setup` es una pantalla protegida por `LEXCON_SETUP_TOKEN` (mínimo 24 caracteres). Sin el código responde "no encontrada". Con el código y sin administradores crea el primero con correo y contraseña definidos directamente (correo ya confirmado). Con el código y con administradores ofrece recuperación de un administrador existente. El código se compara en tiempo constante; tras 5 intentos fallidos por IP (o 30 globales) se bloquea 15 minutos con el mismo mensaje genérico. Se recomienda retirar el código tras usarlo.
- No existe un rol de super administrador. Se mantiene `ADMINISTRADOR_ARKA` y se permiten varios administradores.
- Mi cuenta permite a los cuatro roles cambiar nombre, contraseña (con la actual) y correo (con la actual y confirmación en el correo nuevo). El Administrador puede corregir el correo de otra cuenta y reenviarle el acceso.
- Un trigger de Postgres sincroniza `perfiles_usuario.correo_electronico` con `auth.users.email`.
- La longitud mínima de contraseña es 8 en todos los flujos web.

## Consecuencias

El script `scripts/bootstrap-supabase-admin.mjs` se conserva como respaldo. Hay que desactivar "Secure email change" en Supabase Auth y fijar la longitud mínima de contraseña en 8 (o menos) para que el cambio de correo funcione cuando el buzón anterior está lleno.
```

3. `docs/architecture.md`: añadir al final de la sección "Administración de acceso por invitación" un párrafo:

```markdown
`/setup` y `POST /api/setup` (`src/modules/access/setup-administrator.ts`) crean el primer Administrador o recuperan uno existente con `LEXCON_SETUP_TOKEN`, usando un puerto sobre la clave de servicio de Supabase y un limitador de intentos en memoria. La migración `20261011150000_sincronizar_correo_y_auditar_acceso.sql` añade un trigger que copia los cambios de `auth.users.email` a `perfiles_usuario` y la función `registrar_evento_acceso`, ejecutable solo por `service_role`.
```

4. `docs/current-state.md`: añadir al final:

```markdown
Está implementada la pantalla `/setup`: con `LEXCON_SETUP_TOKEN` definido en el servidor permite crear al primer Administrador o recuperar el acceso de uno existente. Requiere aplicar la migración `20261011150000_sincronizar_correo_y_auditar_acceso.sql` en Supabase. La contraseña mínima en los flujos web es de 8 caracteres.
```

5. `README.md`: en la sección de inicio del primer administrador, antes del bloque `sh` que usa `bootstrap-supabase-admin.mjs`, insertar:

```markdown
La forma recomendada de crear el primer Administrador es `/setup`: defina en Dokploy `LEXCON_SETUP_TOKEN` con al menos 24 caracteres aleatorios, abra `https://lexcon.arkaiag.com/setup`, escriba el código y elija su correo y contraseña. Cuando termine, retire la variable y reinicie el servicio. Para recuperar un acceso perdido, vuelva a definir la variable y abra `/setup` de nuevo. El comando de terminal de abajo queda como respaldo.
```

- [ ] **Step 6: Comprobar todo**

Run: `corepack pnpm typecheck && corepack pnpm test && node scripts/sync-agent-guides.mjs --check`
Expected: todo en verde.

- [ ] **Step 7: Commit (solo con autorización explícita)**

```bash
git add src/platform/auth/password-policy.ts src/platform/security src/modules/access/setup-administrator.ts src/modules/access/setup-administrator-supabase.ts src/app/api/setup src/app/setup src/app/api/auth/update-password/route.ts src/app/auth/update-password/update-password-form.tsx supabase/migrations/20261011150000_sincronizar_correo_y_auditar_acceso.sql tests/unit .env.example README.md docs
git commit -m "feat: crear el primer administrador desde /setup con código de servidor"
```

---

### Task 7: Mi cuenta (nombre, contraseña y correo para todos los roles)

**Files:**
- Create: `src/modules/access/account-service.ts`
- Create: `src/modules/access/account-port-supabase.ts`
- Create: `src/app/api/account/route.ts`
- Create: `src/app/dashboard/account/page.tsx`
- Create: `src/app/dashboard/account/account-forms.tsx`
- Modify: `src/app/dashboard/_components/workspace-shell.tsx`
- Create: `tests/unit/account-service.test.ts`

- [ ] **Step 1: Escribir la prueba del servicio que falla**

`tests/unit/account-service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { actualizarNombre, cambiarContrasena, ErrorCuenta, solicitarCambioCorreo, type PuertoCuenta } from '../../src/modules/access/account-service';

const sesion = { idUsuario: 'u-1', correo: 'ana@correo.com' };

function puertoFalso(parcial: Partial<PuertoCuenta> = {}): PuertoCuenta {
  return {
    verificarContrasena: vi.fn().mockResolvedValue(true),
    actualizarContrasena: vi.fn().mockResolvedValue(undefined),
    solicitarCambioCorreo: vi.fn().mockResolvedValue(undefined),
    actualizarNombre: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

describe('cambiarContrasena', () => {
  it('verifica la contraseña actual y actualiza la nueva', async () => {
    const puerto = puertoFalso();
    await cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-nueva-22' });
    expect(puerto.verificarContrasena).toHaveBeenCalledWith('ana@correo.com', 'clave-actual-1');
    expect(puerto.actualizarContrasena).toHaveBeenCalledWith('clave-nueva-22');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('PASSWORD_CHANGED', 'u-1', {});
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    const puerto = puertoFalso({ verificarContrasena: vi.fn().mockResolvedValue(false) });
    await expect(cambiarContrasena(puerto, sesion, { actual: 'mala', nueva: 'clave-nueva-22' })).rejects.toMatchObject({ codigo: 'CONTRASENA_INCORRECTA' });
    expect(puerto.actualizarContrasena).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva de menos de 8 caracteres', async () => {
    await expect(cambiarContrasena(puertoFalso(), sesion, { actual: 'clave-actual-1', nueva: '1234567' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una contraseña nueva igual a la actual', async () => {
    await expect(cambiarContrasena(puertoFalso(), sesion, { actual: 'clave-actual-1', nueva: 'clave-actual-1' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('no revierte el cambio si falla el registro de auditoría', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(cambiarContrasena(puerto, sesion, { actual: 'clave-actual-1', nueva: 'clave-nueva-22' })).resolves.toBeUndefined();
    expect(puerto.actualizarContrasena).toHaveBeenCalled();
  });
});

describe('solicitarCambioCorreo', () => {
  it('pide la confirmación al correo nuevo en minúsculas', async () => {
    const puerto = puertoFalso();
    await solicitarCambioCorreo(puerto, sesion, { contrasenaActual: 'clave-actual-1', correoNuevo: 'Nueva@Correo.com' });
    expect(puerto.solicitarCambioCorreo).toHaveBeenCalledWith('nueva@correo.com');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('EMAIL_CHANGE_REQUESTED', 'u-1', { correo_anterior: 'a***@correo.com', correo_nuevo: 'n****@correo.com' });
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    const puerto = puertoFalso({ verificarContrasena: vi.fn().mockResolvedValue(false) });
    await expect(solicitarCambioCorreo(puerto, sesion, { contrasenaActual: 'mala', correoNuevo: 'nueva@correo.com' })).rejects.toBeInstanceOf(ErrorCuenta);
    expect(puerto.solicitarCambioCorreo).not.toHaveBeenCalled();
  });

  it('rechaza un correo inválido o igual al actual', async () => {
    await expect(solicitarCambioCorreo(puertoFalso(), sesion, { contrasenaActual: 'x', correoNuevo: 'sin-arroba' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(solicitarCambioCorreo(puertoFalso(), sesion, { contrasenaActual: 'x', correoNuevo: 'ANA@correo.com' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});

describe('actualizarNombre', () => {
  it('guarda el nombre sin espacios sobrantes', async () => {
    const puerto = puertoFalso();
    await actualizarNombre(puerto, sesion, { nombre: '  Ana María  ' });
    expect(puerto.actualizarNombre).toHaveBeenCalledWith('u-1', 'Ana María');
  });

  it('rechaza un nombre vacío', async () => {
    await expect(actualizarNombre(puertoFalso(), sesion, { nombre: '   ' })).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/account-service.test.ts`
Expected: FAIL por import no resuelto.

- [ ] **Step 3: Implementar el servicio**

`src/modules/access/account-service.ts`:

```ts
import { validarContrasena } from '@/platform/auth/password-policy';
import { enmascararCorreo } from '@/platform/security/mask-email';

export type CodigoErrorCuenta = 'DATOS_INVALIDOS' | 'CONTRASENA_INCORRECTA' | 'FALLO';

export class ErrorCuenta extends Error {
  constructor(readonly codigo: CodigoErrorCuenta, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCuenta';
  }
}

export interface SesionCuenta { idUsuario: string; correo: string }

export interface PuertoCuenta {
  verificarContrasena(correo: string, contrasena: string): Promise<boolean>;
  actualizarContrasena(nueva: string): Promise<void>;
  solicitarCambioCorreo(nuevo: string): Promise<void>;
  actualizarNombre(idUsuario: string, nombre: string): Promise<void>;
  registrarEvento(accion: 'PASSWORD_CHANGED' | 'EMAIL_CHANGE_REQUESTED', idUsuario: string, datos: Record<string, string>): Promise<void>;
}

function datos<T>(validar: () => T): T {
  try { return validar(); } catch (causa) {
    throw new ErrorCuenta('DATOS_INVALIDOS', causa instanceof Error ? causa.message : 'Los datos no son válidos.');
  }
}

async function exigirContrasenaActual(puerto: PuertoCuenta, sesion: SesionCuenta, actual: unknown): Promise<void> {
  if (typeof actual !== 'string' || !actual) throw new ErrorCuenta('DATOS_INVALIDOS', 'Escriba su contraseña actual.');
  if (!(await puerto.verificarContrasena(sesion.correo, actual))) throw new ErrorCuenta('CONTRASENA_INCORRECTA', 'La contraseña actual no es correcta.');
}

/** La auditoría no debe deshacer un cambio que ya se aplicó. */
async function auditar(puerto: PuertoCuenta, accion: 'PASSWORD_CHANGED' | 'EMAIL_CHANGE_REQUESTED', idUsuario: string, contenido: Record<string, string>): Promise<void> {
  await puerto.registrarEvento(accion, idUsuario, contenido).catch(() => undefined);
}

export async function cambiarContrasena(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { actual: unknown; nueva: unknown }): Promise<void> {
  const nueva = datos(() => validarContrasena(entrada.nueva));
  if (entrada.actual === nueva) throw new ErrorCuenta('DATOS_INVALIDOS', 'La contraseña nueva debe ser distinta de la actual.');
  await exigirContrasenaActual(puerto, sesion, entrada.actual);
  await puerto.actualizarContrasena(nueva);
  await auditar(puerto, 'PASSWORD_CHANGED', sesion.idUsuario, {});
}

export async function solicitarCambioCorreo(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { contrasenaActual: unknown; correoNuevo: unknown }): Promise<void> {
  const nuevo = datos(() => {
    const limpio = typeof entrada.correoNuevo === 'string' ? entrada.correoNuevo.trim().toLowerCase() : '';
    if (!limpio || limpio.length > 254 || !/^\S+@\S+\.\S+$/.test(limpio)) throw new Error('El correo nuevo no es válido.');
    if (limpio === sesion.correo.toLowerCase()) throw new Error('El correo nuevo debe ser distinto del actual.');
    return limpio;
  });
  await exigirContrasenaActual(puerto, sesion, entrada.contrasenaActual);
  await puerto.solicitarCambioCorreo(nuevo);
  await auditar(puerto, 'EMAIL_CHANGE_REQUESTED', sesion.idUsuario, { correo_anterior: enmascararCorreo(sesion.correo), correo_nuevo: enmascararCorreo(nuevo) });
}

export async function actualizarNombre(puerto: PuertoCuenta, sesion: SesionCuenta, entrada: { nombre: unknown }): Promise<void> {
  const nombre = datos(() => {
    const limpio = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
    if (!limpio || limpio.length > 160) throw new Error('El nombre no es válido.');
    return limpio;
  });
  await puerto.actualizarNombre(sesion.idUsuario, nombre);
}
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/account-service.test.ts`
Expected: PASS (9 pruebas).

- [ ] **Step 5: Adaptador de Supabase**

`src/modules/access/account-port-supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appUrl } from '@/platform/app-url';
import { configuracionSupabasePublica } from '@/platform/supabase/public';
import { ErrorCuenta, type PuertoCuenta } from './account-service';

/**
 * `sesion` es el cliente con las cookies de la persona (para cambiar SU contraseña y SU correo);
 * `servicio` es el cliente con clave de servicio (solo para nombre y auditoría).
 */
export function crearPuertoCuenta(sesion: Pick<SupabaseClient, 'auth'>, servicio: SupabaseClient): PuertoCuenta {
  return {
    async verificarContrasena(correo, contrasena) {
      const configuracion = configuracionSupabasePublica();
      if (!configuracion) return false;
      // Cliente aislado: verificar la contraseña no debe renovar ni reemplazar la sesión de la persona.
      const aislado = createClient(configuracion.url, configuracion.clavePublicable, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { error } = await aislado.auth.signInWithPassword({ email: correo, password: contrasena });
      return !error;
    },
    async actualizarContrasena(nueva) {
      const { error } = await sesion.auth.updateUser({ password: nueva });
      if (error) throw new ErrorCuenta('FALLO', 'No fue posible actualizar la contraseña. Inicie sesión de nuevo e intente otra vez.');
    },
    async solicitarCambioCorreo(nuevo) {
      const { error } = await sesion.auth.updateUser({ email: nuevo }, { emailRedirectTo: appUrl('/auth/confirm?next=%2Fdashboard%2Faccount') });
      if (error) {
        const ya = error.message.toLowerCase().includes('already');
        throw new ErrorCuenta(ya ? 'DATOS_INVALIDOS' : 'FALLO', ya ? 'Ya existe una cuenta con ese correo.' : 'No fue posible enviar la confirmación al correo nuevo.');
      }
    },
    async actualizarNombre(idUsuario, nombre) {
      const { error } = await servicio.from('perfiles_usuario').update({ nombre_mostrado: nombre, actualizado_en: new Date().toISOString() }).eq('id_usuario', idUsuario);
      if (error) throw new ErrorCuenta('FALLO', 'No fue posible guardar el nombre.');
    },
    async registrarEvento(accion, idUsuario, datos) {
      const { error } = await servicio.rpc('registrar_evento_acceso', { p_id_actor: idUsuario, p_id_usuario: idUsuario, p_accion: accion, p_datos: datos });
      if (error) throw new Error('auditoría');
    },
  };
}
```

- [ ] **Step 6: Ruta `PATCH /api/account`**

`src/app/api/account/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { actualizarNombre, cambiarContrasena, ErrorCuenta, solicitarCambioCorreo } from '@/modules/access/account-service';
import { crearPuertoCuenta } from '@/modules/access/account-port-supabase';
import { currentUser } from '@/platform/auth/current-user';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';

export const dynamic = 'force-dynamic';

function responder(cuerpo: object, estado: number): NextResponse {
  return NextResponse.json(cuerpo, { status: estado, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(solicitud: Request) {
  if (!supabasePublicoConfigurado() || !supabaseConfigurado()) return responder({ error: 'Mi cuenta requiere el acceso con Supabase.' }, 503);
  const usuario = await currentUser();
  if (!usuario) return responder({ error: 'Inicie sesión para continuar.' }, 401);
  const sesionSupabase = await crearClienteSupabaseSesion();
  const { data: { user: auth } } = await sesionSupabase.auth.getUser();
  if (!auth?.email) return responder({ error: 'Inicie sesión para continuar.' }, 401);

  let cuerpo: Record<string, unknown>;
  try { cuerpo = await solicitud.json() as Record<string, unknown>; } catch { return responder({ error: 'La solicitud no es válida.' }, 400); }

  const puerto = crearPuertoCuenta(sesionSupabase, crearClienteSupabaseServidor());
  const contexto = { idUsuario: usuario.id, correo: auth.email };
  try {
    if (cuerpo.accion === 'NOMBRE') { await actualizarNombre(puerto, contexto, { nombre: cuerpo.nombre }); return responder({ ok: true }, 200); }
    if (cuerpo.accion === 'CONTRASENA') { await cambiarContrasena(puerto, contexto, { actual: cuerpo.actual, nueva: cuerpo.nueva }); return responder({ ok: true }, 200); }
    if (cuerpo.accion === 'CORREO') {
      await solicitarCambioCorreo(puerto, contexto, { contrasenaActual: cuerpo.contrasenaActual, correoNuevo: cuerpo.correoNuevo });
      return responder({ ok: true, mensaje: 'Enviamos una confirmación al correo nuevo. Hasta que la confirme, seguirá entrando con el correo actual.' }, 200);
    }
    return responder({ error: 'La acción solicitada no es válida.' }, 400);
  } catch (error) {
    if (error instanceof ErrorCuenta) return responder({ error: error.message }, error.codigo === 'FALLO' ? 500 : error.codigo === 'CONTRASENA_INCORRECTA' ? 403 : 400);
    return responder({ error: 'No fue posible completar la operación.' }, 500);
  }
}
```

- [ ] **Step 7: Página y formularios de Mi cuenta**

`src/app/dashboard/account/page.tsx`:

```tsx
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';
import { WorkspaceShell } from '../_components/workspace-shell';
import { requireWorkspaceUser } from '../require-workspace-user';
import { AccountForms } from './account-forms';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN', 'ARKA_ATTORNEY', 'IE_RECTOR', 'IE_SUPPORT']);
  let correo = '';
  if (supabasePublicoConfigurado()) {
    const { data: { user: auth } } = await (await crearClienteSupabaseSesion()).auth.getUser();
    correo = auth?.email ?? '';
  }
  return <WorkspaceShell user={user} activePath="/dashboard/account"><div className="page-stack">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Mi espacio</p><h1>Mi cuenta</h1><p>Actualice su nombre, su contraseña y el correo con el que inicia sesión.</p></div></header>
    {correo ? <AccountForms nombre={user.name} correo={correo} /> : <section className="surface"><p>Mi cuenta está disponible cuando LEXCON usa el acceso con Supabase.</p></section>}
  </div></WorkspaceShell>;
}
```

`src/app/dashboard/account/account-forms.tsx`:

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/platform/auth/password-policy';

async function enviar(cuerpo: object): Promise<{ mensaje?: string }> {
  const respuesta = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const datos = await respuesta.json() as { error?: string; mensaje?: string };
  if (!respuesta.ok) throw new Error(datos.error ?? 'No fue posible completar la operación.');
  return datos;
}

function useAccion() {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true); setMensaje(''); setError('');
    try { setMensaje(await accion()); } catch (causa) { setError(causa instanceof Error ? causa.message : 'No fue posible completar la operación.'); } finally { setOcupado(false); }
  }
  return { mensaje, error, ocupado, ejecutar };
}

export function AccountForms({ nombre, correo }: { nombre: string; correo: string }) {
  const perfil = useAccion();
  const correoForm = useAccion();
  const clave = useAccion();
  const [verClaves, setVerClaves] = useState(false);
  const tipo = verClaves ? 'text' : 'password';

  function guardarNombre(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    void perfil.ejecutar(async () => { await enviar({ accion: 'NOMBRE', nombre: datos.get('nombre') }); return 'Nombre actualizado. Verá el cambio al recargar la página.'; });
  }

  function cambiarCorreo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    void correoForm.ejecutar(async () => {
      const respuesta = await enviar({ accion: 'CORREO', correoNuevo: datos.get('correoNuevo'), contrasenaActual: datos.get('contrasenaActual') });
      formulario.reset();
      return respuesta.mensaje ?? 'Enviamos una confirmación al correo nuevo.';
    });
  }

  function cambiarClave(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    if (datos.get('nueva') !== datos.get('confirmar')) { void clave.ejecutar(async () => { throw new Error('Las contraseñas nuevas no coinciden.'); }); return; }
    void clave.ejecutar(async () => { await enviar({ accion: 'CONTRASENA', actual: datos.get('actual'), nueva: datos.get('nueva') }); formulario.reset(); return 'Contraseña actualizada.'; });
  }

  return <div className="management-layout">
    <section className="surface management-form"><p className="section-kicker">Perfil</p><h2>Nombre visible</h2>
      <form onSubmit={guardarNombre}><label htmlFor="nombre">Nombre<input required id="nombre" name="nombre" maxLength={160} defaultValue={nombre} /></label><button className="primary-button" disabled={perfil.ocupado}>{perfil.ocupado ? 'Guardando…' : 'Guardar nombre'}</button></form>
      {perfil.mensaje && <p className="form-message" role="status">{perfil.mensaje}</p>}{perfil.error && <p className="form-message" role="alert">{perfil.error}</p>}
    </section>
    <section className="surface management-form"><p className="section-kicker">Acceso</p><h2>Correo de inicio de sesión</h2>
      <p>Su correo actual es <strong>{correo}</strong>. Enviaremos una confirmación al correo nuevo; hasta que la confirme, seguirá entrando con el actual.</p>
      <form onSubmit={cambiarCorreo}><label htmlFor="correoNuevo">Correo nuevo<input required id="correoNuevo" name="correoNuevo" type="email" autoComplete="email" /></label><label htmlFor="contrasenaActual">Contraseña actual<input required id="contrasenaActual" name="contrasenaActual" type={tipo} autoComplete="current-password" /></label><button className="primary-button" disabled={correoForm.ocupado}>{correoForm.ocupado ? 'Enviando…' : 'Cambiar correo'}</button></form>
      {correoForm.mensaje && <p className="form-message" role="status">{correoForm.mensaje}</p>}{correoForm.error && <p className="form-message" role="alert">{correoForm.error}</p>}
    </section>
    <section className="surface management-form"><p className="section-kicker">Seguridad</p><h2>Cambiar contraseña</h2>
      <p>Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
      <form onSubmit={cambiarClave}><label htmlFor="actual">Contraseña actual<input required id="actual" name="actual" type={tipo} autoComplete="current-password" /></label><label htmlFor="nueva">Contraseña nueva<input required minLength={MIN_PASSWORD_LENGTH} id="nueva" name="nueva" type={tipo} autoComplete="new-password" /></label><label htmlFor="confirmar">Confirmar contraseña nueva<input required minLength={MIN_PASSWORD_LENGTH} id="confirmar" name="confirmar" type={tipo} autoComplete="new-password" /></label><button type="button" className="text-button" aria-pressed={verClaves} onClick={() => setVerClaves((v) => !v)}>{verClaves ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</button><button className="primary-button" disabled={clave.ocupado}>{clave.ocupado ? 'Actualizando…' : 'Actualizar contraseña'}</button></form>
      {clave.mensaje && <p className="form-message" role="status">{clave.mensaje}</p>}{clave.error && <p className="form-message" role="alert">{clave.error}</p>}
    </section>
  </div>;
}
```

- [ ] **Step 8: Añadir "Mi cuenta" a la navegación**

En `src/app/dashboard/_components/workspace-shell.tsx`, reemplazar la función `navFor` completa (desde `function navFor(user: CurrentUser)` hasta su llave de cierre; las funciones y tipos vecinos no se tocan) por esta versión, que conserva los elementos existentes y agrega Mi cuenta a los cuatro roles con sesión:

```tsx
const accountItem: NavigationItem = { href: '/dashboard/account', label: 'Mi cuenta', icon: '◍', section: 'MI ESPACIO' };

function baseNavFor(user: CurrentUser): NavigationItem[] {
  if (user.role === 'ARKA_ADMIN') return [
    { href: '/dashboard/admin', label: 'Bandeja de trabajo', icon: '▦', section: 'OPERACIÓN CONTRACTUAL' },
    { href: '/dashboard/admin/processes', label: 'Procesos por IE', icon: '□' },
    { href: '/dashboard/admin/assignments', label: 'Asignar responsable jurídico', icon: '+' },
    { href: '/dashboard/admin/alerts', label: 'Alertas y bloqueos', icon: '!' },
    { href: '/dashboard/admin/institutions', label: 'Instituciones Educativas', icon: '⌂', section: 'ADMINISTRACIÓN ARKA' },
    { href: '/dashboard/admin/institutions/new', label: 'Registrar Institución Educativa', icon: '+' },
    { href: '/dashboard/admin/lawyers', label: 'Equipo jurídico', icon: '◌' },
    { href: '/dashboard/admin/lawyers/new', label: 'Registrar abogado Arka', icon: '+' },
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

(El plan visual cambia después los textos "Arka" a "Lexcon"; aquí se conservan sin tocar.)

- [ ] **Step 9: Tipos y suite**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: todo en verde.

- [ ] **Step 10: Documentación del hito**

- `docs/current-state.md`: añadir `Mi cuenta (/dashboard/account) permite a Administrador, Abogado, Rector y Apoyo IE cambiar su nombre, su contraseña y su correo de inicio de sesión. El cambio de correo exige la contraseña actual y se completa al confirmar desde el correo nuevo; el perfil se sincroniza por trigger. Requiere desactivar "Secure email change" en Supabase Auth.`
- `docs/architecture.md`: añadir `Mi cuenta usa src/modules/access/account-service.ts sobre un puerto (account-port-supabase.ts): la contraseña actual se verifica con un cliente aislado para no alterar la sesión, y los cambios se aplican con el cliente de sesión de la persona; el nombre y la auditoría usan la clave de servicio.`

- [ ] **Step 11: Commit (solo con autorización explícita)**

```bash
git add src/modules/access/account-service.ts src/modules/access/account-port-supabase.ts src/app/api/account src/app/dashboard/account src/app/dashboard/_components/workspace-shell.tsx tests/unit/account-service.test.ts docs
git commit -m "feat: agregar Mi cuenta para cambiar nombre, contraseña y correo"
```

---

### Task 8: Corrección de correo por el Administrador

**Files:**
- Create: `src/modules/access/email-correction.ts`
- Create: `tests/unit/email-correction.test.ts`
- Modify: `src/app/api/admin/users/route.ts`
- Rewrite: `src/app/dashboard/admin/user-access-management.tsx`

- [ ] **Step 1: Escribir la prueba que falla**

`tests/unit/email-correction.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { corregirCorreo, ErrorCorreo, type PuertoCorreccionCorreo } from '../../src/modules/access/email-correction';

const admin = { id: 'a-1', role: 'ARKA_ADMIN' as const };
const objetivo = { id: 'u-2', nombre: 'Luis', correo: 'luis@viejo.com', activo: true };

function puertoFalso(parcial: Partial<PuertoCorreccionCorreo> = {}): PuertoCorreccionCorreo {
  return {
    buscarUsuario: vi.fn().mockResolvedValue(objetivo),
    existeCorreo: vi.fn().mockResolvedValue(false),
    actualizarCorreoAuth: vi.fn().mockResolvedValue(undefined),
    registrarEvento: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

describe('corregirCorreo', () => {
  it('cambia el correo en Auth y deja auditoría enmascarada', async () => {
    const puerto = puertoFalso();
    await corregirCorreo(puerto, admin, 'u-2', 'Luis@Nuevo.com');
    expect(puerto.actualizarCorreoAuth).toHaveBeenCalledWith('u-2', 'luis@nuevo.com');
    expect(puerto.registrarEvento).toHaveBeenCalledWith('a-1', 'u-2', { correo_anterior: 'l***@viejo.com', correo_nuevo: 'l***@nuevo.com' });
  });

  it('solo un Administrador puede corregir correos', async () => {
    await expect(corregirCorreo(puertoFalso(), { id: 'x', role: 'ARKA_ATTORNEY' }, 'u-2', 'a@b.co')).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
  });

  it('un Administrador no corrige su propio correo por esta vía', async () => {
    await expect(corregirCorreo(puertoFalso(), admin, 'a-1', 'a@b.co')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una cuenta inexistente', async () => {
    const puerto = puertoFalso({ buscarUsuario: vi.fn().mockResolvedValue(null) });
    await expect(corregirCorreo(puerto, admin, 'u-9', 'a@b.co')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un correo ya registrado', async () => {
    const puerto = puertoFalso({ existeCorreo: vi.fn().mockResolvedValue(true) });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'otro@correo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(puerto.actualizarCorreoAuth).not.toHaveBeenCalled();
  });

  it('rechaza un correo igual al actual o inválido', async () => {
    await expect(corregirCorreo(puertoFalso(), admin, 'u-2', 'LUIS@viejo.com')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(corregirCorreo(puertoFalso(), admin, 'u-2', 'sin-arroba')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('revierte el correo si falla la auditoría', async () => {
    const puerto = puertoFalso({ registrarEvento: vi.fn().mockRejectedValue(new Error('auditoría')) });
    await expect(corregirCorreo(puerto, admin, 'u-2', 'luis@nuevo.com')).rejects.toBeInstanceOf(ErrorCorreo);
    expect(puerto.actualizarCorreoAuth).toHaveBeenNthCalledWith(1, 'u-2', 'luis@nuevo.com');
    expect(puerto.actualizarCorreoAuth).toHaveBeenNthCalledWith(2, 'u-2', 'luis@viejo.com');
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `corepack pnpm exec vitest run tests/unit/email-correction.test.ts`
Expected: FAIL por import no resuelto.

- [ ] **Step 3: Implementar servicio y adaptador**

`src/modules/access/email-correction.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { enmascararCorreo } from '@/platform/security/mask-email';

export type CodigoErrorCorreo = 'NO_AUTORIZADO' | 'DATOS_INVALIDOS' | 'FALLO';

export class ErrorCorreo extends Error {
  constructor(readonly codigo: CodigoErrorCorreo, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCorreo';
  }
}

export interface UsuarioCorregible { id: string; nombre: string; correo: string; activo: boolean }

export interface PuertoCorreccionCorreo {
  buscarUsuario(idUsuario: string): Promise<UsuarioCorregible | null>;
  existeCorreo(correo: string): Promise<boolean>;
  actualizarCorreoAuth(idUsuario: string, correo: string): Promise<void>;
  registrarEvento(idActor: string, idUsuario: string, datos: Record<string, string>): Promise<void>;
}

export async function corregirCorreo(
  puerto: PuertoCorreccionCorreo,
  actor: { id: string; role: string },
  idUsuario: string,
  correoNuevo: unknown,
): Promise<void> {
  if (actor.role !== 'ARKA_ADMIN') throw new ErrorCorreo('NO_AUTORIZADO', 'No tienes autorización para corregir correos.');
  if (idUsuario === actor.id) throw new ErrorCorreo('DATOS_INVALIDOS', 'Para cambiar su propio correo use Mi cuenta.');
  const nuevo = typeof correoNuevo === 'string' ? correoNuevo.trim().toLowerCase() : '';
  if (!nuevo || nuevo.length > 254 || !/^\S+@\S+\.\S+$/.test(nuevo)) throw new ErrorCorreo('DATOS_INVALIDOS', 'El correo nuevo no es válido.');
  const usuario = await puerto.buscarUsuario(idUsuario);
  if (!usuario) throw new ErrorCorreo('DATOS_INVALIDOS', 'La cuenta solicitada no existe.');
  if (usuario.correo.toLowerCase() === nuevo) throw new ErrorCorreo('DATOS_INVALIDOS', 'El correo nuevo debe ser distinto del actual.');
  if (await puerto.existeCorreo(nuevo)) throw new ErrorCorreo('DATOS_INVALIDOS', 'Ya existe una cuenta con ese correo.');

  await puerto.actualizarCorreoAuth(usuario.id, nuevo);
  try {
    await puerto.registrarEvento(actor.id, usuario.id, { correo_anterior: enmascararCorreo(usuario.correo), correo_nuevo: enmascararCorreo(nuevo) });
  } catch {
    await puerto.actualizarCorreoAuth(usuario.id, usuario.correo).catch(() => undefined);
    throw new ErrorCorreo('FALLO', 'No fue posible registrar el cambio en la auditoría. El correo no se modificó.');
  }
}

export function crearPuertoCorreccion(supabase: SupabaseClient): PuertoCorreccionCorreo {
  return {
    async buscarUsuario(idUsuario) {
      const { data, error } = await supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado,correo_electronico,activo').eq('id_usuario', idUsuario).maybeSingle();
      if (error) throw new ErrorCorreo('FALLO', 'No fue posible consultar la cuenta.');
      return data ? { id: data.id_usuario as string, nombre: data.nombre_mostrado as string, correo: data.correo_electronico as string, activo: data.activo as boolean } : null;
    },
    async existeCorreo(correo) {
      const { count, error } = await supabase.from('perfiles_usuario').select('id_usuario', { count: 'exact', head: true }).eq('correo_electronico', correo);
      if (error) throw new ErrorCorreo('FALLO', 'No fue posible verificar el correo.');
      return (count ?? 0) > 0;
    },
    async actualizarCorreoAuth(idUsuario, correo) {
      const { error } = await supabase.auth.admin.updateUserById(idUsuario, { email: correo, email_confirm: true });
      if (error) {
        const ya = error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered');
        throw new ErrorCorreo(ya ? 'DATOS_INVALIDOS' : 'FALLO', ya ? 'Ya existe una cuenta con ese correo.' : 'No fue posible actualizar el correo en el servicio de acceso.');
      }
    },
    async registrarEvento(idActor, idUsuario, datos) {
      const { error } = await supabase.rpc('registrar_evento_acceso', { p_id_actor: idActor, p_id_usuario: idUsuario, p_accion: 'EMAIL_CORRECTED', p_datos: datos });
      if (error) throw new Error('auditoría');
    },
  };
}
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `corepack pnpm exec vitest run tests/unit/email-correction.test.ts`
Expected: PASS (7 pruebas).

- [ ] **Step 5: Acción `CORREGIR_CORREO` en la ruta**

En `src/app/api/admin/users/route.ts`:

1. Agregar imports:

```ts
import { corregirCorreo, crearPuertoCorreccion } from '@/modules/access/email-correction';
import { crearClienteSupabaseServidor } from '@/platform/supabase/server';
```

2. Cambiar el tipo del cuerpo en `PATCH` y la cadena de acciones. Reemplazar:

```ts
    const data = await request.json() as { idUsuario?: string; accion?: 'REENVIAR' | 'CAMBIAR_ESTADO'; activo?: boolean };
    if (!data.idUsuario || !data.accion) throw new Error('Selecciona una cuenta y una acción.');
    if (data.accion === 'REENVIAR') await reenviarAcceso(user, data.idUsuario);
    else if (data.accion === 'CAMBIAR_ESTADO' && typeof data.activo === 'boolean') await cambiarEstadoUsuario(user, data.idUsuario, data.activo);
    else throw new Error('La acción solicitada no es válida.');
```

por:

```ts
    const data = await request.json() as { idUsuario?: string; accion?: 'REENVIAR' | 'CAMBIAR_ESTADO' | 'CORREGIR_CORREO'; activo?: boolean; correo?: string };
    if (!data.idUsuario || !data.accion) throw new Error('Selecciona una cuenta y una acción.');
    if (data.accion === 'REENVIAR') await reenviarAcceso(user, data.idUsuario);
    else if (data.accion === 'CAMBIAR_ESTADO' && typeof data.activo === 'boolean') await cambiarEstadoUsuario(user, data.idUsuario, data.activo);
    else if (data.accion === 'CORREGIR_CORREO') await corregirCorreo(crearPuertoCorreccion(crearClienteSupabaseServidor()), { id: user.id, role: user.role }, data.idUsuario, data.correo);
    else throw new Error('La acción solicitada no es válida.');
```

3. El `catch` existente de `PATCH` ya devuelve `error.message`, así que los mensajes de `ErrorCorreo` llegan a la pantalla sin más cambios.

- [ ] **Step 6: Reescribir `user-access-management.tsx` con "Corregir correo"**

Reemplazar todo el contenido de `src/app/dashboard/admin/user-access-management.tsx` por esta versión (misma funcionalidad que la actual, separada en líneas legibles y con la corrección de correo):

```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitucionParaAcceso, RolAdministrable, UsuarioAdministrado } from '@/modules/access/supabase-user-administration';

const labels: Record<RolAdministrable, string> = { ADMINISTRADOR_ARKA: 'Administrador', ABOGADO_ARKA: 'Abogado', RECTOR_IE: 'Rector', APOYO_IE: 'Apoyo IE' };

export function UserAccessManagement({ usuarios: initialUsuarios, instituciones, idActor }: { usuarios: UsuarioAdministrado[]; instituciones: InstitucionParaAcceso[]; idActor: string }) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rol, setRol] = useState<RolAdministrable>('ABOGADO_ARKA');
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const institucional = rol === 'RECTOR_IE' || rol === 'APOYO_IE';

  async function api(method: 'POST' | 'PATCH', body: object) {
    const response = await fetch('/api/admin/users', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'No fue posible completar la acción.');
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const form = new FormData(formulario);
    setBusy(true); setMessage('');
    try {
      await api('POST', { nombre: form.get('nombre'), correo: form.get('correo'), codigoRol: rol, idInstitucion: institucional ? form.get('idInstitucion') : null });
      setMessage('Invitación enviada. La persona recibirá un enlace para definir su contraseña.');
      formulario.reset(); setRol('ABOGADO_ARKA'); router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible invitar a la persona.');
    } finally { setBusy(false); }
  }

  async function action(usuario: UsuarioAdministrado, accion: 'REENVIAR' | 'CAMBIAR_ESTADO', activo?: boolean) {
    setBusy(true); setMessage('');
    try {
      await api('PATCH', { idUsuario: usuario.id, accion, activo });
      if (accion === 'CAMBIAR_ESTADO' && typeof activo === 'boolean') setUsuarios((current) => current.map((item) => item.id === usuario.id ? { ...item, activo } : item));
      setMessage(accion === 'REENVIAR' ? `Se reenvió el enlace a ${usuario.correo}.` : `El acceso fue ${activo ? 'activado' : 'desactivado'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar el acceso.');
    } finally { setBusy(false); }
  }

  async function corregir(event: FormEvent<HTMLFormElement>, usuario: UsuarioAdministrado) {
    event.preventDefault();
    const correo = String(new FormData(event.currentTarget).get('correo') ?? '').trim().toLowerCase();
    setBusy(true); setMessage('');
    try {
      await api('PATCH', { idUsuario: usuario.id, accion: 'CORREGIR_CORREO', correo });
      setUsuarios((current) => current.map((item) => item.id === usuario.id ? { ...item, correo } : item));
      setCorrigiendo(null);
      setMessage(`El correo de ${usuario.nombre} ahora es ${correo}. Use "Reenviar enlace" para que defina una contraseña nueva.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible corregir el correo.');
    } finally { setBusy(false); }
  }

  return <div className="management-layout">
    <section className="surface management-form">
      <p className="section-kicker">Nueva cuenta</p><h2>Invitar usuario</h2>
      <p>El comité evaluador no se registra aquí: participa solo como información del proceso y no accede a la aplicación.</p>
      <form onSubmit={invite}>
        <label>Nombre completo<input required name="nombre" maxLength={160} /></label>
        <label>Correo electrónico<input required name="correo" type="email" autoComplete="email" /></label>
        <label>Rol<select value={rol} onChange={(event) => setRol(event.target.value as RolAdministrable)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {institucional && <label>Institución Educativa<select required name="idInstitucion" defaultValue=""><option value="" disabled>Seleccione una institución</option>{instituciones.map((institucion) => <option key={institucion.id} value={institucion.id}>{institucion.nombre}</option>)}</select></label>}
        {institucional && instituciones.length === 0 && <p className="form-message">Primero registre una Institución Educativa activa.</p>}
        <button className="primary-button" disabled={busy || (institucional && instituciones.length === 0)}>{busy ? 'Enviando…' : 'Enviar invitación'}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
    <section className="surface management-list">
      <div className="section-heading"><div><p className="section-kicker">Cuentas autorizadas</p><h2>Usuarios de LEXCON</h2></div><span>{usuarios.filter((usuario) => usuario.activo).length} activos</span></div>
      <ul>{usuarios.map((usuario) => <li key={usuario.id}>
        <div><strong>{usuario.nombre}</strong><span className={`service-state ${usuario.activo ? 'active' : 'ended'}`}>{usuario.activo ? 'Activo' : 'Desactivado'}</span><small>{labels[usuario.rol]}{usuario.institucion ? ` · ${usuario.institucion}` : ''}</small><small>{usuario.correo}</small></div>
        <div className="row-actions">
          {usuario.activo && <button type="button" disabled={busy} onClick={() => action(usuario, 'REENVIAR')}>Reenviar enlace</button>}
          {usuario.id !== idActor && <button type="button" disabled={busy} onClick={() => setCorrigiendo(corrigiendo === usuario.id ? null : usuario.id)}>Corregir correo</button>}
          <button type="button" className={usuario.activo ? 'danger-button' : undefined} disabled={busy} onClick={() => action(usuario, 'CAMBIAR_ESTADO', !usuario.activo)}>{usuario.activo ? 'Desactivar' : 'Reactivar'}</button>
        </div>
        {corrigiendo === usuario.id && <form className="management-form" onSubmit={(event) => corregir(event, usuario)}>
          <p>¿Corregir el correo de <strong>{usuario.nombre}</strong> (hoy <strong>{usuario.correo}</strong>)? Quedará registrado en la auditoría.</p>
          <label>Correo nuevo<input required name="correo" type="email" autoComplete="off" /></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar corrección'}</button>
        </form>}
      </li>)}</ul>
      {usuarios.length === 0 && <p>Aún no hay usuarios invitados.</p>}
    </section>
  </div>;
}
```

- [ ] **Step 7: Pasar `idActor` desde la página**

En `src/app/dashboard/admin/users/page.tsx`, reemplazar:

```tsx
<UserAccessManagement usuarios={usuarios} instituciones={instituciones} />
```

por:

```tsx
<UserAccessManagement usuarios={usuarios} instituciones={instituciones} idActor={user.id} />
```

- [ ] **Step 8: Tipos y suite**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: todo en verde.

- [ ] **Step 9: Documentación del hito**

- `docs/current-state.md`: añadir `En Usuarios y accesos, el Administrador puede corregir el correo de otra cuenta (por ejemplo, cuando el buzón anterior está lleno o bloqueado) y reenviarle el enlace para definir una contraseña nueva. La corrección queda en la auditoría con los correos enmascarados.`
- `docs/architecture.md`: añadir `La corrección de correo (src/modules/access/email-correction.ts) cambia el correo en Auth con la clave de servicio, deja el evento EMAIL_CORRECTED mediante registrar_evento_acceso y revierte el cambio si la auditoría falla. El trigger de la migración 20261011150000 copia el correo al perfil.`

- [ ] **Step 10: Commit (solo con autorización explícita)**

```bash
git add src/modules/access/email-correction.ts src/app/api/admin/users/route.ts src/app/dashboard/admin/user-access-management.tsx src/app/dashboard/admin/users/page.tsx tests/unit/email-correction.test.ts docs
git commit -m "feat: permitir al administrador corregir el correo de una cuenta"
```

---

### Task 9: Verificación final local (sin Supabase)

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa y guías**

Run: `corepack pnpm typecheck && corepack pnpm test && node scripts/sync-agent-guides.mjs --check`
Expected: todo en verde.

- [ ] **Step 2: Compilación de producción**

Run: `corepack pnpm build`
Expected: compila; aparecen las rutas `/setup`, `/api/setup`, `/api/account` y `/dashboard/account` en el resumen.

- [ ] **Step 3: Comprobación local temporal (autorizada)**

Arranca una instancia temporal y comprueba el comportamiento sin Supabase (modo local):

Run: `corepack pnpm exec next dev -p 3100` (en segundo plano)

1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/setup` → `404`.
2. Inicia sesión con una cuenta de demostración (consulta `src/platform/auth/demo-credentials.ts`) y abre `/dashboard/account`: debe mostrar "Mi cuenta está disponible cuando LEXCON usa el acceso con Supabase.".
3. En `/dashboard/admin/users` (solo con Supabase) no aplica: la pantalla se prueba en el dominio.

Detén la instancia y confirma que el puerto 3100 queda libre:

Run: `powershell -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue"`
Expected: sin salida.

Restablece el archivo generado por Next: `git checkout -- next-env.d.ts`.

---

### Task 10: Verificación en el dominio (con Supabase real)

Esta tarea la hace la persona responsable junto con quien implementa, **después del despliegue**. Nada de esto se ejecuta desde un equipo de desarrollo contra producción sin esa persona presente.

- [ ] **Step 1: Ajustes en Supabase (Authentication → Sign In / Providers)**
  - Desactivar **Secure email change** (así basta confirmar el correo nuevo).
  - Fijar la longitud mínima de contraseña en **8** o menos.
  - Confirmar que el proveedor SMTP sigue activo y que la URL del sitio es `https://lexcon.arkaiag.com`.

- [ ] **Step 2: Aplicar la migración**

Run (con la CLI de Supabase ya autenticada y enlazada al proyecto LEXCON IAG): `supabase db push`
Expected: aplica `20261011150000_sincronizar_correo_y_auditar_acceso.sql`. Verificar en el editor SQL: `select tgname from pg_trigger where tgname = 'sincronizar_correo_perfil';` devuelve una fila.

- [ ] **Step 3: Desplegar y definir el código**
  - En Dokploy, definir `LEXCON_SETUP_TOKEN` con al menos 24 caracteres aleatorios y desplegar.
  - Abrir `https://lexcon.arkaiag.com/setup`: debe mostrar "Cree al primer administrador" (si todavía no hay administrador) o la recuperación (si ya existe uno).

- [ ] **Step 4: Crear o recuperar el administrador**
  - Con el código, crear el administrador con su correo real y una contraseña de 8 o más caracteres.
  - Iniciar sesión en `/login` con esas credenciales.
  - Repetir el código incorrecto 5 veces desde un navegador: debe bloquearse con el mensaje genérico y desbloquearse a los 15 minutos.
  - Probar una contraseña de más de 72 bytes (por ejemplo 80 caracteres) al crear o cambiar una contraseña: si Supabase la rechaza, bajar `MAX_PASSWORD_LENGTH` en `src/platform/auth/password-policy.ts` al límite real y ajustar su prueba.

- [ ] **Step 5: Retirar el código**
  - Quitar `LEXCON_SETUP_TOKEN` de Dokploy y reiniciar. `https://lexcon.arkaiag.com/setup` debe responder "no encontrada".

- [ ] **Step 6: Mi cuenta**
  - En `/dashboard/account`: cambiar el nombre, cambiar la contraseña con la actual y volver a entrar; solicitar un cambio de correo, abrir la confirmación en el correo nuevo y comprobar que el inicio de sesión ya funciona con el correo nuevo y que Usuarios y accesos muestra el correo actualizado.

- [ ] **Step 7: Corrección de correo**
  - Invitar a una cuenta de prueba, corregir su correo desde Usuarios y accesos, reenviar el enlace y comprobar que llega al correo corregido. Revisar en Registro de actuaciones que quedaron los eventos con los correos enmascarados.

- [ ] **Step 8: Cerrar**
  - Si todo funciona, actualizar `docs/current-state.md` quitando la nota de "requiere aplicar la migración" y confirmar el cambio con autorización explícita.

---

## Autorrevisión del plan contra la especificación

- `/setup` con tres estados, código en tiempo constante, bloqueo por IP y global, mensaje genérico, `no-store`, 404 sin código: Tareas 2–5.
- Creación con correo confirmado, reversión si falla el rol, doble verificación de estado antes de actuar: Tarea 3 (`contarAdministradoresActivos` antes de crear y de listar) y la función SQL existente `registrar_acceso_usuario`.
- Recuperación de un administrador existente con auditoría: Tareas 3 y 6.
- Mi cuenta para los cuatro roles (contraseña con la actual, nombre, correo con confirmación): Tarea 7.
- Corrección de correo por el Administrador con auditoría, sin uso sobre sí mismo: Tarea 8.
- Mínimo de 8 caracteres en todos los flujos web: Tarea 1 (`update-password`), Tareas 3 y 7.
- Prerrequisito "Secure email change": Tarea 10, paso 1, y decisión 054.
- Trigger de sincronización y auditoría: Tarea 6.
- Documentación (054, README, architecture, current-state, `.env.example`): Tareas 6, 7 y 8.
- Fuera de alcance respetado: sin super administrador, sin 2FA, sin rediseño visual (plan B).
