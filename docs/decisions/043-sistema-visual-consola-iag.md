# 043. Sistema visual de consola para LEXCON IAG

- **Fecha:** 2026-10-06
- **Estado:** Aceptada

## Contexto

La interfaz acumuló estilos de etapas anteriores y presentaba un lenguaje visual principalmente documental. La aplicación requiere una identidad tecnológica que ayude a reconocer alertas, tareas y acompañamiento IAG sin confundirlo con una decisión jurídica o institucional.

## Decisión

Se adopta un sistema visual de consola de expediente aplicado desde el `WorkspaceShell` y las reglas compartidas de `ui.css`. Usa una navegación oscura, superficies claras de lectura, señalética cian/menta/coral, tipografía Bahnschrift/Aptos/Palatino y una cápsula de estado del agente.

## Consecuencias

- Las vistas institucionales, jurídicas y administrativas comparten una jerarquía visual consistente.
- El agente se comunica como apoyo operativo activo y no como actor decisorio.
- El CSS de presentación queda centralizado, sin alterar los contratos de datos ni los controles de autorización.


## Recalibración

La implementación visual evoluciona hacia un escritorio jurídico luminoso, tomando como referencia patrones de gestión de contratos, documentos y casos. Se conserva la misma arquitectura de presentación centralizada.


## Profundidad y contraste

El espacio privado usa un fondo de operaciones azul profundo y estados luminosos en los componentes interactivos. Las superficies documentales extensas se preservan claras para lectura jurídica. Las elevaciones 3D se desactivan cuando el sistema solicita reducción de movimiento.


## Contraste por capas

Se separa el ambiente tecnológico oscuro de las superficies operativas luminosas. Los contenedores de expedientes, alertas, directorios y tarjetas usan fondos claros con bordes azulados para sostener la jerarquía y legibilidad.


## Panel administrativo luminoso

Se abandona la estética de consola oscura para las superficies de contenido. La navegación conserva un azul institucional, mientras el área de trabajo adopta una composición luminosa de fondo gris, tarjetas blancas y acentos azul/coral.


## Paleta de gestión pública tecnológica

La paleta usa grafito y cobalto para el agente IAG y la gestión documental; blanco cálido para la lectura; y ámbar/naranja para alertas y prioridades. Se descartan los códigos de color propios de interfaces clínicas.

## Referencia cromática ARKA Litigios

La identidad visual toma como fuente la presentación institucional aportada: azul noche jurídico (`#071D3A`) como base, azul eléctrico para señalética tecnológica, dorado para decisiones y llamados principales, y superficies blancas para lectura documental. Se retiran los verdes y azules pálidos predominantes porque remitían a interfaces sanitarias.

## Terminología y superficies operativas

La consola usa “proceso de contratación” en navegación y listados institucionales. “Expediente” queda limitado a referencias jurídicas o documentales donde sea necesario. Las tarjetas operativas reciben la paleta ARKA con azul jurídico, azul eléctrico y dorado, mientras los formularios y documentos conservan fondos claros para facilitar su lectura.

## Directorio jurídico por Institución Educativa

Las asignaciones jurídicas se presentan agrupadas por Institución Educativa. Cada proceso conserva su asignación de acceso individual y se identifica con consecutivo institucional y tipo contractual derivado únicamente del objeto disponible. Este agrupamiento no crea una asignación implícita a procesos futuros de la IE.

La tarjeta institucional se limita a identificar la IE y la cantidad de procesos asignados. La lista de procesos se presenta después de seleccionarla, en una vista propia que vuelve a validar el alcance de la sesión jurídica.
