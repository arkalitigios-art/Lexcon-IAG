# LEXCON IAG

## Estado de la demostración local

El proyecto implementa una aplicación privada local para contratación FSE de Instituciones Educativas Oficiales: acceso por contraseña y rol, SQLite con migraciones, almacenamiento local privado, worker separado y pruebas. La experiencia disponible dirige a cada usuario a su espacio autorizado y habilita el primer recorrido real de la IE: apertura de expediente mediante una o varias cotizaciones de mercado.

## Inicio local

Requiere Node.js 24 o posterior. En PowerShell, desde la carpeta del proyecto:

```powershell
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

En otra terminal, para el worker:

```powershell
corepack pnpm worker --watch
```

La web se inicia en `http://localhost:3000`. La semilla crea únicamente cuentas e instituciones inequívocamente ficticias. Como se trata de una demostración local, la pantalla de acceso muestra las credenciales públicas de prueba de cada rol y permite seleccionarlas para completar el formulario.

| Rol | Cuenta ficticia local | Contraseña pública de prueba | Espacio disponible |
| --- | --- | --- | --- |
| Administrador Arka | `admin.arka@demo.invalid` | `ArkaAdmin.2026` | Seguimiento institucional y asignación de abogado. |
| Abogado Arka | `abogado.arka@demo.invalid` | `ArkaAbogada.2026` | Expedientes asignados. |
| Rector / ordenador | `rector.horizonte@demo.invalid` | `Rectoria.2026` | Expedientes de la IE y apertura desde cotizaciones. |
| Funcionario autorizado IE | `apoyo.rioclaro@demo.invalid` | `ApoyoRio.2026` | Expedientes de la IE y apertura desde cotizaciones. |

Una vez iniciada, rectoría o el funcionario autorizado de la IE puede cargar el reglamento institucional vigente y después cargar una o varias cotizaciones para abrir un expediente. Antes de aprobar el estudio de mercado puede agregar nuevas cotizaciones o eliminar las cargadas por error, incluso todas si las va a reemplazar; mientras no tenga ninguna, el expediente queda pendiente de nuevas cotizaciones y no expone un borrador jurídico. Cada cambio recalcula el análisis automáticamente. La versión del reglamento queda vinculada a nuevos expedientes; una versión posterior no modifica un expediente abierto. Si no hay reglamento aplicable, LEXCON conserva las cotizaciones y deja bloqueada únicamente la etapa de mercado. El administrador Arka puede asignar un abogado al expediente; ese abogado solo puede consultar sus asignaciones.

La ficha del expediente guía las actuaciones documentales por fase y rol: revisión jurídica, CDP, publicación de la invitación, ofertas, evaluación institucional dentro del expediente, decisión de rectoría, formalización, ejecución y cierre. Después de la aprobación precontractual, Rectoría descarga el estudio previo o de conveniencia y la invitación pública aprobados, los publica por el canal previsto en su reglamento institucional y confirma esa publicación a LEXCON. La confirmación queda trazada con el actor, fecha y hora; el enlace o referencia es opcional y no requiere cargar capturas ni archivos. Cada transición exige una actuación humana autorizada y, cuando corresponde, los soportes privados cargados por la IE; LEXCON no publica, firma, recomienda una oferta ni decide por la institución. Durante la recepción de ofertas, la IE carga las ofertas con sus anexos y el acta de recibo como evidencia separada. Antes de descargar el Acta de evaluación de ofertas, Rectoría o apoyo institucional registra en el expediente los evaluadores y el supervisor, sin crear nuevas cuentas. El documento institucional no menciona la aplicación e incluye esos datos y las firmas. El comité puede pedir correcciones concretas para emitir una nueva versión o aprobar el acta para generar la versión definitiva descargable y publicable desde el mismo expediente. El acta corresponde a contratación de cuantía inferior a 20 SMLMV y usa la estructura de los modelos institucionales —identificación de proponente, requisitos jurídicos, evaluación técnica, financiera y económica por ítem, consolidado, conclusión, observaciones y firmas—. La aplicación lee de forma integral los DOCX y PDF con texto seleccionable de cada oferta y extrae proponente, identificación tributaria, representante, anexos, ítems, IVA, subtotal y total antes de evaluar. Un soporte que no pueda localizarse automáticamente queda como **pendiente de verificación del comité**; solo la falta declarada de un anexo o un incumplimiento comprobable se presenta como no cumple. El resultado consolidado se presenta después de las evaluaciones individuales. La aprobación institucional del acta sigue siendo necesaria antes de la decisión de selección. Cuando ninguna oferta resulta habilitada, Rectoría registra el cierre sin selección y la aplicación bloquea carta de aceptación, contratación, RP y ejecución. No se requiere crear cuentas ni contraseñas para cada comité.

