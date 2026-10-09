# Plan de migración de runtime a Supabase y despliegue Dokploy

- **Fecha:** 2026-10-08
- **Estado:** En ejecución — Fase 1 completada; fases 2 a 7 pendientes
- **Diseño de referencia:** `docs/superpowers/specs/2026-10-08-despliegue-dokploy-y-produccion-supabase-design.md`

## Resultado esperado

LEXCON IAG se ejecuta en Dokploy con los servicios `web` y `worker`. Ambos usan el proyecto Supabase externo de LEXCON IAG para Auth, PostgreSQL, Storage privado y trabajo asíncrono. La aplicación no crea ni consulta una base SQLite en el entorno objetivo. La validación inicial usa cuatro cuentas y datos ficticios; no admite evidencia institucional real hasta completar la verificación de recuperación y aislamiento.

## Fase 1: inventario y capa de acceso a Supabase

1. Documentar la correspondencia entre cada tabla SQLite actual y las tablas remotas en español.
2. Ampliar el cliente de Supabase para separar:
   - cliente ligado a una sesión autenticada, sujeto a RLS;
   - cliente de servidor para operaciones administrativas explícitas;
   - cliente de worker con alcance mínimo para tareas persistidas.
3. Reemplazar la configuración basada en `LEXCON_DATABASE_URL` por las variables privadas de Supabase requeridas en ejecución.
4. Crear una comprobación de arranque que falle con un mensaje seguro cuando falte una variable privada o el proyecto remoto no sea accesible.
5. Añadir pruebas unitarias para configuración incompleta, configuración válida y prohibición de importar secretos en componentes cliente.

**Criterio de salida:** la aplicación puede establecer clientes de Supabase correctos sin activar SQLite.

**Avance 2026-10-08:** completado. Se añadieron la configuración pública validada, los clientes SSR de navegador y servidor, el `proxy.ts` de renovación de sesión, la separación de la clave de servicio y pruebas de configuración. La semilla idempotente de cuatro cuentas ficticias está preparada y exige `LEXCON_ALLOW_DEMO_SEED=true`; aún no se ha ejecutado contra el proyecto remoto.

## Fase 2: identidad, roles y datos ficticios

1. Sustituir el inicio de sesión, sesión HTTP local y usuario actual por Supabase Auth y la sesión de servidor de Next.js.
2. Resolver el perfil, rol y pertenencia institucional desde `perfiles_usuario` y `asignaciones_roles_usuario`.
3. Implementar una semilla idempotente de demostración que cree cuatro usuarios ficticios en Auth y relacione sus perfiles, roles e instituciones.
4. Mantener las credenciales ficticias fuera de producción real y exigir una bandera explícita para ejecutar la semilla.
5. Reescribir las pruebas de autenticación, autorización y aislamiento usando usuarios de prueba del proyecto o un entorno de Supabase aislado.

**Criterio de salida:** las cuatro cuentas ficticias inician sesión y únicamente acceden a su espacio autorizado mediante RLS.

**Avance 2026-10-08:** preparada para validación remota. El inicio y cierre de sesión usan Supabase Auth cuando están configuradas las variables públicas. La identidad se obtiene con la función de mínimo privilegio `public.obtener_identidad_actual()` y se traduce al modelo de roles existente; las credenciales ficticias locales se ocultan en ese modo. La migración remota se aplicó y quedó alineada con el historial local. Faltan ejecutar la semilla ficticia y realizar la prueba de acceso con cuentas separadas.

## Fase 3: procesos, flujo y auditoría

1. Migrar los repositorios de instituciones, asignaciones jurídicas, procesos, cotizaciones, perfiles de estudio, evaluación, selección, contratación y liquidación al esquema remoto.
2. Reemplazar cada consulta SQL SQLite por operaciones del cliente Supabase, funciones SQL restringidas o procedimientos transaccionales cuando una actuación requiera varias escrituras atómicas.
3. Conservar el control de fases, las validaciones de rol y el registro de auditoría en cada transición.
4. Reescribir las rutas HTTP y componentes de servidor para usar repositorios asíncronos de Supabase.
5. Añadir pruebas de integración para aislamiento por Institución Educativa, asignación de abogado, transiciones autorizadas e inmutabilidad de auditoría.

