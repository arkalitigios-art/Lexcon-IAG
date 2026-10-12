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

- Mi cuenta limita a 5 contraseñas actuales incorrectas por persona cada 15 minutos (contador en memoria del proceso; durante el bloqueo se rechazan todas sus acciones). `supabase/config.toml` conserva `double_confirm_changes = true` solo para el desarrollo LOCAL; el proyecto alojado debe tener "Secure email change" desactivado.
- El modo de demostración local (SQLite) conserva a propósito su propio mínimo de 12 caracteres para las contraseñas con hash local (`src/platform/auth/password.ts`) y para las contraseñas que un administrador define a los abogados en modo local. La política de 8 caracteres rige los flujos web con Supabase.
- La longitud máxima de contraseña es de 128 caracteres en la aplicación. Supabase Auth puede imponer su propio límite (se basa en bcrypt y algunas versiones rechazan contraseñas de más de 72 bytes), por lo que debe confirmarse en el proyecto real durante la verificación del dominio.
- La creación del primer Administrador depende de la guarda SQL de `registrar_acceso_usuario` y de la comprobación repetida en el servicio. La guarda SQL no está serializada: dos personas distintas que envíen al mismo instante, ambas con un código válido, podrían crear dos administradores, lo cual el diseño permite.
- La corrección de correo que hace el Administrador registra un evento `EMAIL_CORRECTED` con las direcciones enmascaradas y revierte el cambio de correo si la auditoría no puede escribirse.
