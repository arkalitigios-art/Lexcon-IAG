# Diseño: configuración inicial del administrador y Mi cuenta

Fecha: 2026-10-11

## Propósito

Permitir que la primera persona administradora cree directamente su acceso (correo y contraseña) desde el navegador, sin depender de la terminal de Dokploy ni de un correo, y que pueda cambiar después su contraseña y su correo. Cubrir además la recuperación de emergencia si el administrador pierde todos sus datos de acceso.

Complementa la decisión 053: el comando `scripts/bootstrap-supabase-admin.mjs` se conserva como respaldo, pero deja de ser el camino principal.

## Decisión de roles

No se crea un rol de "super administrador". Se mantiene el rol único `ADMINISTRADOR_ARKA` y se permite tener dos o más administradores, de modo que uno respalde al otro. La figura de emergencia es quien controla el servidor (Dokploy): solo esa persona puede definir `LEXCON_SETUP_TOKEN`. La regla existente que impide desactivar al último administrador se conserva.

## Pantalla `/setup`

Ruta pública con una página de servidor y un formulario de cliente. El servidor decide el modo según el estado:

| Estado | Resultado |
|---|---|
| `LEXCON_SETUP_TOKEN` definido y ningún administrador activo | Modo **primer administrador**: código, nombre, correo, contraseña y confirmación, con mostrar/ocultar. |
| `LEXCON_SETUP_TOKEN` definido y existe un administrador activo | Modo **recuperación**: tras validar el código, la persona elige un administrador existente y define nuevo correo y contraseña. |
| `LEXCON_SETUP_TOKEN` no definido | Responde "no encontrada"; la ruta no revela su existencia. |

### Operaciones del servidor (clave de servicio, nunca en el navegador)

- **Primer administrador:** `auth.admin.createUser` con `email_confirm: true` y la contraseña elegida; después la función `registrar_acceso_usuario` con rol `ADMINISTRADOR_ARKA` e `id_institucion` nulo. Si el registro del perfil falla, se elimina la cuenta recién creada. El código es la autorización, por lo que no se exige confirmar el correo.
- **Recuperación:** `auth.admin.updateUserById` con el nuevo correo (confirmado) y contraseña, y sincronización del correo en el perfil. La selección se limita a administradores activos.
- Ambas operaciones vuelven a verificar el estado (administrador activo o no) en el servidor justo antes de actuar, para impedir que un formulario abierto con un estado anterior actúe sobre el estado nuevo.
- El correo (SMTP) sigue usándose para las invitaciones a Abogado, Rector y Apoyo IE.

## Mi cuenta (`/dashboard/account`)

- **Cambiar contraseña:** exige la contraseña actual y la nueva. Disponible para todos los roles.
- **Nombre visible:** editable por la propia persona.
- **Cambiar correo (el "usuario"):** disponible para **todos los roles**. Exige la contraseña actual. Supabase envía la confirmación al correo nuevo y el cambio se aplica al confirmar; el perfil se sincroniza al completarse. Mientras no se confirme, el acceso sigue funcionando con el correo anterior.
- Se añade el acceso a Mi cuenta en la navegación del espacio de trabajo.

**Prerrequisito de configuración.** Supabase trae activada por defecto la opción "Secure email change", que exige confirmar desde el correo anterior **y** desde el nuevo. Si el correo anterior está bloqueado o lleno, el cambio nunca se completaría. Hay que desactivarla en el proyecto de Supabase para que baste con confirmar el correo nuevo; la contraseña actual ya acredita a la persona. Este ajuste debe verificarse antes de implementar.

## Corrección de correo por el Administrador

Cuando una persona ya no puede abrir su correo (buzón lleno, bloqueado o perdido) no puede iniciar el cambio por sí misma ni recibir un enlace. Por eso, en **Usuarios y accesos** el Administrador puede **corregir el correo** de cualquier cuenta de Abogado, Rector o Apoyo IE, y también de otro Administrador.

- Operación de servidor con clave de servicio: `auth.admin.updateUserById` con el correo nuevo ya confirmado, y sincronización del correo en el perfil.
- Rechaza un correo ya registrado y exige confirmación explícita ("¿Corregir el correo de X a Y?").
- Un Administrador no corrige su propio correo por esta vía: usa Mi cuenta o, si perdió todo, la recuperación de `/setup`.
- Deja un evento de auditoría con el actor, la cuenta afectada y los correos anterior y nuevo (parcialmente enmascarados).
- Después de corregirlo, el Administrador puede usar **Reenviar acceso** para que la persona defina una contraseña nueva en su correo corregido.

Esta función se añade al alcance porque el cambio desde Mi cuenta no cubre el caso en que el correo anterior ya es inaccesible.

## Contraseñas

La longitud mínima es de **8 caracteres** en todos los flujos web (`/setup`, definir contraseña de invitación y recuperación, Mi cuenta). Se centraliza en una única constante; hoy `src/app/api/auth/update-password/route.ts` exige 12 y debe alinearse. La política de longitud mínima del proyecto Supabase debe ser igual o menor que 8.

## Seguridad

- El código se compara en tiempo constante (`timingSafeEqual`).
- Tras 5 intentos fallidos desde una misma IP, `/setup` se bloquea 15 minutos. El contador vive en memoria del proceso (despliegue de una sola instancia en Dokploy).
- El código, las contraseñas, los tokens y los enlaces nunca se escriben en logs ni en respuestas.
- Las respuestas de `/setup` llevan `Cache-Control: no-store`.
- Cada creación o recuperación deja un evento de auditoría.
- Recomendación operativa: retirar `LEXCON_SETUP_TOKEN` de Dokploy tras el primer uso y volver a definirlo solo ante una emergencia. El código debe tener al menos 24 caracteres aleatorios.

## Errores

- Código inválido o bloqueo por intentos: se muestra el mismo mensaje genérico ("No fue posible validar el código; verifique e intente más tarde"), para no confirmar si el código existe o si el bloqueo está activo.
- Correo ya registrado, contraseña débil o fallo de Supabase: mensajes seguros por categoría, sin datos internos.
- Fallo al asignar el rol: se revierte la cuenta creada y se informa que la operación no se completó.

## Pruebas

- Los tres estados de `/setup` (primer administrador, recuperación, no disponible).
- Código inválido, bloqueo por intentos y comparación en tiempo constante.
- Reversión de la cuenta si falla la asignación del rol.
- Recuperación de un administrador existente, incluido el cambio de correo.
- Verificación de estado repetida en el servidor antes de actuar.
- Mi cuenta: cambio de contraseña con contraseña actual correcta e incorrecta, y cambio de correo para cada uno de los cuatro roles, con contraseña actual incorrecta rechazada.
- Corrección de correo por el Administrador: solo Administrador autorizado, correo duplicado rechazado, un Administrador no puede usarla sobre sí mismo, auditoría registrada y perfil sincronizado.
- Mínimo de 8 caracteres en todos los flujos.

## Documentación

Decisión `054` (complementa la 053), `README.md`, `docs/architecture.md` y `docs/current-state.md`.

## Fuera de alcance

Rol de super administrador, autenticación de dos factores y rediseño visual (se trata en un ciclo aparte).
