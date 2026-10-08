# 008. Transiciones documentales por fase y rol

## Contexto

El modelo funcional define un ciclo documental completo, pero la implementación inicial solo conservaba cotizaciones, el bloqueo por ausencia de reglamento y la asignación de abogado. No existía una forma verificable de continuar el expediente sin inventar análisis jurídico o decisiones institucionales.

## Decisión

Cada expediente expone una única actuación según su fase y el rol autenticado. La actuación puede exigir una carga documental o registrar una revisión humana sobre la evidencia que ya existe. Antes de avanzar la fase, LEXCON valida el acceso por institución, asignación jurídica o comité; conserva cualquier soporte como documento y versión inmutable; registra la actuación de fase, una acción de versión y un evento de auditoría.

La IE puede registrar una versión de reglamento. La versión activa se enlaza solamente al abrir expedientes posteriores y no desbloquea ni modifica automáticamente expedientes ya abiertos.

## Consecuencias

El ciclo puede probarse de extremo a extremo con evidencia real cargada localmente y sin declarar que LEXCON haya calculado, firmado, publicado o decidido algo. Las reglas de contratación, los análisis y la IA productiva siguen pendientes de una decisión funcional específica.
