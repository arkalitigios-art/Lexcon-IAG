# 034. Selección expresa del comité y documentos posteriores

## Contexto

El Acta de evaluación debe documentar el análisis de las ofertas, pero no puede sustituir la decisión del comité sobre el proponente seleccionado. Esa decisión requiere una actuación propia, firmas y una incorporación posterior al expediente antes de continuar a aceptación de oferta, RP y documentos de ejecución.

## Decisión

La aprobación de la evaluación exige que Rectoría, en representación de la decisión del comité registrada en el expediente, identifique expresamente una oferta habilitada y su motivación. Se conserva en `process_selection_decisions` y se produce un Acta de selección de oferente descargable. El acta firmada se carga como `SELECTION_ACT_SIGNED`; entonces queda disponible la Comunicación de aceptación de oferta.

La carga del Registro Presupuestal se clasifica como `BUDGET_REGISTRATION`. Solo después se habilitan el documento contractual y el Acta de inicio. Todos los Word se generan desde la evidencia y las decisiones almacenadas, sin nombrar la aplicación ni sustituir firmas institucionales.

## Consecuencias

El proceso conserva una separación auditable entre evaluación, selección, aceptación, RP y ejecución. La oferta con menor valor habilitada queda como evidencia de análisis, pero la aplicación no la convierte por sí sola en proponente seleccionado.
