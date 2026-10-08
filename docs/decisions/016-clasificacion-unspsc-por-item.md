# 016. Clasificación UNSPSC por ítem del estudio de mercado

## Contexto

La clasificación de un estudio de mercado debe permitir identificar cada bien o servicio y su código, no resumirse en un párrafo general.

## Decisión

La generación del estudio produce una fila por cada ítem comparable con descripción, código UNSPSC, clase y unidad de medida. El motor reconoce las familias de papelería, papel, suministros para impresoras y publicaciones impresas. Si una descripción no coincide con una familia determinable, conserva la clasificación institucional registrada o la marca como pendiente de clasificación; no inventa un código.

## Consecuencias

La tabla es legible y verificable en el Word y en la vista documental. Una futura integración con un catálogo UNSPSC ampliado puede sustituir el mapeo determinista sin cambiar la estructura del documento.