El Acta de evaluación no designa al proponente seleccionado. Si el comité no tiene observaciones, identifica expresamente una oferta habilitada y la aplicación genera un **Acta de selección de oferente** con la motivación y los espacios de firma exclusivos de sus integrantes; no contiene nombres ni firmas de Rectoría, pagaduría o supervisión. Rectoría o apoyo institucional descarga, firma y vuelve a cargar esa acta desde la fase **Decisión**; solo entonces se habilita la **Comunicación de aceptación de oferta**. Después de cargar el Registro Presupuestal (RP), se generan el contrato y el Acta de inicio para revisión exclusiva de la abogada Arka. Rectoría y el funcionario institucional no pueden ver ni descargar esos documentos hasta que la abogada los apruebe. La abogada puede dejar instrucciones de corrección o cargar un Word corregido del contrato, del Acta de inicio o de ambos; la última versión jurídica queda privada hasta la aprobación y es la que podrá descargar la IE. El contrato se denomina según el objeto, por ejemplo, **Contrato de suministro No. 001 de 2026**, **Contrato de prestación de servicios** o **Contrato de mantenimiento**, y usa el supervisor registrado por la IE junto con el comité. El Word desarrolla considerandos enumerados y treinta cláusulas: los títulos principales van centrados y en negrita, mientras que el rótulo de cada cláusula queda en negrita dentro de su párrafo justificado. El Acta de inicio solo se emite con requisitos de ejecución cumplidos, sin casillas pendientes o por verificar. La aplicación conserva las decisiones, el acta firmada y el RP en el expediente, sin reemplazar la firma ni la decisión institucional.

La aprobación jurídica abre la fase de **publicación contractual**, no la ejecución. Rectoría o el funcionario autorizado descargan el contrato y el Acta de inicio aprobados, confirman que fueron firmados y publicados en SECOP II; pueden adjuntar los documentos y la constancia de publicación, y la referencia o enlace de SECOP queda registrado cuando se informa. Solo entonces se habilita la ejecución. La IE registra un **recibido a satisfacción parcial** por cada pago parcial y el expediente continúa abierto; cuando incorpora el **recibido a satisfacción final**, LEXCON genera el **Acta de liquidación del contrato** para revisión jurídica. El abogado la descarga, aprueba o solicita correcciones. Solo después de la aprobación pasa a la etapa poscontractual, donde la IE la descarga, obtiene las firmas, confirma la suscripción y puede cargar la versión firmada de forma opcional para cerrar el expediente. LEXCON conserva los soportes y la trazabilidad, pero no firma ni publica en nombre de la IE. Cada actuación genera una alerta interna y correo de respaldo para el siguiente responsable; cuando el usuario autoriza las alertas de dispositivo, la aplicación web instalada entrega una notificación push sin usar WhatsApp ni plantillas pagas.

Cuando el comité registra el cierre sin selección por falta de propuestas habilitadas, la ficha cerrada ofrece el Word **Acta de cierre y declaratoria de desierto**. Este documento contiene considerandos, cuadro de evaluación, decisión motivada, orden de incorporación al expediente físico y digital, y firmas institucionales. La decisión y el registro documental se conservan en la base de datos.

