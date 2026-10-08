# 028. Evaluación integrada en el expediente institucional

## Contexto

Un espacio y credenciales separados para cada comité de evaluación incrementaban la carga operativa de las Instituciones Educativas y separaban el acta de las ofertas y soportes que debe examinar.

## Decisión

La evaluación se gestiona dentro de la ficha del expediente de la IE. Rectoría representa el registro institucional de la decisión del comité: descarga el Acta de evaluación de ofertas, revisa las fuentes privadas del expediente y registra una de dos actuaciones: aprobación o solicitud de correcciones a LEXCON IAG.

Un Route Handler Node genera el Word bajo demanda desde las ofertas `OFFERS_RECEIVED` y las observaciones trazadas. El acta identifica archivos y proponentes, los valores, plazos y vigencias que pueden extraerse, documentos declarados, controles pendientes, observaciones y espacios para firmas. La generación no habilita automáticamente a ningún proponente ni decide la selección.

## Consecuencias

La demostración deja de ofrecer una credencial de comité y la ruta histórica redirige al acceso. Las correcciones mantienen la fase de evaluación, quedan en la trazabilidad y aparecen en la siguiente descarga del acta. Solo la aprobación mueve el expediente a la decisión de selección.
