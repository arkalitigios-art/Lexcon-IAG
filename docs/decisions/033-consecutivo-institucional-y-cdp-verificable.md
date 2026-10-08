# 033. Consecutivo institucional y CDP verificable

## Contexto

Los documentos precontractuales mostraban una variable de consecutivo pendiente y podían imprimir `CDP No. CDP` cuando el texto del soporte repetía la etiqueta sin aportar un identificador. Esto impedía que el encabezado institucional fuera utilizable y creaba ambigüedad documental.

## Decisión

Cada expediente recibe al abrirse un valor `institution_sequence`, calculado dentro de la transacción de creación y único para su Institución Educativa. El Word lo presenta como `AAAA-####`, usando el año de apertura y el consecutivo propio de la IE. Se incluye en los encabezados, tablas de identificación y anexos del estudio previo y de la invitación pública.

La lectura del CDP descarta etiquetas aisladas como `CDP`, `No.` o `Número`. Si el contenido no ofrece un valor válido, reconoce el tramo numérico de nombres de archivo como `CDP-2026-0041`; si tampoco existe, conserva la advertencia de dato pendiente.

## Consecuencias

Las series no se mezclan entre Instituciones Educativas y los expedientes históricos quedan numerados durante la migración según su orden de creación. Los documentos ya generados se corrigen al descargarse nuevamente, sin alterar el soporte CDP original.
