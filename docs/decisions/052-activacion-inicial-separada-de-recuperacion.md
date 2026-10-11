# 052. Activación inicial separada de recuperación

## Contexto

Una persona que todavía no ha creado contraseña no está recuperando acceso. La interfaz anterior reutilizaba `/forgot-password` para ambos casos y mostraba frases como “Recupere su acceso” y “Olvidé mi contraseña”, lo que confundía el primer ingreso. Además, LEXCON no asigna correos: cada persona aporta y usa su propia dirección, que debe estar autorizada previamente.

## Decisión

La ruta pública inicial pasa a ser `/activate-account`. Solicita el correo propio de la persona y envía un enlace para crear la contraseña inicial sin confirmar públicamente si la dirección está autorizada. La raíz de la aplicación dirige a esa ruta.

`/login` queda reservado para personas que ya crearon contraseña. Allí se muestran dos opciones separadas: activar por primera vez y recuperar una contraseña olvidada. `/forgot-password` conserva exclusivamente el segundo propósito. La confirmación de Supabase conserva el contexto de activación o recuperación para ofrecer el reenvío adecuado si el enlace no es válido.

## Consecuencias

El lenguaje y las acciones de cada pantalla reflejan el momento real del usuario. La protección contra enumeración de cuentas y el flujo PKCE en el navegador se conservan. Crear una cuenta autorizada continúa siendo una acción administrativa; la activación no permite el auto-registro de correos no autorizados. La interfaz no interpreta una solicitud como enviada si la API de Supabase devuelve un error, para evitar confirmaciones falsas ante límites temporales o fallos de configuración.
