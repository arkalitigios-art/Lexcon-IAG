# 014. Borrador Word privado del estudio de mercado

## Contexto

Una matriz comparativa visible en la aplicación no reemplaza un documento de estudio de mercado. El abogado requiere descargar una versión legible, con estructura documental y con los datos propios del expediente, para efectuar su revisión jurídica.

## Decisión

LEXCON incorpora `docx` para generar en memoria un archivo DOCX desde el expediente autorizado. El documento contiene identificación, objeto, clasificación UNSPSC, análisis de oferta y demanda, metodología, matriz comparativa, presupuesto estimado, conclusión y alcance de la revisión jurídica.

LEXCON redacta automáticamente una base para el objeto, clasificación preliminar, análisis de oferta y demanda y condiciones económicas a partir de los ítems comparables, cantidades y cotizaciones del expediente. La Institución Educativa puede complementar o precisar esos datos cuando dispone de información institucional que no aparece en la evidencia; nunca son un requisito para que exista un borrador. Los complementos se guardan por expediente y se auditan. El Route Handler de descarga se ejecuta en Node, exige sesión, exige el rol de abogado Arka y reutiliza la comprobación de asignación del expediente.

## Consecuencias

El documento descargado no se guarda todavía como una versión documental independiente; se produce a partir de la evidencia y datos vigentes del expediente. Por ello, una actualización anterior a la aprobación jurídica aparece en la siguiente descarga. Cuando LEXCON no puede identificar una clasificación específica o una condición económica desde la evidencia, lo expresa como una observación del borrador en lugar de presentar un campo vacío como obligación de la IE.
