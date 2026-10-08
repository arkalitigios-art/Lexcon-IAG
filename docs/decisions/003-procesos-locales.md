# 003: Procesos y adaptadores locales

**Estado:** aceptada

## Contexto

La aplicación debe operar localmente sin Docker, Supabase, correo, Telegram, almacenamiento en nube ni IA productiva, pero no debe quedar acoplada a implementaciones locales temporales.

## Decisión

La web Node.js y el worker Node.js serán procesos separados. Los trabajos diferidos se persistirán localmente y las integraciones se representarán mediante contratos sustituibles para almacenamiento, IA, correo, Telegram, documentos, calendario y análisis antimalware.

## Consecuencias

- Se podrá ejecutar y comprobar la infraestructura sin credenciales externas.
- Correo y Telegram estarán desactivados hasta configurar proveedores reales; la bandeja interna mantiene el registro de alertas.
- Un futuro paso a infraestructura de producción sustituirá adaptadores, sin trasladar decisiones jurídicas ni cambiar el modelo de dominio.
