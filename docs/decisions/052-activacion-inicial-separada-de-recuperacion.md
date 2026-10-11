# 052. Activación inicial separada de recuperación

## Contexto

Una persona que todavía no ha creado contraseña no está recuperando acceso. La interfaz anterior reutilizaba `/forgot-password` para ambos casos y mostraba frases como “Recupere su acceso” y “Olvidé mi contraseña”, lo que confundía el primer ingreso. Además, LEXCON no asigna correos: cada persona aporta y usa su propia dirección, que debe estar autorizada previamente.

## Decisión

La raíz de la aplicación dirige a `/login`. La primera cuenta se crea exclusivamente con el comando de servidor `bootstrap-supabase-admin`, ejecutado una sola vez en la terminal de Dokploy con las variables privadas disponibles en ese entorno. Así se evita que una persona externa pueda apropiarse del rol global antes de que exista un Administrador. La ruta `/activate-account` queda reservada para solicitar un enlace nuevo de creación de contraseña después de que una persona ya recibió una invitación; no crea cuentas ni registra correos.

`/login` queda reservado para personas que ya crearon contraseña. Allí se muestran dos opciones separadas: activar por primera vez y recuperar una contraseña olvidada. `/forgot-password` conserva exclusivamente el segundo propósito. La confirmación de Supabase conserva el contexto de activación o recuperación para ofrecer el reenvío adecuado si el enlace no es válido.

## Consecuencias

El lenguaje y las acciones de cada pantalla reflejan el momento real del usuario. La protección contra enumeración de cuentas y el flujo PKCE en el navegador se conservan. Crear una cuenta autorizada continúa siendo una acción administrativa; la activación no permite el auto-registro de correos no autorizados. La interfaz no interpreta una solicitud como enviada si la API de Supabase devuelve un error y comunica categorías seguras de límite temporal, conectividad o configuración, para evitar confirmaciones falsas sin exponer datos internos. La imagen de Dokploy contiene el comando de inicialización sin dependencias de desarrollo para que el primer Administrador pueda crearse dentro del entorno que conserva la clave de servicio.
