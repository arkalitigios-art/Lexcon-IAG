# 039. Corrección jurídica contractual y reparación de expedientes

## Contexto

Algunos expedientes existentes llegaron a `EXECUTION` cuando se cargó el RP, sin que la abogada Arka hubiera registrado una aprobación del contrato y del Acta de inicio. Además, la revisión debía permitir dos alternativas: describir correcciones o incorporar una versión Word revisada.

## Decisión

La migración `0013-contractual-legal-review-repair.sql` devuelve a `CONTRACTUAL_REVIEW` únicamente los expedientes pendientes de ejecución que tienen contrato y Acta de inicio, pero no contienen una actuación `CONTRACTUAL_APPROVED` ni un soporte de ejecución. Sus borradores quedan en `PENDING_LEGAL_REVIEW`.

En revisión contractual la abogada puede registrar instrucciones de corrección o cargar una versión DOCX corregida, separadamente para el contrato y el Acta de inicio. Estas versiones privadas se almacenan como evidencia jurídica del expediente y sustituyen la descarga generada para la abogada y, después de la aprobación, para la IE. La aprobación jurídica sigue siendo la única transición que habilita `EXECUTION`.

## Consecuencias

La institución no recibe un contrato o Acta de inicio prematuramente. Las correcciones manuales quedan trazables, se conservan en el expediente y no requieren crear nuevas cuentas ni exponer rutas de almacenamiento.
