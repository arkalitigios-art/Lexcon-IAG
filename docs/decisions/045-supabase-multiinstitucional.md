# 045. Supabase multiinstitucional para LEXCON IAG

- **Fecha:** 2026-10-07
- **Estado:** Aceptada

## Contexto

LEXCON IAG gestionará procesos de varias Instituciones Educativas. La Institución Educativa INEM de Montería será la primera IE en operar un proceso real. La solución necesita almacenar datos relacionales y documentos contractuales sensibles sin asumir el costo de operación comercial antes de validar el servicio.

## Decisión

Se adopta Supabase PostgreSQL como fuente estructurada de datos y Supabase Storage privado como repositorio inicial de documentos. La nomenclatura funcional se mantiene íntegramente en español. LEXCON IAG usa un proyecto Supabase Free independiente de otros productos de Arka, con RLS, cuentas individuales, respaldos manuales comprobados de PostgreSQL y archivos, y monitoreo de límites. Las IE son tenants lógicos del mismo proyecto, aislados por sus identificadores, roles y políticas RLS.

El mismo proyecto se actualiza a Supabase Pro cuando se incorpore la primera IE cliente, se acerque a un límite del plan Free o se requiera continuidad y respaldos administrados.

## Consecuencias

- Las políticas RLS deben restringir toda fila por usuario, rol, IE y proceso.
- Ningún archivo contractual puede estar en un bucket público.
- La aplicación debe conservar metadatos, hash y versión de cada archivo en PostgreSQL.
- El plan Free es apto para un piloto controlado, no para depender de respaldos administrados.
- Los respaldos de PostgreSQL y Storage se ejecutan por procesos distintos durante el piloto.
- El repositorio conserva la migración inicial de 61 tablas, políticas RLS, bucket privado y adaptadores de servidor y Storage. Su aplicación se difiere hasta contar con el proyecto Free del piloto y completar las pruebas de aislamiento y restauración; no se transfieren datos reales desde SQLite automáticamente.
