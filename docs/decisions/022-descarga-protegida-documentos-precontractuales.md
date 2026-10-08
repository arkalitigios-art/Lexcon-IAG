# 022. Descarga protegida de documentos precontractuales

Fecha: 2026-09-30

## Contexto

La abogada asignada debe poder analizar fuera de la pantalla el estudio previo o de conveniencia y la invitación pública creados después del CDP.

## Decisión

Cada documento precontractual incluye un enlace de descarga Word. La ruta acepta únicamente los tipos `PRELIMINARY_STUDY` y `PUBLIC_INVITATION`, verifica la sesión, el rol de abogada y la asignación al expediente, y genera el DOCX bajo demanda desde el contenido vigente.

## Consecuencias

No se conserva una copia pública del documento ni se amplía el acceso de otros roles. La descarga refleja el contenido del documento que la abogada está revisando.
