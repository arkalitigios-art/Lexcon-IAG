# Diseño de infraestructura local de LEXCON IAG

**Estado:** aprobado para planificación de implementación
**Fecha:** 2026-09-22

## Propósito

Establecer una base local, privada y reemplazable para LEXCON IAG antes de construir módulos jurídicos u operativos. La infraestructura sostiene el modelo funcional aprobado para contratación FSE de Instituciones Educativas Oficiales; no define decisiones jurídicas ni sustituye actuaciones humanas.

## Alcance de la primera entrega

- Aplicación web privada ejecutable localmente con Node.js.
- SQLite local con migraciones versionadas y esquema inicial normalizado.
- Cuentas locales preconfiguradas, contraseñas hasheadas, sesiones privadas y autorización por rol, institución y asignación.
- Directorio privado de archivos con una abstracción sustituible.
- Cola persistente local y proceso worker separado.
- Interfaces sustituibles para almacenamiento, IA, correo, Telegram, generación documental, calendario y análisis de malware.
- Trazabilidad, versiones inmutables y alertas internas como capacidades estructurales.
- Pruebas de migraciones, autorización, aislamiento institucional, auditoría y versiones.

No incluye pantallas de negocio, flujos jurídicos completos, publicación automática en SECOP II, credenciales externas, envío real de correo o Telegram, IA productiva ni datos reales.

## Alternativas evaluadas

| Alternativa | Resultado |
| --- | --- |
| Aplicación única sin límites internos | Rechazada: simplifica el inicio, pero mezcla dominio, infraestructura y futuras integraciones. |
| Aplicación Node.js local con adaptadores y worker separados | Adoptada: mantiene una ejecución local simple y preserva los límites necesarios para producción. |
| Servicios de nube y Docker desde el inicio | Rechazada para esta etapa: agrega dependencias externas antes de validar la base del sistema. |

## Componentes y responsabilidades

| Componente | Responsabilidad | No puede hacer |
| --- | --- | --- |
| Web privada | Sesión, autorización, casos de uso y respuestas seguras. | Acceder a secretos externos desde el navegador ni omitir controles de acceso. |
| Dominio | Reglas de expedientes, documentos, estados, autorizaciones y auditoría. | Depender de SQLite, archivos locales o interfaces web. |
| Persistencia SQLite | Datos relacionales, migraciones, transacciones y cola local. | Tomar decisiones jurídicas. |
| Archivos locales privados | Conservación local de archivos durante desarrollo. | Exponer rutas públicas o aceptar archivos sin validación. |
| Worker local | Consume trabajos diferidos y registra resultados. | Modificar decisiones institucionales o jurídicas por sí mismo. |
| Adaptadores | Implementan contratos para almacenamiento, IA, cola, notificaciones, documentos, calendario y análisis. | Filtrar una tecnología concreta al dominio. |

## Modelo inicial de persistencia

Las migraciones partirán del modelo funcional y contendrán, como mínimo, las siguientes áreas relacionales:

- Institución, usuario, membresía, rol y capacidad.
- Reglamento institucional, versión, regla extraída y contexto congelado al abrir el expediente.
- Expediente, fase, estado, responsables, asignaciones, actuaciones y bloqueos.
- Documento lógico, versión inmutable, archivo, revisión, observación, aprobación, firma, publicación SECOP y evidencia.
- Cotización, ítem comparable, exclusión justificada, matriz y resultado de mercado.
- CDP, precontractual, ofertas, evaluación, comité, decisión, formalización, ejecución y cierre.
- Tarea, alerta, entrega, canal de notificación y auditoría.
- Trabajo asíncrono, intento, idempotencia y resultado seguro.

La implementación física concreta debe conservar claves foráneas, índices de acceso y restricciones para garantizar: aislamiento institucional; abogado Arka limitado a asignaciones; versiones inmutables; acciones ligadas a una versión exacta; y evidencia obligatoria para marcar SECOP II como cumplido.

## Seguridad y autorización

- No habrá registro público ni recuperación basada en servicios externos en esta etapa.
- Las cuentas semilla son inequívocamente ficticias y no se versionan con contraseñas en claro.
- Las contraseñas se almacenan únicamente como hashes robustos.
- Cada acción sensible exige una sesión válida, membresía activa, capacidad explícita y ámbito autorizado.
- El administrador Arka tiene ámbito global; el abogado Arka solo expedientes o tareas asignados; rector y apoyo delegado solo su institución, con las restricciones funcionales aprobadas.
- Toda mutación se realiza de forma transaccional y genera una actuación auditable.

## Archivos, alertas y trabajos diferidos

Los archivos se conservarán fuera de las rutas públicas y fuera de Git. El contrato de almacenamiento exigirá validación de nombre, tipo, tamaño e integridad antes de asociar un archivo a una versión documental. El análisis antimalware permanecerá como punto de integración obligatorio antes de habilitar carga real sensible.

Las alertas se modelarán desde el inicio. La bandeja interna podrá implementarse sobre datos locales; correo y Telegram serán adaptadores desactivados sin credenciales. El worker consumirá una cola SQLite persistente y registrará intentos, errores seguros e idempotencia.

## Flujo técnico de una mutación

1. La web identifica la sesión y el ámbito autorizado.
2. El caso de uso valida la capacidad, pertenencia institucional o asignación y reglas del dominio.
3. Una transacción escribe el cambio, la actuación de auditoría y, si corresponde, una alerta o trabajo diferido.
4. El worker procesa el trabajo mediante un adaptador y deja un resultado trazable.
5. Ningún trabajo automático aprueba jurídicamente, firma, publica en SECOP II ni adopta una decisión institucional.

## Verificación de aceptación

- Una migración nueva puede aplicarse sobre una base SQLite vacía y deja un esquema consistente.
- Una IE no puede leer ni mutar expedientes de otra IE.
- Un abogado Arka sin asignación recibe una denegación segura.
- Una corrección crea una nueva versión sin modificar la anterior.
- Una aprobación, firma u observación referencia una versión exacta.
- El contexto reglamentario del expediente se conserva cuando se actualiza un reglamento institucional.
- Una publicación SECOP II no puede completarse sin evidencia registrada.
- Un trabajo repetido no duplica el efecto de una mutación idempotente.

## Operación local

La entrega incluirá comandos documentados para instalar dependencias, aplicar migraciones, cargar datos ficticios, iniciar la web, iniciar el worker y ejecutar verificaciones. No requerirá Docker, Supabase ni servicios de nube.

## Fuera de alcance explícito

- Implementación de módulos de mercado, precontractual, ofertas, evaluación, formalización, ejecución o cierre.
- Interfaz de usuario de negocio.
- Extracción, generación o evaluación jurídica automática mediante IA.
- Envío de correo o Telegram con credenciales reales.
- Publicación automática o integración en línea con SECOP II.
- Despliegue en nube.
