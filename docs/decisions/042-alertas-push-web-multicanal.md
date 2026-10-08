# 042. Alertas multicanal mediante notificaciones push web

## Contexto

Las alertas internas y el correo no garantizan que Rectoría, el funcionario autorizado o el abogado conozcan oportunamente una actuación pendiente cuando no están consultando LEXCON.

## Decisión

LEXCON conserva la alerta interna como trazabilidad y el correo como respaldo formal. Añade notificaciones push web como canal inmediato, asociado exclusivamente a la cuenta que autoriza cada dispositivo. La aplicación es instalable como PWA y el aviso push abre un enlace autenticado al expediente, sin adjuntar documentos ni incluir información sensible.

Cada actuación del flujo notifica a quien debe intervenir en la siguiente fase: las revisiones jurídicas se dirigen al abogado asignado y las actuaciones institucionales a Rectoría y apoyo autorizado. Se registra la entrega interna, el estado de correo y cada intento push. Si faltan credenciales VAPID, el aviso queda como pendiente de configuración y los demás canales continúan disponibles.

## Consecuencias

No se usa WhatsApp ni plantillas pagas. La primera activación exige consentimiento del usuario y una instalación servida mediante HTTPS en producción. Un navegador ya asociado a una cuenta no puede asociarse a otro rol o usuario sin desactivar primero la suscripción o usar un perfil distinto. Las claves VAPID y el endpoint de correo permanecen fuera del repositorio.