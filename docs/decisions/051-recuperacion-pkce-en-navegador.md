# 051. Recuperación de contraseña PKCE desde el navegador

- **Fecha:** 2026-10-10
- **Estado:** Aceptada

## Contexto

La aplicación usa `@supabase/ssr`, que configura los enlaces de recuperación con PKCE. Ese flujo requiere un comprobante temporal creado en el mismo navegador que posteriormente abre el correo. Solicitar la recuperación desde un Route Handler del servidor no dejaba ese comprobante disponible para el navegador y el enlace no lograba abrir la sesión necesaria para definir contraseña.

## Decisión

La pantalla pública `/forgot-password` llama a `resetPasswordForEmail` mediante el cliente público de Supabase en el navegador. Construye una URL de retorno de la misma aplicación hacia `/auth/confirm?next=/auth/update-password`. La página de confirmación existente completa la sesión PKCE y dirige a la pantalla de contraseña.

## Consecuencias

- La persona debe solicitar y abrir el correo desde el mismo navegador.
- No se expone una clave de servicio ni se filtra si una cuenta existe.
- Se elimina el endpoint de servidor que podía generar enlaces sin el comprobante PKCE del navegador.
