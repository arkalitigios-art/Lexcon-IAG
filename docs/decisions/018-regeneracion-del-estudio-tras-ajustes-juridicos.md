# 018. Regeneración del estudio tras ajustes jurídicos

- Estado: aceptada
- Fecha: 2026-09-30

## Contexto

El abogado necesita registrar ajustes sobre el estudio de mercado sin perder la trazabilidad de su decisión ni dejar el expediente con una versión aprobada cuando vuelve a revisión.

## Decisión

Una solicitud de ajustes conserva la instrucción y la actuación histórica, mantiene el expediente en la fase de mercado y desencadena nuevamente el análisis de las cotizaciones vigentes. El resultado deja el estudio en `PENDING_LEGAL_REVIEW`, disponible para una nueva decisión jurídica. Cuando los ajustes requieren nuevos valores o soportes, la alerta institucional conserva la instrucción para que la IE actualice la evidencia y la carga vuelve a disparar el análisis.

Las decisiones de aprobación siguen siendo las únicas que avanzan el expediente a CDP y activan la entrega institucional por correo.

## Consecuencias

El estado visible del documento coincide con su última versión: una versión reanalizada se presenta como pendiente de revisión jurídica. La aprobación previa permanece en la trazabilidad, pero no se reutiliza para autorizar una versión posterior.