**Criterio de salida:** un proceso ficticio recorre el flujo principal íntegramente en PostgreSQL sin dependencias de SQLite.

## Fase 4: documentos y almacenamiento privado

1. Sustituir el almacenamiento local por el bucket `expediente-privado`.
2. Persistir metadatos, hash, tamaño, MIME, versión y ruta en `archivos_documento` y relaciones documentales asociadas.
3. Adaptar carga, lectura, descarga, generación DOCX y correcciones jurídicas para usar objetos privados y URLs temporales emitidas después de autorizar la operación.
4. Validar tamaño máximo de 25 MiB y tipos permitidos antes de cargar archivos.
5. Probar que un usuario sin pertenencia ni asignación no puede leer metadatos ni descargar objetos de otra institución.

**Criterio de salida:** cargas y descargas ficticias se conservan únicamente en Storage privado y respetan RLS.

## Fase 5: worker y notificaciones

1. Sustituir `sqlite-queue` por un repositorio de tareas y entregas persistido en Supabase.
2. Definir reclamación atómica de trabajo, identificadores de idempotencia, reintentos y resultados de error trazables.
3. Adaptar análisis de mercado, correo y notificaciones push al nuevo repositorio.
4. Ejecutar el worker continuamente como servicio independiente y registrar intentos, fallas y entregas sin duplicar tareas.
5. Cubrir con pruebas una tarea de cada tipo, reintentos y doble ejecución concurrente.

**Criterio de salida:** el worker procesa una tarea ficticia desde Supabase una sola vez y conserva el resultado.

## Fase 6: contenedor y Dokploy

1. Crear Dockerfile multi-etapa con Node.js 24 y compilación reproducible para Next.js.
2. Crear `.dockerignore` que excluya dependencias locales, secretos, archivos SQLite, almacenamiento y artefactos de prueba.
3. Crear Compose con servicios `web` y `worker`, reinicio controlado, comandos de inicio diferenciados y sin contenedor de base de datos.
4. Documentar en README las variables de entorno requeridas sin valores, el procedimiento de despliegue y la configuración de Dokploy: servicio Compose, repositorio GitHub, rama `main`, ruta del archivo Compose, secretos, dominio temporal y logs.
5. Configurar Dokploy para no incluir secretos en el repositorio, exponer solo el servicio web y observar los logs de ambos servicios.

**Criterio de salida:** Dokploy construye la misma revisión de `main`, inicia web y worker, y la página responde por el dominio temporal HTTPS.

## Fase 7: validación operativa y lanzamiento

1. Ejecutar typecheck, pruebas unitarias e integración en un entorno de Supabase de pruebas.
2. Ejecutar una prueba manual completa con los cuatro usuarios ficticios.
3. Verificar RLS para dos instituciones, abogado asignado, administración y acceso denegado.
4. Verificar creación, consulta y restauración de un respaldo PostgreSQL y una copia de Storage por separado.
5. Confirmar que no quedan referencias de runtime a `better-sqlite3`, `LEXCON_DATABASE_URL`, rutas locales de archivos ni cola SQLite.
6. Actualizar `docs/architecture.md`, `docs/current-state.md`, README y decisiones técnicas con la implementación final antes de solicitar autorización para preparar un commit.

**Criterio de salida:** aprobación explícita para cargar datos reales, configurar dominio propio y habilitar producción.

## Orden de ejecución y límites

Las fases 1 a 5 deben concluir antes de la fase 6. La fase 7 bloquea cualquier uso de datos reales. No se ejecutarán migraciones destructivas, cambios en el proyecto remoto de Supabase, cargas de secretos ni despliegues en Dokploy sin autorización explícita adicional.
