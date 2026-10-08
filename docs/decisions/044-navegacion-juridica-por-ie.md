# 044. Navegación jurídica en dos niveles por Institución Educativa

- **Fecha:** 2026-10-06
- **Estado:** Aceptada

## Contexto

Una tarjeta institucional que incluye la lista completa de procesos mezcla dos unidades de información: la IE y sus actuaciones. Esa composición dificulta reconocer primero a la entidad asignada y vuelve la pantalla inicial demasiado densa.

## Decisión

La vista inicial de abogado muestra una tarjeta seleccionable por Institución Educativa. Cada tarjeta solo presenta la identidad de la IE y el total de procesos jurídicamente asignados. Al seleccionarla, una ruta dinámica muestra los procesos autorizados de esa IE con consecutivo, tipo contractual, etapa y estado. Administración Arka aplica la misma jerarquía para el registro global: muestra una IE una sola vez y revela sus procesos dentro de la ficha institucional.

## Consecuencias

- La tarjeta inicial se concentra en información institucional.
- La lista de procesos conserva el detalle operacional en una pantalla específica.
- La ruta de detalle deriva de nuevo las instituciones desde `listProcessesFor(user)`, de modo que no acepta una IE no autorizada por manipulación de URL.
- El registro administrativo reduce duplicación visual sin limitar el permiso global de Administración Arka.
