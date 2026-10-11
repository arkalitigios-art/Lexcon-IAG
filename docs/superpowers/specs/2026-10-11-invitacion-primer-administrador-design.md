# Diseño: invitación del primer administrador

## Propósito

Permitir que la primera persona administradora de LEXCON reciba una invitación segura y defina su contraseña inicial. Esta operación no es una recuperación de contraseña ni un registro público.

## Problema que resuelve

La ruta pública de activación usaba el flujo de recuperación de Supabase. Ese flujo solo funciona cuando la cuenta ya existe y tiene una contraseña que se desea reemplazar. Antes de crear el primer administrador no existe tal cuenta, por lo que Supabase rechaza la solicitud y no puede enviar un enlace útil.

## Flujo aprobado

1. La persona responsable abre la terminal del contenedor de Dokploy y ejecuta una sola vez `node scripts/bootstrap-supabase-admin.mjs --execute`, aportando temporalmente el nombre y correo mediante variables de entorno.
2. El comando usa exclusivamente `LEXCON_SUPABASE_URL` y `LEXCON_SUPABASE_SERVICE_ROLE_KEY`, verifica que no exista un Administrador activo, crea la invitación de Supabase y registra el perfil y rol `ADMINISTRADOR_ARKA`.
3. Supabase envía la invitación al correo indicado. El enlace abre `/auth/confirm` y luego la pantalla para definir y confirmar la contraseña.
4. La aplicación pública inicia en `/login`. `/activate-account` solo reenvía un enlace de creación de contraseña para una cuenta que ya recibió invitación; no crea administradores ni auto-registra correos.
5. Después de crear el primer administrador, esa persona invita a abogados, rectores y funcionarios de apoyo desde el panel administrativo.
6. `/forgot-password` conserva únicamente la recuperación de una contraseña que ya existía.

## Seguridad y errores

- La clave de servicio no se envía al navegador.
- La autorización de inicialización depende de que no exista un administrador activo y se verifica en el comando de servidor antes de invitar.
- La respuesta pública no expone claves, identificadores de Supabase ni datos de otras personas.
- Si una solicitud falla, el comando informa una causa segura sin imprimir claves, enlaces, tokens ni respuestas completas del proveedor.
- La invitación conserva la redirección permitida hacia la pantalla de contraseña inicial.

## Verificación

- Pruebas unitarias para el cliente de solicitud y la ruta de inicialización.
- Prueba de que el cliente envía nombre y correo solo a la ruta propia de LEXCON, no a la API administrativa de Supabase.
- Typecheck, suite de pruebas, compilación y sincronización de guías.
