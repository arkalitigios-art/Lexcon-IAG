# Administración sobre Supabase: diseño

- **Fecha:** 2026-10-15
- **Estado:** Aprobado por la persona responsable (conversación del 2026-10-15).
- **Subproyecto:** A de la migración del backend a Supabase, precedido por la Parte 0 (aviso de funciones no disponibles). B (expediente) y C (flujo, avisos y worker) tienen sus propias especificaciones.

## Problema

En producción la aplicación usa solo Supabase (el contenedor no tiene base SQLite), pero buena parte del código de negocio nació sobre SQLite. Las pantallas que lo usan fallan con un error de servidor. Un inventario de los 54 puntos de entrada (páginas y rutas de API) muestra que funcionan con Supabase el acceso y las cuentas, Mi cuenta, `/setup`, el listado y la ficha de procesos, la apertura con cotizaciones, la bandeja del administrador y Usuarios y accesos. No funcionan: instituciones y abogados (crear y editar), la asignación de responsable (a pesar de tener rama Supabase), Alertas, Auditoría, Accesos, reglamentos, estudio de mercado, comité evaluador, las transiciones del flujo, los borradores IAG, las notificaciones y el worker.

Corregir pantalla por pantalla, cuando falla en producción, no es sostenible. Esta especificación fija el orden y el método.

## Decisiones tomadas

1. **Orden:** primero la Parte 0 (aviso central) y después el subproyecto A (Administración). B y C, después.
2. **Cuentas y abogados se unifican en Usuarios y accesos.** No se migran la creación de abogados con contraseña temporal ni la lista de Accesos del centro de control: LEXCON no asigna contraseñas y ya existe una sola forma de invitar.
3. **Datos de la Institución Educativa:** nombre, ciudad, departamento (obligatorio en la base), estado del servicio y observación; NIT y código DANE opcionales.

## Parte 0: funciones no disponibles

**Objetivo.** Que ninguna persona vea un error de servidor por una función que todavía no existe en Supabase.

- `src/platform/features.ts` declara cada función (clave estable, etiqueta, rutas de página y de API que la componen) y si está **disponible con Supabase**.
- Una función `funcionDisponible(clave)` devuelve `true` siempre en modo local (SQLite, demostración) y el valor declarado en modo Supabase.
- **Páginas:** las que dependen de una función no disponible llaman a `exigirFuncion(clave)`, que renderiza una página uniforme (`NoDisponible`: «Esta función estará disponible próximamente») dentro del marco normal. No lanza errores.
- **Menú:** `navFor` filtra las opciones cuya función no está disponible.
- **API:** las rutas responden `501` con `{ error: 'Esta función estará disponible próximamente.' }` y `Cache-Control: no-store`.
- **Prueba de coherencia:** una prueba recorre `features.ts` y comprueba que toda función marcada como disponible tenga rama Supabase en los módulos que declara, y que toda página o ruta de dependencia SQLite figure en la tabla. Evita que una pantalla nueva quede fuera del mecanismo.
- Cada función se marca como disponible cuando se migra su módulo; la tabla es la lista de trabajo pendiente de B y C.

## Parte A: Administración

Patrón común (el mismo de `/setup`, Mi cuenta y la corrección de correo): **servicio puro** con las reglas de negocio y un **puerto**; un **adaptador delgado** a Supabase con la clave de servicio solo en el servidor; **pruebas con adaptadores simulados**. Cada escritura exige la capacidad `ACCESS_MANAGE` (o `ATTORNEY_ASSIGN` para asignar) y deja un evento de auditoría.

### A1. Instituciones Educativas

- Módulo `src/modules/admin/institutions` con servicio y adaptador Supabase sobre `instituciones_educativas` y `periodos_servicio_ie`.
- **Listar y ver:** nombre, ciudad, departamento, estado del servicio, observación, número de cuentas activas (asignaciones de rol con esa institución) y número de procesos.
- **Crear y editar:** nombre (3 a 120 caracteres), ciudad (2 a 100), departamento (2 a 100), NIT y código DANE opcionales y únicos, estado (`ACTIVE`→`ACTIVO`, `SUSPENDED_ARREARS`→`SUSPENDIDO`, `ENDED`→`FINALIZADO`) y observación. `activo` es verdadero solo con estado `ACTIVO`.
- **Periodos de servicio:** cada cambio de estado cierra el periodo vigente y abre uno nuevo en `periodos_servicio_ie` (motivo = observación, `registrado_por` = quien actúa), dentro de una sola función de base de datos para que sea atómico.
- Se mantienen la validación y los mensajes de error actuales; los códigos duplicados (NIT, DANE) responden con un mensaje claro.
- El formulario gana los campos departamento, NIT y código DANE.