Al recibir cotizaciones con reglamento aplicable, LEXCON IAG extrae texto de PDF con texto seleccionable y DOCX, registra los ítems, la tarifa de IVA, el total y el tratamiento informado del impuesto que puede verificar, incluso cuando una fuente indica que una tarifa está excluida, y calcula comparabilidad solo cuando encuentra la misma descripción y cantidad en al menos dos cotizaciones. Con esa evidencia redacta automáticamente el objeto, una clasificación preliminar, el análisis de demanda y oferta y las condiciones económicas del estudio; rectoría solo agrega complementos opcionales si dispone de información que no aparece en los documentos. El Word descargable presenta un encabezado de la IE y el FSE, considerandos, fundamentos jurídicos y normativos, identificación, objeto, una tabla de clasificación de cada ítem con su código UNSPSC, análisis de oferta y demanda, fuentes, metodología, matriz comparativa con el valor unitario base, el IVA informado, su tratamiento y los totales de los ítems comparables por cotización, presupuesto, conclusión, ciudad, fecha y firma del rector u ordenador del gasto. El presupuesto solo calcula IVA cuando las fuentes comparables acreditan una misma tarifa y que está incluido en sus totales. El promedio se presenta redondeado al peso; el rango permanece como información de dispersión. No recomienda una oferta ni adopta decisiones institucionales. Tras la aprobación jurídica, la aplicación genera y encola el correo de entrega para la IE; la ficha de rectoría confirma la aprobación, muestra el estado real de esa comunicación y dirige al cargue del CDP. Configure `LEXCON_EMAIL_DELIVERY_URL` para que el worker lo entregue a su proveedor de correo. Cuando el abogado solicita ajustes, LEXCON IAG conserva la instrucción, aplica las directivas de presentación inequívocas —por ejemplo, una tabla de cotizaciones comparadas—, reanaliza automáticamente la evidencia vigente y devuelve una nueva versión a revisión jurídica; si necesita evidencia nueva, la IE recibe la alerta correspondiente. Si una aprobación necesita una nueva lectura antes del CDP, el abogado asignado puede reabrir la revisión sin borrar la decisión ya registrada y luego aprobar o solicitar ajustes. Si un PDF escaneado, una imagen o un documento sin valores estructurables impide la lectura, conserva la evidencia y bloquea únicamente el estudio de mercado para que la IE cargue una versión legible. Al recibirse el CDP, genera el estudio previo o de conveniencia y la invitación pública para revisión jurídica; al entrar la abogada a la etapa precontractual, los ve antes de la actuación de decisión y puede descargar cada uno en Word. Ambos incluyen el número de CDP si puede extraerse de forma expresa del soporte; si no existe esa marca, el Word lo indica para que la IE complete el dato. También incluyen un cronograma que comienza el siguiente día hábil colombiano y respeta los mínimos de mínima cuantía para publicación, aviso Mipyme, ofertas y traslado del informe de evaluación. Los Word precontractuales se estructuran desde los modelos entregados: el estudio previo desarrolla considerandos, planeación, fundamento, necesidad, objeto, análisis del sector, metodología económica, CDP, requisitos, obligaciones, riesgos, garantías, supervisión, cronograma y cierre; la invitación desarrolla capítulos de participación, requisitos habilitantes, oferta económica, evaluación, ejecución, cronograma y anexos completos de oferta económica, presentación, inhabilidades y transparencia. La oferta económica incorpora identificación tributaria, vigencia, valores unitarios antes de IVA, tarifa y valor del IVA, total por ítem, totales y firma; los demás anexos incluyen identificación, declaraciones, compromisos y firma del proponente. La redacción contextualiza el sector del objeto, el propósito institucional, las condiciones de ejecución, las obligaciones y la evaluación a partir de la matriz y las cotizaciones; el reglamento vinculado es la fuente específica para completar las variables de cada IE; consecutivo, rubro, plazo, sede, canal, supervisor, garantías y tributos no se inventan cuando faltan. Cuando la IE no ha registrado un consecutivo, canal de recepción, dirección o plazo contractual, el documento lo marca para completar antes de publicar en vez de inventarlo. Esos documentos nunca sustituyen la aprobación humana.

El administrador Arka entra a una bandeja de trabajo que contiene únicamente expedientes con una actuación pendiente, como asignar responsable jurídico o revisar un bloqueo. La opción Todos los expedientes conserva el registro completo. Instituciones Educativas, equipo jurídico, alertas, accesos y trazabilidad se presentan en rutas separadas con tarjetas seleccionables; Registrar Institución Educativa y Registrar abogado Arka son también opciones independientes. Puede registrar, modificar o finalizar la relación de servicio de una IE con estado activo, suspendido por mora o finalizado; también puede registrar, modificar o desactivar abogados Arka. Esas operaciones se auditan y la finalización conserva la evidencia histórica en lugar de borrar registros. Al abrir un expediente, LEXCON asigna un consecutivo institucional persistente e independiente para cada IE, con formato `AAAA-####`; el mismo número aparece en los encabezados y anexos del estudio previo y la invitación pública. El número del CDP se extrae de su contenido rotulado o, si ese contenido solo repite la etiqueta, de un nombre de archivo con patrón `CDP-AAAA-####`; nunca se imprime la etiqueta `CDP` como si fuera el número del certificado.

