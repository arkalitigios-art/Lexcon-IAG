# 041. Publicación contractual, recibos a satisfacción y liquidación

## Contexto

La aprobación jurídica prepara el contrato y el Acta de inicio, pero no equivale a la firma de los intervinientes, la publicación institucional ni al inicio material de la ejecución. La IE debe conservar esos soportes antes de registrar entregas o pagos. Cuando existen pagos parciales, la liquidación solo procede después del recibido final.

## Decisión

`CONTRACTUAL_APPROVED` lleva el expediente a `CONTRACTUAL_PUBLICATION`. Rectoría y el funcionario autorizado descargan los dos Word aprobados y, para habilitar `EXECUTION`, registran una declaración institucional de firma y publicación en SECOP II. El contrato firmado, el Acta de inicio firmada, la constancia de publicación y una referencia de SECOP son soportes opcionales que se conservan cuando la IE los carga.

Durante `EXECUTION`, cada recibido parcial queda en `SATISFACTORY_RECEIPT_PARTIAL` y conserva la fase abierta. El `SATISFACTORY_RECEIPT_FINAL` avanza a `LIQUIDATION_REVIEW` y crea el Acta de liquidación. El abogado asignado la revisa y puede aprobarla o solicitar correcciones. Solo la aprobación avanza a `POSTCONTRACTUAL`, donde la IE descarga el acta, confirma que fue firmada y puede cargar `LIQUIDATION_ACT_SIGNED` de forma opcional; entonces el expediente queda cerrado.

## Consecuencias

El expediente conserva una ruta auditable desde la aprobación jurídica hasta la liquidación sin afirmar que LEXCON firma, publica o sustituye el reglamento de la IE. Los documentos usan los fundamentos generales de Ley 715 de 2001, Ley 1150 de 2007 y Decreto 1075 de 2015, mientras que el reglamento institucional sigue definiendo los requisitos específicos.
