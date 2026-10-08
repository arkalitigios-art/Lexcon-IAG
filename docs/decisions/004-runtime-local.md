# 004: Runtime local y acceso web

**Estado:** aceptada

## Contexto

La primera infraestructura debe funcionar localmente en navegador sin Docker ni servicios de nube, mantener una web privada y separar el worker para trabajos diferidos.

## Decisión

El proyecto se implementará con Node.js, `pnpm`, Next.js y TypeScript estricto. La web y el worker serán procesos Node separados dentro del mismo proyecto. Las versiones exactas se fijarán al instalar dependencias compatibles y se registrarán en el manifiesto bloqueado.

## Consecuencias

- El navegador consumirá exclusivamente rutas privadas de la web.
- El worker no se ejecutará dentro de una petición web.
- No se introduce Docker, Supabase, servicios de nube ni proveedor de identidad en esta fase.
