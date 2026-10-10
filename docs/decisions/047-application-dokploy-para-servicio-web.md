# 047. Application de Dokploy para el servicio web temporal

- **Fecha:** 2026-10-10
- **Estado:** Aceptada
- **Sustituye:** [046. Compose en Dokploy con Supabase como persistencia operativa](046-despliegue-dokploy-y-produccion-supabase.md)

## Contexto

El despliegue temporal actual contiene una sola aplicación web Next.js. Supabase externo proporciona Auth, PostgreSQL y Storage privado; el worker sigue dependiendo de SQLite y no se ejecuta en el VPS. Por tanto, no hay varios contenedores que coordinar en esta etapa.

Una regla de Git llamada `storage/` ignoraba tanto los archivos privados locales de la raíz como el código fuente `src/platform/storage/`. Esto impedía que Dokploy recibiera los adaptadores de almacenamiento y el build fallaba al resolver sus importaciones.

## Decisión

Dokploy desplegará la aplicación mediante un servicio **Application** con el `Dockerfile` del repositorio, contexto `.` y puerto interno `3000`. Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` se definen como argumentos de construcción y también como variables de ejecución; las variables privadas permanecen solo en el entorno de ejecución de Dokploy.

La regla de exclusión se ancla como `/storage/`. Así se conservan fuera de Git los archivos privados generados localmente, mientras que `src/platform/storage/` se versiona y se incorpora a cada imagen de despliegue.

## Consecuencias

- El despliegue temporal requiere un único servicio Application y no un Compose.
- `lexcon.arkaiag.com` se enruta al puerto interno `3000` con HTTPS administrado por Dokploy.
- El worker, SQLite y cualquier dato institucional real continúan fuera de este despliegue hasta completar su migración y las pruebas requeridas.