Para verificar la infraestructura:

```powershell
corepack pnpm verify
corepack pnpm build
corepack pnpm worker:build
node scripts/sync-agent-guides.mjs --check
```

## Documentación

- `docs/architecture.md`: componentes, límites y flujo de datos.
- `docs/current-state.md`: funcionalidad disponible, limitaciones y próximos pasos.
- `docs/functional-model.md`: actores, reglas de operación, expediente y ciclo documental aprobado.
- `docs/superpowers/specs/2026-09-22-infraestructura-local-design.md`: diseño aprobado de la infraestructura local y sus límites.
- `docs/superpowers/plans/2026-09-22-infraestructura-local-plan.md`: etapas y comprobaciones para implementarla.
- `docs/superpowers/specs/2026-09-22-acceso-por-roles-y-recorrido-ie-design.md`: diseño aprobado del acceso por rol y el recorrido inicial de la IE.
- `docs/superpowers/plans/2026-09-22-acceso-por-roles-y-recorrido-ie-plan.md`: plan de implementación de ese incremento.
- `docs/data-model.md`: estructura relacional inicial y límites de integridad.
- `docs/decisions/`: decisiones técnicas numeradas.

## Guías y commits

`AGENTS.md` y `CLAUDE.md` deben permanecer idénticos. Ejecuta `node scripts/sync-agent-guides.mjs --check` para comprobarlas y `node scripts/sync-agent-guides.mjs --write` después de editar la guía principal.

Si el proyecto usa Git, activa el hook con:

```powershell
git config core.hooksPath .githooks
```



## Interfaz

La aplicación incorpora una consola visual IAG para sus espacios institucional, jurídico y administrativo. Presenta el rol, el estado del agente y las alertas sin cambiar las aprobaciones humanas ni el flujo contractual. En el espacio jurídico, la abogada primero selecciona una Institución Educativa asignada y, en una vista independiente, consulta los procesos de contratación autorizados para esa IE. Administración Arka también consulta los procesos primero por Institución Educativa, evitando que una misma IE se repita en el registro global.

## Base de datos multiinstitucional

La migración Supabase está preparada en `supabase/migrations/20261008193829_esquema_multiinstitucional.sql`, complementada por `supabase/migrations/20261008193841_endurecer_politicas_rls.sql`. Usa PostgreSQL, tablas y campos en español, RLS, bucket privado `expediente-privado`, hash de archivos y registros de auditoría. LEXCON IAG opera para varias Instituciones Educativas dentro del mismo proyecto; INEM de Montería será una de ellas. Cada IE cuenta con un rector u ordenador del gasto y un funcionario de apoyo institucional activos.

La base SSR de Auth usa la URL y la clave **publicable** de Supabase; son identificadores de cliente protegidos por RLS, no secretos. La clave de servicio es exclusivamente de servidor y nunca se expone con `NEXT_PUBLIC_`:

```powershell
# Requeridas por el cliente SSR y el proxy de sesión.
NEXT_PUBLIC_SUPABASE_URL=https://<id-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable>
# Requerida por tareas administrativas del servidor y el worker.
LEXCON_SUPABASE_URL=https://<id-proyecto>.supabase.co
LEXCON_SUPABASE_SERVICE_ROLE_KEY=<clave-solo-servidor>
# Solo en el entorno temporal de demostración, nunca en producción real.
LEXCON_ALLOW_DEMO_SEED=false
```

Con las cuatro variables de conexión configuradas y antes de ejecutar la aplicación de prueba, la semilla ficticia remota se habilita de forma expresa mediante `LEXCON_ALLOW_DEMO_SEED=true` y `corepack pnpm supabase:seed-demo`. Crea o actualiza cuatro cuentas, perfiles, roles y asignaciones ficticias. No la ejecute contra el entorno que contenga información institucional real. En Dokploy, defina esas variables como secretos del servicio antes de ejecutar el comando; en una consola local, expórtelas para esa única sesión sin guardarlas en el repositorio.

La migración `20261008200000_identidad_sesion_autenticada.sql` ya fue aplicada al proyecto remoto LEXCON IAG. Con las variables públicas configuradas, el acceso deja de usar la cookie local y las credenciales visibles de demostración; solo permite perfiles remotos activos con una asignación válida.

