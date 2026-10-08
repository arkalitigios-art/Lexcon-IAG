# 031. Acta definitiva y equipo evaluador por expediente

## Contexto

El acta de evaluación debe ser un documento institucional. La IE necesita registrar, sin crear cuentas adicionales, quién integra el comité evaluador y quién ejerce la supervisión de cada expediente. Además, la recepción de las ofertas debe quedar soportada por su respectiva acta.

## Decisión

Cada expediente conserva sus propios evaluadores y un supervisor en `process_evaluation_members`. Rectoría o apoyo institucional puede actualizarlos durante la recepción de ofertas o la evaluación; sus nombres, cargos y líneas de firma se incorporan al Word.

La carga de ofertas exige dos evidencias diferenciadas: una o más ofertas con anexos (`OFFERS_RECEIVED`) y un acta de recibo (`OFFERS_RECEIPT`). El flujo no llega a evaluación si falta alguna de ellas.

El Word se emite primero como acta para revisión, sin mencionar el nombre de la aplicación. El comité puede pedir correcciones, que se incorporan en una nueva versión de revisión, o aprobarla. La aprobación genera la denominación de acta definitiva y la deja descargable desde el mismo expediente para publicación institucional.

## Consecuencias

La aplicación conserva la trazabilidad de la configuración del comité y de cada decisión, pero no sustituye su evaluación ni publica documentos. La aprobación sigue habilitando únicamente la siguiente decisión institucional cuando existe una oferta habilitada.
