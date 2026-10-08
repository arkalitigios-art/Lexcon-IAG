# 006. Credenciales públicas de demostración por rol

## Contexto

La demostración local debe empezar por una pantalla de acceso funcional y permitir probar cada rol sin depender de una variable de entorno que no aparece en la interfaz. El acceso anterior mostraba una ancla hacia una sección cerrada, por lo que no exponía las cuentas ni permitía completar la contraseña.

## Decisión

Se mantienen cinco cuentas inequívocamente ficticias, una por rol. Sus valores de demostración se centralizan en `src/platform/auth/demo-credentials.ts`; la semilla guarda únicamente sus hashes y la pantalla de acceso los muestra como credenciales públicas de prueba. Al elegir un perfil se completan usuario y contraseña en el formulario.

Estos valores no son secretos, no pertenecen a personas o instituciones reales y no pueden reutilizarse en un despliegue real. Las credenciales reales seguirán requiriendo una provisión privada fuera de la interfaz.

## Consecuencias

La demostración es reproducible y verificable desde la primera pantalla. El código que pase a una instalación real deberá sustituir este proveedor de demostración por un mecanismo de alta y gestión de contraseñas privadas.
