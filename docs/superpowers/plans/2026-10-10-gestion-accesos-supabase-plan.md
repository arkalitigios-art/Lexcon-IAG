# Plan de implementación: gestión de accesos con Supabase

- **Fecha:** 2026-10-10
- **Estado:** Implementado localmente y migración aplicada en Supabase; pendiente de SMTP, Dokploy y activación inicial
- **Diseño de referencia:** `docs/superpowers/specs/2026-10-10-gestion-accesos-supabase-design.md`

## Resultado esperado

`lexcon.arkaiag.com` deja de mostrar o aceptar credenciales ficticias. La primera cuenta `arkaiag.co@gmail.com` recibe una invitación para definir su contraseña y entra como **Administrador**. Desde el panel de Administración, las personas autorizadas crean, consultan, activan, desactivan y reenvían accesos de Administradores, Abogados, Rectoría y Apoyo de una IE. Cada persona puede recuperar y gestionar su propio acceso por correo.

## Límites de seguridad

- Nunca exponer `LEXCON_SUPABASE_SERVICE_ROLE_KEY`, enlaces de recuperación, contraseñas ni tokens en el navegador, repositorio, registros o pruebas.
- No usar `user_metadata` para autorizar: el rol se resuelve desde `obtener_identidad_actual()` y las asignaciones persistidas.
- No crear cuentas para integrantes del comité evaluador.
- No borrar perfiles, roles, asignaciones ni eventos históricos; la revocación será lógica y cerrará las sesiones activas.
- No permitir desactivar o degradar al último Administrador activo.
- Ningún cambio remoto de Supabase, SMTP, variables de Dokploy, usuario inicial o despliegue se ejecutará sin autorización específica del usuario.

## Fase 1: contrato de datos y migración restringida

1. Consultar `supabase migration --help` y crear la nueva migración con `supabase migration new`; no inventar el nombre de archivo.
2. Añadir una función SQL transaccional para registrar el perfil, asignar uno de los cuatro roles permitidos y escribir el evento de auditoría. Recibirá el identificador de Auth, nombre, correo, rol, IE opcional y actor.
3. Validar en SQL que Rectoría y Apoyo siempre tengan IE y que Administrador y Abogado no la tengan; rechazar los demás códigos de rol.
4. Revocar ejecución a `PUBLIC`, `anon` y `authenticated`; concederla solo a `service_role`, siguiendo el patrón de las funciones administrativas existentes.
5. Añadir una función o una consulta restringida para listar el directorio administrativo y cambiar estado sin exponer datos de Auth al cliente.
6. Registrar acciones distinguibles: alta, reenvío, recuperación solicitada, activación, desactivación, reactivación, cambio de rol y cambio de correo solicitado.
7. Revisar RLS y ejecutar los asesores de Supabase antes de generar la versión final de la migración.

**Criterio de salida:** el esquema puede relacionar de forma auditable una identidad de Supabase con un único rol activo y una IE cuando corresponde, sin permisos directos para usuarios autenticados comunes.

## Fase 2: servicio de servidor y primera cuenta

1. Crear `src/modules/access/supabase-user-administration.ts` como límite único para operaciones de cuentas de producción.
2. El servicio comprobará la identidad de quien solicita la operación; solo `ARKA_ADMIN` podrá administrar a otras personas. Después utilizará el cliente `service_role` únicamente dentro del servidor.
3. Implementar creación o invitación mediante `auth.admin.inviteUserByEmail`, seguida de la RPC transaccional de la Fase 1. Si la base rechaza la asignación de una identidad recién creada, compensar de forma segura o registrar una incidencia administrable.
4. Implementar reenvío mediante `auth.admin.generateLink` o la API de invitación compatible, sin devolver el enlace a la interfaz: Supabase lo entrega por correo.
5. Implementar desactivación, reactivación y cierre de sesiones con las operaciones administrativas de Auth y el estado del perfil/asignación. Impedir cambiar al último Administrador activo.
6. Crear el comando explícito `supabase:bootstrap-admin`, que exige `--execute`, `LEXCON_BOOTSTRAP_ADMIN_EMAIL` y `LEXCON_BOOTSTRAP_ADMIN_NAME`. El comando invitará solo a la primera cuenta Administrador y se negará si ya existe una activa.
7. Preparar pruebas unitarias del servicio con un cliente de Auth simulado: autorización, entradas inválidas, rol/IE, compensación, reenvío y protección del último Administrador.

**Criterio de salida:** una ejecución controlada puede crear la primera identidad de Administrador sin contraseña temporal y cada operación administrativa está autorizada y auditada.

## Fase 3: panel de administración remoto

