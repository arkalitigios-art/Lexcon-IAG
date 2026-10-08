# 015. Entrega configurable del estudio de mercado aprobado

## Contexto

Al aprobar el estudio de mercado, la Institución Educativa debe recibir la comunicación para continuar con el CDP. La demostración local no dispone de credenciales ni de un proveedor de correo incorporado.

## Decisión

La aprobación registra un correo en `email_outbox`, lo encola y el worker intenta entregarlo mediante el endpoint configurado en `LEXCON_EMAIL_DELIVERY_URL`. El adaptador recibe destinatario, asunto y texto. Sin configuración, conserva el correo con estado `PENDING_CONFIGURATION` sin intentar una entrega externa.

La ciudad o municipio se registra en la Institución Educativa y se incorpora al cierre del estudio junto con la fecha de elaboración y la línea de firma del rector u ordenador del gasto.

## Consecuencias

La aprobación nunca depende de que el proveedor externo responda. La cola y el estado de salida dejan trazabilidad de la entrega y permiten configurar un proveedor compatible sin modificar el flujo jurídico.
