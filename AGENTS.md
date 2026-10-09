# Repository Guidelines

## Documentación obligatoria

La documentación forma parte de cada cambio. Actualiza `docs/architecture.md` cuando cambien capas, flujos de datos o integraciones; `docs/current-state.md` cuando cambie la funcionalidad, alcance o limitaciones; y crea una decisión numerada en `docs/decisions/` para decisiones técnicas duraderas. Resume cambios de uso o inicio también en `README.md`.

`AGENTS.md` y `CLAUDE.md` deben ser idénticos. Edita preferiblemente `AGENTS.md` y ejecuta `node scripts/sync-agent-guides.mjs --write`. El hook de pre-commit copia automáticamente una guía a la otra si solo una fue preparada. Si ambas difieren, bloquea el commit para evitar perder contenido.

## Estructura y comprobaciones

Mantén código fuente en `src/`, pruebas en `tests/`, documentación de arquitectura y estado en `docs/`, y decisiones técnicas en `docs/decisions/`. No introduzcas una tecnología concreta sin documentar la decisión correspondiente.

Antes de entregar cambios, ejecuta las comprobaciones propias del proyecto y `node scripts/sync-agent-guides.mjs --check`. El hook exige que todo cambio preparado de código, pruebas, configuración o scripts incluya documentación preparada.

## Seguridad y alcance

No confirmes secretos, datos personales, registros, dependencias instaladas ni artefactos generados. Conserva el alcance solicitado y pide autorización antes de sobrescribir archivos existentes o realizar acciones externas irreversibles.

## Operaciones Git

Nunca ejecutes `git add`, `git commit`, `git push` ni subas cambios a un repositorio remoto sin autorización explícita del usuario para esa operación. La autorización para editar archivos, revisar el estado o ejecutar verificaciones no autoriza por sí sola a preparar, confirmar o publicar cambios.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
