# Gestión de accesos de producción con Supabase

- **Fecha:** 2026-10-10
- **Estado:** Aprobado para planificar
- **Alcance:** acceso real, administración de usuarios y recuperación de contraseña.
- **Fuera de alcance:** alertas por Telegram; se desarrollarán como una fase posterior.

## Problema

El despliegue de `lexcon.arkaiag.com` mostró cuentas SQLite ficticias porque la configuración pública de Supabase no quedó incorporada durante la construcción y ejecución de la imagen. Esas cuentas son solo de demostración local y no pueden constituir el acceso de producción.

Aunque el esquema de Supabase ya contiene perfiles, roles y asignaciones por Institución Educativa, la interfaz de administración actual continúa escribiendo en SQLite. No existe aún un mecanismo de activación, restablecimiento de contraseña ni administración remota de cuentas.

## Objetivo

LEXCON IAG utilizará Supabase Auth como única identidad para producción. Un **Administrador** podrá gestionar Administradores, Abogados, Rectoría y Apoyo de cada Institución Educativa sin conocer las contraseñas. Cada usuario recibirá un enlace de correo para activar o recuperar su acceso.

Los integrantes del comité evaluador permanecen como responsables informativos del expediente y no tendrán cuenta ni acceso a LEXCON.

## Decisiones de experiencia

### Primera cuenta

La primera cuenta será `arkaiag.co@gmail.com`, con el rol visible **Administrador** y el código interno existente `ADMINISTRADOR_ARKA`. Se creará por medio de un comando de inicialización de una sola ejecución, protegido por las variables privadas de Supabase. El comando enviará una invitación al correo para que la persona defina su propia contraseña; no se genera ni se transmite una contraseña temporal.

No habrá una pantalla pública para registrar el primer Administrador. Evita que una tercera persona se apropie de la cuenta inicial.

### Administración de usuarios

La nueva sección protegida **Usuarios y accesos** estará disponible exclusivamente para Administradores. Permitirá:

- crear Administradores y Abogados;
- crear Rectoría o Apoyo seleccionando obligatoriamente una Institución Educativa existente;
- consultar estado, rol, institución y fecha de alta;
- reenviar el enlace de activación o restablecimiento;
- desactivar y reactivar cuentas sin borrar sus actuaciones históricas;
- cambiar el correo de una cuenta mediante un flujo de confirmación de Supabase.

No permitirá crear cuentas de comité evaluador ni asignar una cuenta institucional sin una IE.

### Autogestión de acceso

La pantalla de ingreso incluirá **Olvidé mi contraseña**. Por seguridad siempre mostrará una respuesta genérica: no revela si un correo existe. El enlace recibido abrirá una página autenticada para elegir una nueva contraseña.

Cada persona tendrá una sección **Mi cuenta** para solicitar el cambio de su correo y cambiar su contraseña. El cambio de correo exige la confirmación que envía Supabase a la dirección correspondiente.

## Arquitectura

```text
Administrador autenticado
        |
        v
Panel Usuarios y accesos -- ruta de servidor autorizada --> Supabase Auth Admin
        |                                                   |
        |                                                   +--> invitación/restablecimiento por correo
        v
RPC restringida a service_role
        |
        +--> perfiles_usuario
        +--> asignaciones_roles_usuario
        +--> eventos_auditoria
```

- El cliente web nunca recibe `LEXCON_SUPABASE_SERVICE_ROLE_KEY`.
- Cada ruta administrativa resuelve la identidad con la sesión SSR y comprueba el rol contra `obtener_identidad_actual()`. No toma decisiones de autorización desde `user_metadata`.
- La creación de perfil, rol, asignación a IE y auditoría ocurrirá en una función SQL transaccional. La función se revocará para `PUBLIC`, `anon` y `authenticated`; solo el servidor, mediante `service_role`, podrá invocarla.
- Supabase Auth y PostgreSQL son servicios distintos: si la asignación interna falla después de crear o invitar una identidad, el servidor cancelará la cuenta nueva o dejará un registro administrativo para reparación, evitando una cuenta con acceso ambiguo.
- Desactivar una cuenta actualizará el perfil y la asignación de rol; también se invalidarán sus sesiones de Supabase. La evidencia y auditoría del expediente se conservan.

## Correo y URLs seguras

Supabase deberá tener como **Site URL** `https://lexcon.arkaiag.com` y permitir las rutas de confirmación, recuperación y cambio de correo de ese mismo dominio. Dokploy tendrá configuradas tanto en construcción como en ejecución:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
LEXCON_SUPABASE_URL
LEXCON_SUPABASE_SERVICE_ROLE_KEY
LEXCON_APP_URL=https://lexcon.arkaiag.com
```

Las dos variables `NEXT_PUBLIC_` son necesarias durante la construcción para que la pantalla de inicio use Supabase, y se repiten en ejecución para las rutas SSR. Las privadas solo existen en el entorno de ejecución.

El servicio estándar de correo de Supabase es útil para una prueba limitada, pero no para operar cuentas institucionales. Antes de invitar usuarios reales se configurará SMTP transaccional y se probará la entrega a `arkaiag.co@gmail.com`.

Los enlaces actuales de Supabase usan flujo implícito: los tokens temporales llegan en el fragmento de navegador. La ruta `/auth/confirm` se ejecutará en el cliente, establecerá la sesión con el cliente público de Supabase y eliminará el fragmento antes de llevar a la persona a definir su contraseña. No enviará esos tokens a una ruta de servidor.

## Manejo de errores y seguridad

- Un correo duplicado, una IE inexistente, un rol no permitido o una invitación fallida muestran mensajes claros al Administrador y no crean asignaciones incompletas.
- La recuperación de contraseña responde de forma uniforme para cuentas existentes o inexistentes, para no revelar el directorio de usuarios.
- Los enlaces tienen vencimiento de Supabase, un solo uso y no se almacenan en LEXCON.
- Las pantallas dejan de mostrar credenciales ficticias cuando Supabase está configurado; en producción no habrá una vía de respaldo a SQLite.
- Se registran altas, reenvíos, cambios de rol, activaciones, desactivaciones y solicitudes administrativas de recuperación en la auditoría.

## Validación

1. Verificar que Dokploy construye y ejecuta con las cuatro variables de Supabase y que el inicio ya no ofrece cuentas locales.
2. Ejecutar el comando de inicialización para `arkaiag.co@gmail.com`; comprobar la llegada del enlace, creación de contraseña e ingreso como Administrador.
3. Crear un Abogado y una cuenta de Rectoría vinculada a una IE; confirmar que reciben enlaces, tienen solo su alcance y no pueden acceder a datos de otra IE.
4. Comprobar reenvío y recuperación de contraseña sin revelar si un correo existe.
5. Desactivar una cuenta, confirmar que su sesión deja de ser válida y que su auditoría permanece visible al Administrador.
6. Ejecutar pruebas de TypeScript, pruebas automatizadas, compilación de producción y comprobación de guías antes de desplegar.
