# 005: Resolución de acceso por roles en el servidor

**Estado:** aceptada

## Contexto

La demostración local ya tenía autenticación por contraseña y membresías, pero una única pantalla de tablero no representaba el alcance de administrador Arka, abogado, rectoría, funcionario autorizado y comité. La consulta de expedientes debía respetar de la misma manera la institución y la asignación de abogado en las páginas y en las rutas HTTP.

## Decisión

La entrada resuelve en el servidor la sesión y el rol de la membresía activa, y dirige cada cuenta a un espacio de trabajo propio. Las capacidades se expresan de forma explícita: solo rectoría y funcionario autorizado abren expedientes; solo administración Arka asigna abogado; el abogado accede únicamente a sus asignaciones; el comité no hereda lectura general de expedientes mientras no exista el módulo de evaluación.

Las consultas y operaciones de expediente reutilizan esas mismas reglas. La apertura verifica la capacidad antes de guardar soportes privados y elimina los archivos recién guardados si la apertura falla antes de registrar el expediente.

## Consecuencias

- La interfaz no necesita un selector de rol y no expone opciones ajenas al usuario autenticado.
- El administrador puede asignar el abogado usando la entidad de asignaciones existente y la actuación queda auditada.
- El primer recorrido de la IE puede evolucionar sin abrir expedientes o documentos a otras instituciones ni a abogados no asignados.
- La evaluación de comité conserva una ruta aislada y vacía hasta que exista un diseño específico para sus asignaciones y actas.
