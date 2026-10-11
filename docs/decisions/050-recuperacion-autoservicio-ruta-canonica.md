# 050. Ruta canónica para recuperación de contraseña

- **Fecha:** 2026-10-10
- **Estado:** Aceptada

## Contexto

Los enlaces de Supabase son de un solo uso y pueden vencer. LEXCON debe ofrecer una recuperación autónoma sin revelar si un correo tiene cuenta. La pantalla ya implementada para ello está en `/forgot-password`, pero el estado de enlace no disponible dirigía por error a una ruta inexistente bajo `/auth`.

## Decisión

`/forgot-password` es la ruta pública canónica para solicitar recuperación. La página de confirmación de Supabase enlaza directamente a ella. `/auth/forgot-password` se conserva como redirección temporal a la ruta canónica, para que enlaces o marcadores anteriores no entreguen un 404.

## Consecuencias

- Un enlace inválido permite solicitar una recuperación nueva desde una pantalla funcional.
- La respuesta mantiene el mismo mensaje para correos existentes e inexistentes.
- La redirección no procesa tokens ni expone información de cuentas.
