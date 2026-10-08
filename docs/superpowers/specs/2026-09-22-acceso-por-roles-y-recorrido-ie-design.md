# Diseño: acceso por roles y recorrido institucional

**Estado:** aprobado

## Propósito

Convertir la entrada local existente de LEXCON IAG en un acceso privado que reconozca a cada usuario por su cuenta y lo dirija a un espacio de trabajo acorde con su rol. A partir de ese acceso, habilitar el recorrido real inicial de la Institución Educativa (IE): abrir un expediente mediante una o varias cotizaciones de mercado y consultar el estado, los documentos y los bloqueos reales del expediente.

No se crearán módulos jurídicos, de publicación SECOP II, firma, decisión institucional, evaluación ni proveedores externos que todavía no están aprobados o implementados.

## Principios de diseño

- El rol se obtiene de la membresía autenticada; nunca se elige desde la interfaz de inicio de sesión.
- La aplicación muestra solamente datos y actuaciones autorizadas por rol, institución y asignación de expediente.
- Las pantallas no muestran identificadores técnicos, métricas inventadas ni módulos que aparenten estar operativos.
- Las cotizaciones son la evidencia que abre el expediente. La interfaz debe permitir una, dos, tres o más cargas en una sola operación y explicar ese efecto antes y después de enviarlas.
- Un bloqueo por ausencia de reglamento aplicable preserva la evidencia y bloquea únicamente la actuación afectada. La interfaz no propone soluciones ni interpretaciones jurídicas.
- El lenguaje es jurídico-administrativo colombiano, sobrio y comprensible; no usa tono de producto genérico.

## Acceso y rutas por rol

La pantalla de acceso conserva correo y contraseña como único mecanismo de entrada de la demostración local. Muestra el carácter privado de LEXCON IAG y de Arka Litigios IAG, comunica que no existe registro público y presenta errores de credenciales de forma uniforme.

Después de iniciar sesión, el servidor resuelve la membresía activa y redirige a la ruta apropiada:

| Rol | Espacio inicial | Alcance inicial operativo |
| --- | --- | --- |
| Administrador Arka | Seguimiento institucional | Consulta expedientes, identifica expedientes sin abogado y asigna un abogado Arka. |
| Abogado Arka | Mis expedientes | Consulta únicamente expedientes asignados. |
| Rector / ordenador | Espacio de la IE | Consulta expedientes de su IE y abre expedientes desde cotizaciones. |
| Funcionario autorizado de la IE | Espacio de la IE | Consulta expedientes de su IE y abre expedientes desde cotizaciones; no firma, publica ni decide. |
| Comité de evaluación | Actas de evaluación | Recibe una ruta exclusiva con un estado vacío veraz mientras el módulo de evaluación y sus asignaciones no estén habilitados. |

El administrador, el abogado y el comité no recibirán opciones que correspondan a la IE. El comité tampoco hereda permisos de escritura generales. Las capacidades de firma, publicación SECOP II y decisión institucional permanecen reservadas para rectoría y no se activan en este incremento. La ruta del comité no activa ni consulta evaluaciones en este incremento: informa, con precisión, que todavía no existen actuaciones de comité habilitadas.

## Recorrido de la IE

1. Rectoría o el funcionario autorizado inicia sesión y entra al centro de su IE.
2. El centro prioriza expedientes existentes y ofrece la acción de abrir expediente mediante cotizaciones de mercado.
3. El formulario permite seleccionar y revisar una lista de uno o más archivos antes de enviarla. Explica que cada archivo quedará como evidencia privada y que la carga abre el expediente.
4. Al completarse la carga, LEXCON confirma que el expediente fue abierto sin mostrar su identificador técnico.
5. La ficha del expediente muestra etapa, estado, fecha de apertura, responsable institucional, abogado asignado cuando exista, bloqueo activo y documentos de cotización recibidos.
6. Si no existe reglamento aplicable, la ficha informa que se conservó la evidencia y que solo la actuación de mercado está bloqueada. No altera ni interpreta el reglamento.

La lista y la ficha usan exclusivamente datos almacenados en SQLite. Si todavía no hay responsable jurídico, documentos adicionales o actuaciones habilitadas, lo expresan como un estado factual.

## Interfaz y accesibilidad

La interfaz tendrá una composición institucional contemporánea, con jerarquía centrada en expedientes, actuaciones, responsables y documentos. La navegación se adapta por rol; en pantallas pequeñas pasa a un panel accesible.

Los formularios tendrán etiquetas visibles, instrucciones próximas al campo, mensajes de error y estado anunciables, foco perceptible, contraste suficiente y movimiento reducido cuando el sistema del usuario lo solicite. Las cargas de documentos se presentarán como una lista legible, no como una zona decorativa sin estado.

## Autorización y persistencia

Las páginas protegidas y las rutas HTTP usarán una misma capa de autorización. Esta verificará sesión, membresía, rol, institución y asignación antes de devolver datos o permitir actuaciones.

La apertura de expedientes y la carga de cotizaciones quedarán restringidas a rectoría y funcionario autorizado de la IE. Antes de persistir archivos, el servidor comprobará esa autorización y validará el lote. Los archivos conservarán la validación existente de nombre, tipo MIME, tamaño e integridad SHA-256. La implementación evitará que un error deje archivos privados sin referencia documental.

La semilla local incluirá cuentas ficticias de administrador Arka, abogado Arka, rectoría, funcionario autorizado y comité. Todas usarán la contraseña definida fuera del repositorio mediante `LEXCON_DEMO_PASSWORD`.

## Cambios previstos

- Componentes de autenticación, resolución de rol y redirección de entrada.
- Rutas y páginas de inicio diferenciadas por rol.
- Consulta real de expedientes para administración, abogado e IE, limitada por autorización.
- Asignación administrativa de abogado usando `attorney_assignments` existente.
- Centro de IE, carga múltiple de cotizaciones y ficha de expediente.
- Refuerzo de las capacidades para impedir que el comité o roles no institucionales abran expedientes.
- Documentación de arquitectura, estado y uso local, junto con una decisión técnica nueva sobre acceso por roles.

## Límites explícitos

- No habrá registro público, portal de proponentes ni publicación automática a SECOP II.
- No se habilitan análisis de mercado, cálculos, generación documental, CDP, evaluación, firma, formalización, ejecución ni cierre.
- No se introducen Supabase, Docker, nube, correo, Telegram, IA productiva ni análisis antimalware externo.
- No se trasladan archivos ni código del proyecto anterior.

## Pruebas y validación

Las pruebas cubrirán el aislamiento entre IE, el acceso del abogado solo a expedientes asignados, la reserva de capacidades del rector, la asignación de abogado y la apertura por usuarios institucionales autorizados. Se verificará que los flujos rechazados no creen expedientes ni dejen archivos privados sin referencia.

Antes de entregar se ejecutarán:

```powershell
corepack pnpm verify
corepack pnpm build
corepack pnpm worker:build
node scripts/sync-agent-guides.mjs --check
```
