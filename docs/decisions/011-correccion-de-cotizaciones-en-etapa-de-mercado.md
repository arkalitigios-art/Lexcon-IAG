# 011. Corrección de cotizaciones antes de la revisión jurídica

## Decisión

Rectoría y el funcionario autorizado pueden agregar o eliminar una cotización solo mientras el expediente esté en la etapa de mercado. También pueden retirar la última cotización para reemplazar todas las cargadas por error. La eliminación borra el archivo privado y sus registros derivados de lectura, porque corresponde a una carga equivocada que la IE pidió suprimir.

## Consecuencias

Toda adición o eliminación crea un evento de auditoría con el actor, el expediente, la fecha y el tipo de cambio, sin conservar el contenido ni el nombre del archivo eliminado. Cada cambio vuelve a ejecutar el análisis de mercado, actualiza sus ítems, comparaciones y borrador, y puede levantar o crear el bloqueo de datos según las cotizaciones restantes. Si no queda ninguna, el borrador queda sustituido y el expediente espera las nuevas cotizaciones. Después de la aprobación del estudio de mercado ya no se permiten cambios por esta ruta.
