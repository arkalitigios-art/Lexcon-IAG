# Plan: acceso por roles y recorrido institucional

**Especificación aprobada:** `docs/superpowers/specs/2026-09-22-acceso-por-roles-y-recorrido-ie-design.md`

## Objetivo de entrega

Entregar una aplicación local en la que cuentas ficticias de administrador Arka, abogado Arka, rectoría, funcionario autorizado y comité inicien sesión con contraseña, entren a un espacio acorde con su rol y solo consulten o ejecuten actuaciones permitidas. Rectoría y funcionario autorizado podrán abrir y consultar expedientes reales desde una carga múltiple de cotizaciones. El administrador podrá asignar abogado y el abogado verá exclusivamente sus expedientes asignados.

## 1. Centralizar identidad, capacidades y redirección

1. Tipar los roles de `CurrentUser` con `PlatformRole` y crear ayudas de servidor para exigir sesión y redirigir al espacio del rol.
2. Afinar `src/modules/access/authorization.ts`: separar lectura, apertura de expediente y asignación jurídica; retirar del comité la capacidad general de escritura.
3. Reemplazar la carga tardía del actual `/dashboard` por una página de servidor que resuelva la sesión y redirija de inmediato a la vista de administrador, abogado, IE o comité.
4. Mantener las reglas de institución y asignación como fuente única para las rutas API y las páginas. Un usuario no institucional nunca podrá abrir ni listar expedientes de una IE desde la API.
5. Actualizar la semilla para crear de forma idempotente cuentas ficticias de los cinco roles, todas con la contraseña aportada por `LEXCON_DEMO_PASSWORD`. No se escribirá ninguna contraseña en código ni documentación.

## 2. Exponer consultas de dominio mínimas y seguras

1. Añadir consultas de expedientes para cada alcance: institución, administrador y abogado asignado.
2. Crear una consulta de detalle de expediente que entregue solamente etapa, estado, fecha, bloqueo, responsable, asignación vigente y metadatos de las cotizaciones. Nunca incluirá el identificador interno en la interfaz.
3. Añadir una operación administrativa de asignación que compruebe que el solicitante es administrador Arka, que el destinatario es abogado Arka y que el expediente existe. Insertará o reactivará la asignación existente de manera trazable.
4. Añadir rutas HTTP para el detalle autorizado y la asignación administrativa. Los errores usarán códigos HTTP y mensajes coherentes con la UI.
5. Antes de guardar archivos en la apertura, comprobar la capacidad de apertura. Si una escritura posterior falla, borrar los archivos recién guardados para que no queden soportes privados sin versión documental.

## 3. Construir los espacios por rol

1. Crear una carcasa institucional reutilizable con identidad de la sesión, rol, IE cuando corresponda, navegación contextual y cierre de sesión.
2. Crear el espacio del administrador con expedientes reales, una sección de expedientes pendientes de abogado y un formulario de asignación que use las cuentas ficticias de abogado disponibles.
3. Crear el espacio del abogado con expedientes asignados y un estado vacío factual cuando no existan.
4. Convertir el actual tablero en espacio de IE: lista de expedientes reales, acción de apertura y lenguaje dirigido a rectoría o funcionario autorizado según sus facultades.
5. Crear una ficha de expediente de IE y de abogado que muestre la evidencia, responsables, fase, estado y bloqueo. Los controles se limitarán a las actuaciones que ya existen.
6. Crear una ruta exclusiva de comité que declare el estado vacío real hasta que se habilite evaluación, sin exponer expedientes de la IE.

## 4. Mejorar el acceso y la carga múltiple

1. Rediseñar `login` con jerarquía institucional, instrucciones claras, controles de foco y mensajes de error comprensibles.
2. Rediseñar el formulario de cotizaciones para mostrar la lista de archivos seleccionados, permitir retirarlos antes de enviar y explicar que una o varias cotizaciones abren el expediente y quedan como evidencia.
3. Tras abrir el expediente, llevar a su ficha autorizada y mostrar una confirmación contextual; no exponer identificadores técnicos.
4. Rediseñar `globals.css` y los componentes para escritorio, tableta y celular con contraste adecuado, foco visible y reducción de movimiento.

## 5. Documentar y verificar

1. Actualizar `README.md` con inicio local y las cuentas ficticias por rol, sin incluir secretos.
2. Corregir `docs/architecture.md` para reflejar las pantallas de negocio iniciales, los límites de autorización y el flujo de datos de acceso, asignación y apertura.
3. Actualizar `docs/current-state.md` con las capacidades reales y los límites de cada rol.
4. Crear `docs/decisions/005-acceso-por-roles.md` para registrar la resolución de rol en servidor y la separación de capacidades.
5. Añadir pruebas unitarias para capacidades y asignación, e integración para aislamiento institucional, abogado asignado y rechazo de apertura no autorizada.
6. Ejecutar `corepack pnpm verify`, `corepack pnpm build`, `corepack pnpm worker:build` y `node scripts/sync-agent-guides.mjs --check`.

## Criterios de aceptación

- Una cuenta entra por contraseña y llega automáticamente al espacio de su rol.
- Rectoría y funcionario autorizado solo ven la información de su IE; abogado solo ve sus asignaciones; comité no ve expedientes generales.
- Un administrador puede asignar un abogado disponible a un expediente real y ese abogado lo ve después en su espacio.
- La carga de una o más cotizaciones abre un expediente, conserva documentos y lleva a una ficha sin ID técnico.
- La ficha comunica correctamente un bloqueo por falta de reglamento, sin crear una decisión jurídica.
- La navegación, los formularios y los estados funcionan en pantallas pequeñas y con teclado.
- Todas las comprobaciones exigidas pasan.
