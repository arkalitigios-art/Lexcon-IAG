# 038. Revisión jurídica contractual y tipo de contrato

## Contexto

El contrato y el Acta de inicio deben ser revisados por la abogada Arka antes de que Rectoría o apoyo institucional puedan descargarlos. Además, la denominación del documento debe reflejar el tipo de obligación y llevar una numeración contractual, en lugar de un rótulo genérico.

## Decisión

La carga del RP mueve el expediente de `FORMALIZATION` a `CONTRACTUAL_REVIEW` y crea los documentos con estado `PENDING_LEGAL_REVIEW`. En esta fase solamente la abogada asignada puede descargarlos y registrar aprobación o correcciones. La aprobación avanza a `EXECUTION` y habilita la descarga institucional.

El compositor determina si corresponde un contrato de suministro, prestación de servicios o mantenimiento a partir del objeto y la matriz del expediente. Lo titula como `CONTRATO DE ... No. NNN DE AAAA`, usando el consecutivo propio de la IE. El contrato incorpora los datos disponibles de oferta, CDP, RP, ítems y supervisor registrado junto con el equipo evaluador.

## Consecuencias

La IE no puede firmar ni publicar una versión no revisada jurídicamente. El expediente conserva una etapa y una decisión trazables entre el RP y la ejecución, y el contrato deja de presentarse como un “documento contractual” genérico.
