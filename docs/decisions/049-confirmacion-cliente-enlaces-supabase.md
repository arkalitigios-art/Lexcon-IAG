# 049. Confirmación de enlaces Supabase en el navegador

- **Fecha:** 2026-10-10
- **Estado:** Aceptada

## Contexto

Los enlaces de invitación y recuperación de Supabase usan el flujo implícito configurado para LEXCON. Sus tokens temporales están en el fragmento de URL, el cual no llega al servidor por diseño del navegador.

## Decisión

La ruta `/auth/confirm` será una página cliente. Usará únicamente la URL y clave publicable de Supabase para procesar el enlace en el navegador, verificará que exista una sesión y redirigirá solo a una ruta interna validada. Limpiará el fragmento antes de continuar.

## Consecuencias

- Los tokens no entran en registros de rutas de servidor ni se exponen a código administrativo.
- Los enlaces inválidos o vencidos ofrecen recuperación sin filtrar datos de cuentas.
- La ruta de actualización de contraseña continúa usando la sesión SSR ya establecida y la clave de servicio no llega al navegador.
