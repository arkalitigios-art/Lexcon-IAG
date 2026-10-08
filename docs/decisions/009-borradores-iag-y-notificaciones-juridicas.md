# 009. Borradores IAG activados por evidencia institucional

## Contexto

La IE aporta cotizaciones y CDP, pero el expediente necesitaba crear los borradores de trabajo antes de que el abogado pudiera hacer una revisión jurídica significativa.

## Decisión

LEXCON IAG genera automáticamente un borrador de estudio de mercado cuando se abre un expediente con reglamento aplicable. La extracción y comparabilidad reproducible de las cotizaciones se precisan en la decisión [010](010-extraccion-local-y-comparabilidad-de-cotizaciones.md). Al cargarse el CDP, genera el borrador de estudio previo o de conveniencia y el de invitación pública. Cada salida se almacena como `generated_drafts`, conserva su estado de revisión y se relaciona con el expediente. Si existe abogado asignado, recibe una alerta interna; si se asigna posteriormente, la alerta se crea en ese momento.

## Consecuencias

La automatización organiza la evidencia, identifica valores explícitos y prepara borradores, pero no recomienda proveedor, publica, firma ni selecciona. El abogado debe revisar y aprobar la salida antes de avanzar la fase correspondiente.