## Usuarios reales e invitaciones

Después de aplicar `20261010202843_gestionar_accesos_produccion.sql`, el Administrador crea cuentas desde **Usuarios y accesos**. LEXCON envía un enlace al correo de cada persona para que defina su contraseña; el Administrador no ve ni asigna contraseñas. Los roles disponibles son Administrador, Abogado, Rector y Apoyo IE. Rector y Apoyo requieren una Institución Educativa activa. Los integrantes del comité evaluador no tienen cuenta: solo se registran como información de cada proceso. Si un enlace vence o ya fue usado, la persona puede solicitar otro desde **¿Olvidó su contraseña?** en `/forgot-password`; la respuesta nunca confirma si el correo tiene cuenta.

Antes de crear la primera cuenta, configure un SMTP de producción, establezca `https://lexcon.arkaiag.com` como **Site URL** y permita `https://lexcon.arkaiag.com/**` en las URL de redirección de Supabase. En Dokploy defina también `LEXCON_APP_URL=https://lexcon.arkaiag.com`. El enlace de correo se procesa localmente en `/auth/confirm`, elimina su token temporal de la barra de direcciones y lleva a la persona a definir su contraseña. Para enviar la primera invitación, de forma temporal en una terminal con las variables privadas de Supabase disponibles:

```powershell
$env:LEXCON_BOOTSTRAP_ADMIN_EMAIL='arkaiag.co@gmail.com'
$env:LEXCON_BOOTSTRAP_ADMIN_NAME='Administrador'
corepack pnpm supabase:bootstrap-admin
```

No guarde esas variables ni las claves de Supabase en archivos versionados. La invitación inicial solo se debe ejecutar una vez; el script se detiene si ya existe un Administrador activo.

El esquema inicial ya fue desplegado en el proyecto Free multiinstitucional LEXCON IAG. Para aplicar cambios futuros, autentique la CLI de Supabase, enlace ese proyecto y ejecute:

```powershell
corepack pnpm dlx supabase@latest db push
```

Antes de cargar información real, pruebe el aislamiento RLS entre roles, la carga y descarga privada de un archivo de prueba, y la restauración manual de una copia de PostgreSQL y otra de Storage. La aplicación ya incluye sesión SSR, listados, fichas y apertura de expedientes con cotizaciones en Storage privado. El workflow, las actuaciones posteriores y el worker siguen en SQLite mientras se completa la migración. La actualización al mismo proyecto Pro queda definida para la primera IE cliente, límites operativos o necesidad de continuidad administrada. Consulte `docs/superpowers/specs/2026-10-08-despliegue-dokploy-y-produccion-supabase-design.md` para el modelo de migración y despliegue.

## Despliegue temporal en Dokploy

El repositorio contiene un `Dockerfile` y `.dockerignore` para publicar el servicio web sin base de datos ni volumen en el VPS. En Dokploy cree un servicio **Application**, seleccione el repositorio y la rama `main`, y elija el tipo de construcción **Dockerfile** con contexto `.` y archivo `Dockerfile`. Esta modalidad corresponde a un único servicio web; no se usa Compose porque no se despliegan una base de datos ni un worker en el VPS. En **Environment**, defina estos cuatro valores sin guardarlos en Git:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<id-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable>
LEXCON_SUPABASE_URL=https://<id-proyecto>.supabase.co
LEXCON_SUPABASE_SERVICE_ROLE_KEY=<clave-privada-de-servidor>
```

Las dos variables `NEXT_PUBLIC_` deben existir también durante la construcción de la imagen: defínalas en **Build-time Arguments** y repítalas en **Environment**. En la pestaña **Domains** agregue `lexcon.arkaiag.com`, con puerto interno `3000`, HTTPS y certificado Let's Encrypt; Dokploy administra el proxy automáticamente. Use solo cuentas y datos ficticios durante esta validación.

La carpeta local `/storage/` conserva los archivos privados del modo SQLite y permanece fuera de Git. El código de los adaptadores está en `src/platform/storage/` y sí debe versionarse para que la imagen de Dokploy pueda construir la aplicación.

El worker está omitido deliberadamente en este primer despliegue: aún depende de la cola SQLite y no debe ejecutarse en un contenedor efímero. No habilite datos institucionales reales hasta migrar y validar ese worker, el workflow restante, el aislamiento y la restauración de PostgreSQL y Storage.
