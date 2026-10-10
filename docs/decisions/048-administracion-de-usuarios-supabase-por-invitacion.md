# 048. Administración de usuarios Supabase por invitación

- **Fecha:** 2026-10-10
- **Estado:** Aceptada

## Contexto

Las credenciales de demostración locales no son aptas para una aplicación publicada. LEXCON necesita que una persona administradora cree cuentas reales sin conocer ni almacenar las contraseñas de los demás usuarios. Los integrantes del comité evaluador se registran como datos de un proceso, pero no ingresan a la aplicación.

## Decisión

La identidad y contraseña se administran mediante Supabase Auth. El servidor crea una invitación por correo para los roles que pueden entrar: Administrador, Abogado, Rector y Apoyo IE. El enlace lleva a una ruta de confirmación controlada por LEXCON, donde la persona define su propia contraseña.

El servidor, usando exclusivamente la clave `service_role`, vincula la identidad de Auth con `perfiles_usuario` y una asignación activa. Las funciones SQL restringidas registran o activan/desactivan el acceso y escriben auditoría; no tienen permisos para `anon` ni `authenticated`. La desactivación prohíbe sesiones nuevas y nunca puede dejar a la plataforma sin un Administrador activo.

## Consecuencias

- La pantalla administrativa puede invitar, reenviar el enlace y activar o desactivar cuentas, sin exponer contraseñas.
- Rector y Apoyo requieren una IE activa; la restricción existente preserva un único acceso activo por cada rol institucional e IE.
- La primera cuenta se crea explícitamente con el script de bootstrap y solo después de configurar SMTP, URL pública y secretos en el entorno operativo.
- En producción, si faltan las credenciales públicas de Supabase, LEXCON no muestra ni acepta credenciales ficticias locales.
