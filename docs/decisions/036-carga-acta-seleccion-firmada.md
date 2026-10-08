# 036. Carga institucional del Acta de selección firmada

## Contexto

La generación del Acta de selección abre la fase de decisión, pero la carga de su versión firmada debe estar disponible para las personas institucionales que administran el expediente. Mostrar la descarga sin la actuación de carga impedía continuar a la comunicación de aceptación y al RP.

## Decisión

En la fase `DECISION`, Rectoría y apoyo institucional pueden ejecutar `SELECTION_RECORDED`. La actuación exige al menos un archivo y lo conserva con el tipo documental `SELECTION_ACT_SIGNED`. Solo después cambia la decisión a `SIGNED_UPLOADED` y permite avanzar a `FORMALIZATION`.

## Consecuencias

La ficha muestra el botón **Cargar Acta de selección firmada** a ambos roles institucionales autorizados. La comunicación de aceptación, el RP y los documentos posteriores siguen bloqueados mientras el expediente no contenga el acta firmada.
