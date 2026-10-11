# 053. Inicialización segura del primer Administrador en Dokploy

## Contexto

Una cuenta inexistente no puede solicitar recuperación de contraseña. La primera invitación debe crear la identidad y el rol global, pero una ruta web pública para esa tarea permitiría que cualquiera reclamara la administración antes de que exista una cuenta legítima.

## Decisión

El primer Administrador se inicializa una única vez dentro de la terminal del contenedor de Dokploy mediante `node scripts/bootstrap-supabase-admin.mjs --execute`. El comando requiere las variables temporales de nombre y correo junto con las variables privadas de Supabase ya disponibles en el contenedor. Verifica que no haya un Administrador activo, crea la invitación, registra perfil y rol mediante la RPC restringida y elimina la identidad recién creada si esa asignación falla.

La imagen de producción copia el script JavaScript autónomo. No depende de `pnpm`, `tsx` ni paquetes de desarrollo y no se expone como ruta HTTP.

## Consecuencias

La primera administración no puede ser apropiada mediante el navegador público. La persona responsable recibe un correo de invitación para definir su propia contraseña. Después de esa ejecución, los Administradores gestionan las cuentas posteriores desde LEXCON; `/activate-account` solo sirve para reenviar el enlace de una invitación existente.