### A2. Abogados y cuentas (unificado)

- **Equipo jurídico:** vista de solo lectura de los abogados activos (nombre, correo, procesos asignados) con enlaces a Usuarios y accesos para invitar, corregir correo o desactivar.
- **Registrar abogado Lexcon** y **Editar abogado Lexcon:** se eliminan como pantallas. Las opciones del menú llevan a Usuarios y accesos con el rol Abogado preseleccionado. `/api/admin/attorneys` y `modules/admin/service-administration.ts` (parte de abogados) se retiran.
- **Accesos** (`/dashboard/admin/accesses`) redirige a Usuarios y accesos; `access-management.ts` se retira.

### A3. Asignar responsable jurídico

- `listUnassignedProcesses` se reescribe con una consulta propia (procesos sin responsable activo de tipo `ABOGADO`), sin construir un usuario vacío para reutilizar el listado general.
- `assignAttorneyRemote` se mantiene (función `asignar_abogado_proceso`) y se valida su contrato con una prueba del SQL. La función ya valida al administrador y al abogado, retira al abogado anterior si lo hay y deja el evento `ABOGADO_ASIGNADO` en `eventos_auditoria`; no se duplica la auditoría desde la aplicación.
- En modo Supabase no se ejecuta `notifyAssignedAttorney` (depende de SQLite); el aviso al abogado queda en el subproyecto C. Se documenta como limitación.
- Se identifica y corrige la causa real del error actual (se pedirá el registro del servidor si la reproducción local con adaptadores simulados no la revela).

### A4. Alertas y bloqueos, Registro de actuaciones

- `getAdminControlCenter` pasa a asíncrona con adaptador Supabase: bloqueos activos (`bloqueos_proceso` con institución y proceso), últimos eventos de auditoría (`eventos_auditoria` con el nombre de quien actuó) y los contadores de la bandeja.
- Las pantallas Alertas y bloqueos y Registro de actuaciones usan esa lectura. Solo el Administrador puede verlas.

### Migración de base de datos

Una migración con la función `registrar_evento_administrativo(p_id_actor, p_id_institucion, p_id_proceso, p_accion, p_tipo_entidad, p_id_entidad, p_datos)`: valida la acción contra una lista cerrada con la convención en español de `asignar_abogado_proceso` (`INSTITUCION_CREADA`, `INSTITUCION_ACTUALIZADA`, `INSTITUCION_SERVICIO_SUSPENDIDO`, `INSTITUCION_SERVICIO_FINALIZADO`, `INSTITUCION_SERVICIO_REACTIVADO`), inserta en `eventos_auditoria` (el disparador existente calcula la cadena de hash), con `security definer`, `search_path` fijo y ejecución solo para `service_role`. Una segunda función `guardar_institucion` hace la escritura de la institución, del periodo y de la auditoría en una transacción.

## Seguridad y privacidad

- Clave de servicio solo en el servidor; ninguna ruta devuelve datos de otras instituciones ni de otras personas fuera del alcance del Administrador.
- Mensajes de error genéricos en español; los detalles solo en el registro del servidor.
- Auditoría de toda escritura, con correos enmascarados cuando intervengan.

## Pruebas

- Servicios y adaptadores con simulaciones (como `account-service`), incluidas las reglas de permisos y los casos de error.
- Pruebas de contrato de la migración (funciones, permisos, acciones válidas).
- Prueba de coherencia de `features.ts`.
- Verificación en el dominio con una lista: crear y editar una IE (con departamento), suspender y reactivar, invitar a un abogado desde Equipo jurídico, asignarlo a un proceso, ver Alertas y bloqueos y Registro de actuaciones.

## Documentación

Decisión 056 («Migración de administración a Supabase y aviso de funciones no disponibles»), secciones de `docs/architecture.md` y `docs/current-state.md`, y README.

## Fuera de alcance

Expediente (reglamentos, cotizaciones, estudio de mercado, comité y archivos en Storage), transiciones del flujo, borradores IAG, notificaciones, alertas del flujo y worker (subproyectos B y C); ya no se crearán abogados con contraseña temporal.
