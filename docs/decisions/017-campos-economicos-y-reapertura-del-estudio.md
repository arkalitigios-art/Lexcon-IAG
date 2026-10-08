# 017. Campos económicos y reapertura del estudio de mercado

## Contexto

La matriz debe mostrar el IVA identificado por cada ítem y el valor total informado por cada cotización. Una aprobación jurídica ya registrada no puede desaparecer si se requiere volver a estudiar el documento.

## Decisión

Se conservan `total_value`, `tax_rate` y el tratamiento del IVA por ítem de cotización cuando el parser los identifica. La matriz presenta el valor unitario base, el IVA informado, si el total reportado lo incluye o no, y el total del ítem; su cierre muestra el total reportado por cada fuente. El IVA del presupuesto solo se estima si cada fuente comparable tiene la misma tarifa y confirma que el total informado lo incluye.

Un abogado asignado puede reabrir un estudio aprobado mientras el expediente está pendiente de CDP. La acción exige una razón, devuelve el expediente a mercado y mantiene la aprobación anterior en la trazabilidad. Después puede aprobar o solicitar correcciones mediante el flujo ordinario.

## Consecuencias

Los documentos nuevos y los que se vuelvan a analizar incorporan los campos económicos detectados. Si una cotización no discrimina IVA, total o tratamiento, se muestra como no identificado y no se infiere ni se mezcla con valores homogéneos.
