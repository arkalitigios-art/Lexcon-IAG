# Diseño: sistema visual Esmeralda y adaptabilidad

Fecha: 2026-10-11

## Propósito

Renovar el aspecto de LEXCON IAG con el estilo **Esmeralda** elegido entre diez prototipos, y hacer que toda la aplicación se use bien en computador, portátil, tablet y celular. El cambio es de presentación y de textos; no altera rutas, permisos, datos ni reglas del proceso de contratación.

Este diseño reemplaza la paleta de la decisión 043 (azul noche ARKA, azul eléctrico y dorado). El prototipo aprobado está en `.superpowers/brainstorm/visual/estilos/` (archivo `04-Esmeralda.html`, copiado también en el escritorio de la persona).

## Sistema visual

- **Paleta:** fondo degradado verde → azul; contenedor y menú en petróleo profundo; contenido en superficies claras con tinte verde; tarjetas de indicadores con degradado (verde, azul, naranja, rosa); acento principal verde. Todos los colores son variables CSS de un único archivo `src/app/theme.css`.
- **Tipografía:** Outfit para títulos y texto de interfaz, servida desde la propia aplicación mediante `next/font` (autoalojada), sin cargar recursos de Google en producción. Se declara una pila de respaldo.
- **Formas:** esquinas de 14 a 24 px, sombras suaves, tarjetas con brillo superior. Un solo sistema de botones (principal, secundario, peligro), de campos y de insignias de estado.
- **Contraste:** el texto debe cumplir WCAG AA (4,5:1 en texto normal, 3:1 en texto grande). En el prototipo el texto blanco sobre la tarjeta naranja no lo cumple; en la aplicación se usa texto oscuro sobre naranja o un naranja más profundo. Los estados (alerta, bloqueo, éxito) conservan colores distinguibles y nunca dependen solo del color: llevan icono o texto.
- **Limpieza:** las capas de tema anteriores de `src/app/ui.css` que choquen con el nuevo sistema se eliminan, incluidas las reglas con `!important` que lo impidan. `globals.css` se reduce a lo imprescindible.

## Estructura y componentes

- **Menú lateral y barra superior:** `WorkspaceShell` conserva su contenido. En pantallas de hasta 900 px el menú pasa a un panel desplegable con botón de menú, fondo oscurecido y cierre al elegir una opción, mediante un componente cliente nuevo. Se mantiene la apertura del menú en la sección activa que hoy hace `sidebar-menu.tsx`.
- **Componentes de servidor nuevos (sin librería de gráficos):** tarjeta de indicador, lista de barras y dona en SVG, con etiquetas accesibles y valores en texto.
- **Textos con "Arka Litigios IAG":** la frase exacta se elimina de las cuatro apariciones:
  - Rótulo de la bandeja: "Gestión documental".
  - Registro de Institución Educativa: la frase queda sin esa mención.
  - Tarjeta de sesión activa del login y lista de accesos de administración, cuando la cuenta no tiene IE: se muestra "Acceso global".
- **Cambio de "Arka" a "Lexcon" en textos visibles** (solo cadenas de interfaz, no identificadores internos):

| Texto actual | Texto nuevo |
|---|---|
| Administración Arka | Administración Lexcon |
| Administrador Arka | Administrador Lexcon |
| Equipo jurídico Arka | Equipo jurídico Lexcon |
| Registrar abogado Arka, Nuevo abogado Arka, Editar abogado Arka | Registrar, Nuevo y Editar abogado Lexcon |
| Abogado Arka, abogados Arka | Abogado Lexcon, abogados Lexcon |
| "abogado Arka" en los mensajes de estado del proceso | "abogado Lexcon" |
| "administración Arka" en la nota de servicio finalizado de una IE | "administración Lexcon" |

Alcance de ese cambio: las 20 apariciones de "Arka" en `src/` (13 archivos), incluidas las 4 de "Arka Litigios IAG". Estas últimas no se sustituyen por "Lexcon": se eliminan como se describe en la lista anterior a la tabla. Quedan fuera los identificadores (`ARKA_ADMIN`, `ARKA_ATTORNEY`), los nombres de rol y descripciones en la base de datos, y los correos y contraseñas de las cuentas de demostración locales: la etiqueta que se muestra cambia, el valor interno no. Los registros de auditoría ya guardados conservan su texto original; los nuevos usan "Lexcon".

## Bandeja de trabajo

Cuatro tarjetas de colores con datos reales: procesos registrados, instituciones con procesos, procesos sin responsable jurídico y actuaciones bloqueadas. Los dos últimos conteos ya existen en `getAdminControlCenter()`; los otros se calculan de `listProcessesFor(user)`. Debajo, barras de procesos por IE y dona de procesos con y sin responsable jurídico. Después, la lista de pendientes que ya existe. No se incluye un gráfico semanal.

## Adaptabilidad

- Cortes en 1180, 900 y 600 px. Hasta 1180 px el menú se estrecha; hasta 900 px pasa a panel desplegable; hasta 600 px las tarjetas pasan a una columna cuando hace falta.
- Botones, opciones de menú y campos con al menos 44 px de alto en pantallas táctiles; campos de 16 px para evitar el zoom automático en iPhone.
- Ninguna pantalla produce desplazamiento horizontal. Las tablas anchas y los bloques de código se desplazan dentro de su propio contenedor.
- En celular se omiten desenfoques y animaciones de fondo continuas para cuidar la batería.

## Brillo al pasar el cursor

Todo botón, tarjeta, opción de menú y campo se ilumina al pasar el cursor: sube unos píxeles, aumenta el brillo y muestra un borde y un halo de color. Se activa solo en dispositivos con puntero (`@media (hover: hover)`), se acompaña de un estado de foco visible para el teclado y se desactiva con `prefers-reduced-motion`. Esta parte no estaba en el prototipo aprobado; se añade a petición de la persona.

## Fases

Cada fase se prueba antes de iniciar la siguiente.

1. Base visual (variables, fuente, botones, campos, insignias), `WorkspaceShell` con panel desplegable, pantallas de acceso (inicio de sesión, activación, olvidé mi contraseña, definir contraseña) y bandeja de trabajo.
2. Mi cuenta y Usuarios y accesos, que crea o modifica el diseño del acceso del administrador.
3. Resto de pantallas, una por una: procesos por IE, detalle del proceso, instituciones, equipo jurídico, asignaciones, alertas, registro de actuaciones y las de Rector, Apoyo IE y Abogado.

## Pruebas

- Comprobación visual con capturas a 390, 820, 1280 y 1440 px de cada pantalla modificada, sin desborde horizontal ni texto recortado.
- `tsc --noEmit` y la suite de `vitest`; se actualizan las pruebas que comparan los textos cambiados.
- Una prueba que falla si en `src/` reaparece "Arka Litigios IAG" o alguno de los textos visibles listados en la tabla.
- Comprobación de contraste de los pares de color de texto y fondo del tema.

## Documentación

Decisión `055`: sistema visual Esmeralda (sustituye la paleta de la 043) y fuente autoalojada con `next/font`. Actualizar `docs/architecture.md` (capa de presentación y componentes de servidor para indicadores), `docs/current-state.md` y `README.md` si cambian las instrucciones de uso. Las menciones de "Arka" en la documentación que describan textos de pantalla se actualizan; no se reescribe el historial de decisiones anteriores.

## Fuera de alcance

Gráfico de línea semanal, modo claro/oscuro seleccionable, nuevas pantallas distintas de Mi cuenta (diseño aparte), cambio de nombres de roles y de datos en la base de datos, y cualquier cambio de reglas jurídicas o de permisos.