1. Adaptar los módulos y rutas actuales bajo `src/app/dashboard/admin/` para que, cuando Supabase esté configurado, consulten el directorio remoto en lugar de SQLite.
2. Crear la vista **Usuarios y accesos** y añadirla al menú solo de Administrador. Mostrará nombre, correo, rol visible, IE, estado y fecha de alta, sin información de credenciales.
3. Incorporar un formulario único de alta. Si se elige Rectoría o Apoyo, exige seleccionar una IE; si se elige Administrador o Abogado, no permite esa selección.
4. Añadir acciones con confirmación: reenviar enlace, desactivar, reactivar y cambio de rol. La interfaz explicará que ninguna acción revela o reemplaza contraseñas.
5. Conservar las páginas actuales de Instituciones y Equipo jurídico, pero encaminarlas hacia el directorio remoto y eliminar mensajes que indiquen cuentas ficticias cuando el runtime sea Supabase.
6. Crear rutas HTTP de servidor para cada acción. Validar entradas, volver a validar el rol actual y responder errores sin filtrar detalles de Auth.
7. Añadir pruebas de componentes y rutas para que un Abogado, Rectoría o Apoyo reciba `403` al intentar administrar cuentas.

**Criterio de salida:** solo un Administrador autenticado puede administrar los cuatro tipos de cuenta aprobados desde LEXCON.

## Fase 4: inicio, recuperación y Mi cuenta

1. Mantener `signInWithPassword` para el ingreso normal, pero eliminar las tarjetas y autocompletado de usuarios ficticios en el modo Supabase de producción.
2. Crear una pantalla pública **Olvidé mi contraseña** que solicite correo y responda siempre con el mismo mensaje. Usará `resetPasswordForEmail` con una URL de retorno permitida.
3. Crear la ruta de confirmación PKCE y la pantalla autenticada **Crear o cambiar contraseña**. Esta verificará la sesión de recuperación antes de usar `updateUser`.
4. Crear **Mi cuenta** dentro del espacio autenticado para cambiar contraseña y solicitar cambio de correo. Exigir confirmación del correo mediante el flujo de Supabase; no actualizar el perfil empresarial hasta recibir la confirmación aplicable.
5. Configurar redirecciones seguras para `https://lexcon.arkaiag.com` y sus rutas de confirmación, recuperación y cuenta. No aceptar redirecciones arbitrarias de parámetros de URL.
6. Probar enlaces expirados, usados por segunda vez, correo inexistente, sesión vencida y cambios de correo cancelados.

**Criterio de salida:** una persona no puede enumerar usuarios, recuperar una cuenta ajena ni cambiar contraseñas sin una sesión de recuperación válida.

## Fase 5: configuración operativa y validación remota

1. En Dokploy, definir las dos variables `NEXT_PUBLIC_SUPABASE_*` tanto en **Build-time Arguments** como en **Environment**. Mantener `LEXCON_SUPABASE_*` solo en **Environment**; definir `LEXCON_APP_URL=https://lexcon.arkaiag.com`.
2. En Supabase Auth, establecer la Site URL y las Redirect URLs de LEXCON.
3. Configurar SMTP transaccional antes de invitar usuarios institucionales. La entrega de prueba puede verificar el flujo inicial, pero el límite predeterminado de Supabase no sirve para operación real.
4. Ejecutar el comando de bootstrap de forma autorizada para `arkaiag.co@gmail.com`, abrir el enlace recibido y verificar el inicio como Administrador.
5. Crear usuarios ficticios de cada tipo; verificar alcance, recuperación, reenvío, cambio de correo, desactivación, invalidación de sesión y conservación de auditoría.
6. Confirmar que `/login` no muestra `demo.invalid`, que no hay consultas SQLite en el camino de autenticación administrada y que ningún secreto aparece en los logs.

## Verificación antes de cada entrega

1. Leer la guía de Next.js aplicable antes de escribir componentes o rutas de Next.
2. Ejecutar `corepack pnpm verify`, `corepack pnpm build`, `node scripts/sync-agent-guides.mjs --check` y `git diff --check`.
3. Ejecutar las pruebas nuevas de acceso y una prueba manual completa del enlace de invitación y recuperación.
4. Actualizar `README.md`, `docs/architecture.md`, `docs/current-state.md` y una decisión numerada si la implementación modifica una integración o decisión técnica duradera.
5. Solicitar autorización expresa antes de preparar, confirmar o subir cambios a GitHub; y antes de alterar recursos remotos.

## Secuencia de entrega

La implementación debe ir en este orden: Fase 1, Fase 2, Fase 4, Fase 3 y Fase 5. La Fase 5 queda bloqueada hasta que el código, las pruebas y la revisión de seguridad estén completados. Telegram se planificará en un documento y entrega independientes después de que este acceso funcione de punta a punta.
