# 010. Extracción local y comparabilidad de cotizaciones

## Decisión

El análisis de cotizaciones se ejecuta localmente a partir de los archivos privados conservados por LEXCON IAG. Los PDF con texto seleccionable se leen mediante `pdf-parse` y los DOCX mediante `mammoth`. Cada resultado queda asociado a la versión documental en `document_extractions` junto con su estado e incidencias.

El parser solo acepta campos que puede identificar de forma determinista: descripción, cantidad y valor unitario o total. Los valores se convierten a centavos para preservar el cálculo exacto. Dos registros son comparables solamente si tienen la misma descripción normalizada y cantidad, y proceden de cotizaciones distintas. La salida conserva valores fuente y rango mínimo/máximo observado; no calcula promedios, no selecciona proveedores y no formula una recomendación jurídica.

## Consecuencias

Una imagen, un PDF escaneado, un DOCX sin texto o una cotización sin campos verificables queda preservada como evidencia, pero bloquea únicamente el estudio de mercado y alerta a la IE. La extracción no necesita servicios externos ni expone el contenido de los soportes. LEXCON presenta la matriz, comparabilidad y cálculos resultantes como versión de trabajo; el abogado decide aprobarla u observarla, sin recibir la tarea de aplicar el manual de contratación de la IE.
