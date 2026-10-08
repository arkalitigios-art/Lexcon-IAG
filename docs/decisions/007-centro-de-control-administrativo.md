# 007. Centro de control administrativo con proyecciones de datos reales

## Contexto

La administración Arka tenía una única vista de expedientes y una acción de asignación. No ofrecía un punto de inicio comprensible para administrar LEXCON IAG ni exponía los datos de control que ya existen: bloqueos, accesos vigentes y auditoría.

## Decisión

El espacio inicial del administrador se organiza como un centro de control. Sus accesos abren módulos separados de Instituciones Educativas, abogados Arka, asignación jurídica, expedientes, alertas operativas, accesos y roles, y trazabilidad. Los conteos y listados se consultan directamente desde SQLite. La administración puede activar o desactivar membresías ficticias; esa actuación queda auditada y el administrador no puede desactivar su propio acceso. Las IE tienen estado de servicio activo, suspendido por mora o finalizado; finalizar es una baja lógica para preservar los expedientes y la trazabilidad.

## Consecuencias

El administrador puede identificar su siguiente acción desde la primera pantalla sin que la interfaz prometa funciones aún no implementadas, como creación de personas, cambio de rol, decisiones institucionales o actuaciones jurídicas.
