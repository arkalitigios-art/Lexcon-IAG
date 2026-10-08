# 002: Autenticación

**Estado:** aceptada

## Contexto

El modelo funcional define acceso privado sin registro público. Debe soportar administrador Arka con alcance global, abogado Arka limitado a sus asignaciones, rector u ordenador del gasto y apoyo delegado limitado a su IE.

## Decisión

La primera infraestructura tendrá cuentas locales creadas por semilla, contraseñas hasheadas y sesiones privadas. La autorización se evaluará en cada acción mediante rol, membresía, capacidad, institución y asignación.

## Consecuencias

- No habrá registro público ni contraseñas en claro versionadas.
- Las cuentas de desarrollo serán inequívocamente ficticias.
- Los proveedores de identidad externos quedan fuera de la primera entrega y se integrarán mediante un límite sustituible.
