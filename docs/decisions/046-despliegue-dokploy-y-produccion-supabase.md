# 046. Compose en Dokploy con Supabase como persistencia operativa

- **Fecha:** 2026-10-08
- **Estado:** Aceptada

## Contexto

LEXCON IAG ejecuta una aplicación web y un worker separado. La implementación actual conserva estado en SQLite y almacenamiento local, mientras que el proyecto Supabase de LEXCON IAG ya contiene el esquema multiinstitucional, RLS y Storage privado preparados para la operación real.

La aplicación tratará expedientes y documentos institucionales. Un respaldo dentro del mismo VPS no ofrece una garantía de recuperación adecuada para esos datos. La creación de tablas y políticas en Supabase no sustituye la adaptación de la aplicación que todavía consulta SQLite en tiempo de ejecución.

## Decisión

Se usa Docker Compose en Dokploy para ejecutar los servicios `web` y `worker`. Ambos se conectan al proyecto Supabase externo de LEXCON IAG; no se despliega SQLite ni una base de datos dentro del VPS. El dominio temporal de Dokploy solo se utilizará para validar la integración con usuarios y datos ficticios.

La producción real se habilitará después de adaptar la aplicación para usar Supabase Auth, PostgreSQL y Storage privado como fuentes definitivas. Los respaldos de PostgreSQL y Storage se administran y verifican por separado; no se considera suficiente una copia local del VPS.

Para la identidad de una sesión autenticada, se expone una función `public.obtener_identidad_actual()` con privilegio controlado. Esta lee internamente el perfil y la asignación activa de `auth.uid()` y devuelve una sola identidad; no se otorga `SELECT` directo a los usuarios autenticados sobre tablas de perfiles, roles o asignaciones.

## Consecuencias

- El repositorio debe incorporar configuración de contenedor y Compose para los dos servicios.
- La prueba técnica usa únicamente cuentas y datos ficticios; no autoriza documentos ni expedientes reales.
- La migración funcional a Supabase incluye persistencia, autenticación, archivos y trabajo asíncrono; las credenciales por sí solas no sustituyen SQLite.
- El lanzamiento real requiere dominio propio HTTPS, secretos en Dokploy, restauración probada y continuidad adecuada de Supabase.
