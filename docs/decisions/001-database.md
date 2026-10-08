# 001: Persistencia local inicial

**Estado:** aceptada

## Contexto

LEXCON IAG requiere integridad relacional, migraciones versionadas, transacciones y operación local sin servicios externos durante la primera entrega de infraestructura.

## Decisión

Se utilizará SQLite local mediante migraciones versionadas. El esquema se diseñará desde el modelo funcional aprobado y no desde pantallas o casos aislados.

## Consecuencias

- La demo y el desarrollo inicial podrán ejecutarse sin Docker ni Supabase.
- Las fronteras de persistencia deberán permitir sustituir el adaptador local al preparar producción.
- Las migraciones y sus pruebas forman parte de cada cambio estructural.
