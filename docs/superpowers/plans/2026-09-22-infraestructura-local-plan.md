# Plan de implementación: infraestructura local

**Basado en:** `docs/superpowers/specs/2026-09-22-infraestructura-local-design.md`
**Estado:** listo para implementación

## Resultado verificable

Una aplicación LEXCON IAG local iniciable con un comando, con SQLite migrada y poblada solo con datos ficticios, acceso privado de prueba, autorización comprobable, archivos fuera de Git, cola persistente, worker separado y pruebas automatizadas. No contendrá módulos jurídicos ni interfaz de negocio.

## Decisiones de implementación

- `pnpm` administrará un único proyecto Node.js con web y worker como procesos distintos.
- Next.js y TypeScript estricto alojarán la web y rutas HTTP privadas.
- SQLite se accederá a través de Drizzle ORM y migraciones generadas/versionadas; `better-sqlite3` será el adaptador local.
- Zod validará límites de entrada y DTO internos.
- Sesiones opacas persistidas en SQLite y cookies `HttpOnly`, `Secure` en producción y `SameSite=Lax`; contraseñas mediante `scrypt` de `node:crypto` con sal aleatoria.
- Vitest verificará dominio, adaptadores, migraciones y autorización; no se introducirá E2E mientras no exista interfaz de negocio.

## Etapa 1 — Base del proyecto y ejecución local

1. Crear `package.json`, configuración TypeScript estricta, configuración de pruebas, formato y scripts de `pnpm`.
2. Instalar versiones estables compatibles de Next.js, React, TypeScript, Drizzle, SQLite, Zod y Vitest, documentando la versión elegida.
3. Crear el punto de entrada web, un endpoint de salud sin información sensible y el punto de entrada del worker.
4. Añadir `.gitignore` para dependencias, bases SQLite, archivos locales, cobertura, salidas de compilación y secretos.
5. Documentar comandos: instalar, migrar, sembrar, iniciar web, iniciar worker, verificar y compilar.

**Comprobación:** `pnpm verify`, `pnpm build` y `pnpm worker:build` finalizan correctamente; la ejecución no necesita Docker, Supabase ni credenciales externas.

## Etapa 2 — Límites de dominio, contratos y resultados seguros

1. Crear `src/modules/` para entidades, políticas de autorización, comandos, resultados seguros y esquemas Zod.
2. Crear `src/platform/` para adaptadores y contratos de persistencia, almacenamiento, IA, cola, correo, Telegram, documentos, calendario y antimalware.
3. Definir un `CommandResult<T>` consistente para mutaciones y errores seguros, sin filtrar detalles de infraestructura.
4. Establecer reloj, generador de identificadores y transacción como dependencias inyectables para pruebas deterministas.

**Comprobación:** pruebas unitarias demuestran que el dominio no importa SQLite, sistema de archivos, Next.js ni proveedores externos.

## Etapa 3 — Migraciones y modelo físico inicial

1. Configurar Drizzle y el directorio de migraciones versionadas.
2. Crear una migración de identidad y aislamiento: institución, usuario, rol, membresía, capacidad, sesión y asignación Arka.
3. Crear una migración de expediente y reglamento: reglamento/versiones/reglas, instantánea al abrir, expediente, fase, estado, bloqueo, responsables y actuaciones.
4. Crear una migración documental: documento lógico, versión inmutable, archivo, observación, revisión, aprobación, firma, publicación SECOP y evidencia.
5. Crear una migración de estructura futura: mercado, precontractual, oferta, evaluación, comité, decisión, formalización, ejecución, cierre, tarea, alerta, auditoría y trabajo asíncrono.
6. Añadir claves foráneas, restricciones, índices de acceso y reglas de inmutabilidad exigidas por el modelo funcional.
7. Crear un verificador que aplique todas las migraciones en una base vacía temporal.

**Comprobación:** las migraciones crean una base consistente; no hay registros huérfanos, cambios directos a versiones, ni cumplimiento SECOP sin evidencia.

## Etapa 4 — Sesión, autorización y datos ficticios

1. Implementar creación y validación de contraseñas con `scrypt`, comparaciones resistentes a tiempo y políticas de sesión.
2. Implementar inicio y cierre de sesión como rutas privadas; no habrá registro público, recuperación externa ni cuentas en claro.
3. Implementar guardas reutilizables: sesión activa, membresía vigente, capacidad, ámbito institucional y asignación del abogado Arka.
4. Crear una semilla no productiva con administrador Arka, abogados Arka, dos IE, rectores y apoyos; las contraseñas se entregan por mecanismo local documentado y nunca se insertan en el repositorio como texto plano.
5. Añadir pruebas de matriz de acceso: IE cruzada denegada, abogado no asignado denegado, apoyo sin firma/publicación/decisión denegado y administrador global permitido.

**Comprobación:** toda ruta de mutación exige autorización; las pruebas no pueden obtener datos de otra IE ni de un expediente Arka no asignado.

## Etapa 5 — Archivos, auditoría y versionado estructural

1. Implementar el adaptador local de archivos en un directorio privado configurable, ignorado por Git.
2. Validar nombre, extensión permitida, MIME, tamaño y SHA-256 antes de enlazar un archivo con una versión.
3. Implementar el contrato de antimalware como requisito previo, con adaptador local explícitamente no productivo y señalización clara de la limitación.
4. Implementar creación de versiones inmutables, observaciones, aprobaciones y firmas referenciadas a una versión exacta.
5. Implementar escritura de actuaciones de auditoría dentro de la misma transacción de la mutación.

**Comprobación:** una corrección conserva la versión anterior; toda acción se consulta por expediente, actor, instante y versión; los archivos nunca son servidos desde una ruta pública.

## Etapa 6 — Alertas, cola y worker

1. Implementar cola SQLite con estado, intento, fecha de disponibilidad, clave de idempotencia y resultado seguro.
2. Implementar el worker Node como proceso separado, con toma transaccional de trabajos y política acotada de reintentos.
3. Implementar bandeja interna de alertas y adaptadores desactivados para correo y Telegram.
4. Prohibir que los trabajos automáticos aprueben, firmen, publiquen SECOP II o adopten decisiones institucionales.
5. Añadir pruebas de repetición idempotente, reintento seguro y registro de error sin secreto.

**Comprobación:** ejecutar web y worker en terminales distintas procesa un trabajo de prueba una vez y deja una alerta interna trazable.

## Etapa 7 — Endurecimiento, documentación y entrega

1. Revisar que DTO use fechas ISO 8601 y dinero decimal serializado como cadena.
2. Revisar mensajes de error, registros, datos de prueba y exclusión de secretos/archivos/base local del control de versiones.
3. Actualizar `README.md`, `docs/architecture.md`, `docs/current-state.md`, decisiones y modelo de datos lógico con lo implementado.
4. Ejecutar `pnpm verify`, `pnpm build`, `pnpm worker:build` y `node scripts/sync-agent-guides.mjs --check`.
5. Entregar comandos locales y resultado de cada verificación, sin declarar preparación productiva ni sustitutos de verificaciones externas.

## Orden y límites

Las etapas se realizan estrictamente en orden. Si una decisión jurídica o de negocio no está definida, se conserva como estructura de soporte sin activar comportamiento. Las primeras capacidades funcionales se planificarán solo después de que esta infraestructura esté comprobada.
