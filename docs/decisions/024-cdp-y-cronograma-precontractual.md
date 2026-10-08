# 024. CDP verificable y cronograma mínimo en documentos precontractuales

Fecha: 2026-10-01

## Contexto

Los documentos generados después de cargar el CDP necesitaban presentar ese número en el estudio previo y la invitación pública. También requerían un cronograma útil de mínima cuantía, sin que el sistema inventara fechas ni datos presupuestales.

## Decisión

La generación bajo demanda lee el CDP privado PDF o DOCX y extrae únicamente un número que esté rotulado de forma explícita. Si no logra identificarlo, mantiene la referencia al archivo y declara que el número está pendiente de validación. Ambos documentos usan el mismo contexto.

El cronograma se calcula desde el siguiente día hábil colombiano a la generación. Considera fines de semana y festivos nacionales, y establece los mínimos para publicación, observaciones y aviso Mipyme, ofertas y traslado del informe de evaluación conforme a mínima cuantía. El texto informa que la IE debe ampliar el plazo cuando su reglamento o condiciones institucionales así lo exijan.

## Consecuencias

La abogada recibe documentos coherentes entre sí, con trazabilidad al soporte presupuestal y fechas iniciales reproducibles. La aplicación no crea un número de CDP, ni acorta los plazos mínimos, ni decide la publicación o aceptación institucional.
