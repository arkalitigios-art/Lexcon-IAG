# 055. Sistema visual Esmeralda

- **Fecha:** 2026-10-12
- **Estado:** Aceptada. Reemplaza la paleta de la decisión 043.

## Contexto

La interfaz acumulaba capas de temas y reglas `!important` en conflicto, y no se adaptaba de forma consistente a tablet ni a celular.

## Decisión

- La paleta Esmeralda vive en `src/app/styles/tokens.css` y sus pares de color se verifican con contraste WCAG AA (`tests/unit/theme-contrast.test.ts`). El acento `--accent` es `#0a7365`: un tono más oscuro que el del prototipo para que el texto de acento cumpla 4,5:1 también sobre el extremo inferior del degradado de la página.
- La fuente Outfit se integra con `next/font/google`: se descarga en el build y se sirve desde el dominio de la aplicación.
- El CSS heredado se conserva dentro de `@layer legacy`; los estilos nuevos se aplican desde `src/app/styles/` sin aumentar especificidad. El orden de capas es `reset < legacy <` estilos sin capa: los reinicios de elementos de `base.css` viven en `@layer reset`, debajo de la capa heredada, para no borrar márgenes ni colores de componentes que aún no se rediseñan.
- `scripts/prune-legacy-css.mjs` elimina del CSS heredado las declaraciones `!important` de aspecto y los componentes ya reescritos. Se aplicó a `ui.css` y `globals.css`: 107 `!important` pasaron a 5. Esos 5 se conservan a propósito (movimiento reducido y `.evaluation-member-row label`); cualquier `!important` nuevo en `src/app/styles/` requiere justificación.
- Bajo 900 px el menú es un panel desplegable controlado por `WorkspaceFrame`; el foco, Escape y el velo de fondo se gestionan explícitamente.
- La bandeja administrativa calcula indicadores desde `listProcessesFor`, compatible con SQLite y Supabase, mediante funciones puras y componentes de servidor.
- Los textos visibles usan la marca Lexcon. Los identificadores de roles y credenciales ficticias no cambian.
- Alcance: las tres fases están terminadas. La Fase 1 cubrió marco, menú, acceso y bandeja del Administrador; la Fase 2, las pantallas de gestión (Mi cuenta, Usuarios y accesos); la Fase 3, directorios, fichas, detalle de proceso, formularios largos de cada etapa, cotizaciones, comité evaluador, documentos generados por IAG y el manual de contratación. Todas las pantallas usan Esmeralda y la piel de directorios, detalle y formularios vive en `src/app/styles/surfaces.css`.
- Excepción deliberada: el documento del estudio de mercado (`.market-study-document`, su encabezado, su firma y el botón de impresión) es una hoja de lectura jurídica y conserva su fondo claro y su tipografía; solo se vistieron sus envolturas y formularios, y se ajustó su espaciado de lectura. Las vistas previas de documentos generados usan una tipografía de lectura con serifa (`--font-reading`).
- Las etiquetas y leyendas de formulario usan la tipografía y el tamaño de la interfaz en minúsculas y mayúsculas normales (antes iban en mayúsculas con Bahnschrift). El estado de las opciones de revisión se toma de `:has(input:checked)` y no de la clase `selected`, que en la declaración de publicación es fija.
- El menú lateral hace visible la opción activa desplazando solo su contenedor; `scrollIntoView` movía también la ventana.
- Adaptación a portátil (2026-10-13): el margen vertical del marco (`--frame-gap`) se aplica como relleno del `<body>` (con `min-height: 100svh` en el `<body>` un margen inferior no colapsa y generaba una segunda barra de desplazamiento) y baja a 12 px con 800 px de alto o menos. El menú lateral es `sticky` con el alto del marco; solo `.nav-scroll` se desplaza y "Mi cuenta" (`NavigationItem.pinned`) y el pie (`.sidebar-footer`) quedan fijos. La densidad del menú se controla con variables CSS por alto de ventana (1000/900/800/700 px). Decisión de accesibilidad: la altura de fila es 44 px con puntero táctil (`pointer: coarse`) y baja a 40 px (alto <= 800) y 38 px (alto <= 700) solo con ratón (`pointer: fine`), por encima del mínimo de 24 px de WCAG 2.2 AA; es lo que permite que el menú del Administrador (el más largo) quepa sin desplazarse en un portátil de 650 px de alto. La tarjeta decorativa del agente IAG se oculta por debajo de 1000 px de alto con menús largos y por debajo de 700 px siempre.
- La ruta `/dashboard/committee` no tiene interfaz (redirige al inicio de sesión): no hay pantalla del comité que vestir.

## Consecuencias

El build requiere conectividad para descargar la fuente si no existe caché. La lectura de Alertas y Auditoría desde Supabase quedó resuelta después en la decisión 056; Accesos se unificó en Usuarios y accesos.
