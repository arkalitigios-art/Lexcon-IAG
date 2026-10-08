# 030. Evaluación automática de ofertas para contratación inferior a 20 SMLMV

## Contexto

La Institución Educativa necesita que LEXCON IAG analice las ofertas recibidas dentro del expediente y produzca un acta sustantiva. Dejar todos los campos como pendientes no permitía identificar la oferta habilitada de menor precio ni reflejaba la evaluación jurídica, técnica y financiera solicitada.

## Decisión

El acta se rotula como contratación de cuantía inferior a 20 SMLMV. El motor evalúa cada archivo de oferta con reglas reproducibles:

- requisitos jurídicos: localiza los soportes exigidos y no los da por cumplidos cuando el propio archivo declara que no fueron adjuntados;
- requisitos técnicos: contrasta cada especificación y cantidad con la matriz del estudio de mercado vinculada al expediente;
- requisitos financieros y económicos: verifica valores unitarios, IVA, subtotal, total, consistencia aritmética y presupuesto de referencia. Los indicadores financieros adicionales solo se exigen cuando aparecen de forma expresa en la invitación.

Una propuesta queda habilitada solo si cumple las tres verificaciones. Entre las habilitadas, el motor identifica la de menor valor total. Si ninguna cumple, el acta informa el resultado y no identifica una oferta elegible. Rectoría debe registrar el cierre sin selección; esa transición cierra el expediente y no habilita carta de aceptación, contratación, RP ni ejecución.

## Consecuencias

La evaluación deja evidencia concreta de cada requisito y de las razones de incumplimiento. La identificación automática no crea aceptación contractual ni adjudicación: Rectoría conserva la aprobación institucional del acta y la actuación posterior de decisión de selección.
