# Confirmación segura de enlaces de Supabase

- **Fecha:** 2026-10-10
- **Estado:** Aprobado para implementación
- **Alcance:** activar enlaces de invitación y recuperación recibidos por correo en la aplicación publicada.

## Problema

Supabase usa el flujo implícito para los enlaces de correo activos: entrega los tokens temporales después de `#` en la URL. El navegador no envía ese fragmento al servidor. La ruta de confirmación de LEXCON era un Route Handler de servidor, por lo que no podía establecer la sesión y el enlace no llegaba a la pantalla de contraseña.

## Diseño aprobado

`/forgot-password` solicitará la recuperación desde el cliente público de Supabase en el navegador que abrirá el correo. Así conserva el comprobante PKCE necesario para intercambiar el código de retorno. `/auth/confirm` será una página cliente mínima: creará el cliente público de Supabase, permitirá que este complete la sesión de retorno y redirigirá solo a una ruta interna segura. Antes de navegar eliminará los datos temporales de la barra de direcciones.

Si Supabase informa un error, si no produce una sesión o si el enlace ya venció, se mostrará un mensaje claro y un enlace a `/forgot-password` para solicitar una nueva recuperación. La ruta histórica `/auth/forgot-password` redirige a la misma pantalla. Nunca se muestra el token ni se reenvía al servidor.

## Validación

1. Prueba unitaria de la validación del destino interno para impedir redirecciones externas.
2. Compilación de producción y pruebas del proyecto.
3. Tras desplegar, enviar un enlace nuevo al Administrador y comprobar que abre `/auth/update-password` en `lexcon.arkaiag.com`.
