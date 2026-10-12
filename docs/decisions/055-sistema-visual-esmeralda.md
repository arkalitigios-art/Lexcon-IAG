# 055. Sistema visual Esmeralda

- **Fecha:** 2026-10-12
- **Estado:** Aceptada. Reemplaza la paleta de la decisión 043.

## Contexto

La interfaz acumulaba capas de temas y reglas `!important` en conflicto, y no se adaptaba de forma consistente a tablet ni a celular.

## Decisión

- La paleta Esmeralda vive en `src/app/styles/tokens.css` y sus pares de color se verifican con contraste WCAG AA.
- La fuente Outfit se integra con `next/font/google`: se descarga en el build y se sirve desde el dominio de la aplicación.
- El CSS heredado se conserva dentro de `@layer legacy`; los estilos nuevos se aplican desde `src/app/styles/` sin aumentar especificidad.
- Bajo 900 px el menú es un panel desplegable controlado por `WorkspaceFrame`; el foco, Escape y el velo de fondo se gestionan explícitamente.
- La bandeja administrativa calcula indicadores desde `listProcessesFor`, compatible con SQLite y Supabase, mediante funciones puras y componentes de servidor.
- Los textos visibles usan la marca Lexcon. Los identificadores de roles y credenciales ficticias no cambian.

## Consecuencias

El build requiere conectividad para descargar la fuente si no existe caché. Alertas, Auditoría y Accesos siguen usando `getAdminControlCenter()` y requieren una migración separada para leer Supabase.
