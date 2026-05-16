# ADP_DTM_FACT_Acta

## Objetivo

Tabla de hechos de actas de contratos. Registra las actas de cobro generadas por los contratistas contra los contratos vigentes. Cada acta representa una facturación parcial o total de los trabajos ejecutados, incluyendo descuentos por anticipo, retenciones y garantías.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que pertenece el acta. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha del acta. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado del acta. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo cobrado en el acta. |
| ADP_DTM_DIM_Items | Activa | N:1 | Ítem del presupuesto cobrado en el acta. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha. | Llave foránea a DIM_Fecha. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a DIM_Items. |
| Porcentaje Anticipo | % Anticipo | Smallmoney | Porcentaje de anticipo amortizado en el acta. | Se aplica como descuento al valor bruto del acta. |
| Valor Anticipo | Valor Anticipo | Decimal | Valor del anticipo amortizado en el acta. | Monto descontado por amortización de anticipo. |
| Porcentaje Retencion Anticipo | % Retención Anticipo | Smallmoney | Porcentaje de retención sobre el anticipo. | Informativo. |
| Valor Retencion Anticipo | Valor Retención Anticipo | Decimal | Valor de retención sobre el anticipo. | Monto retenido de la amortización del anticipo. |
| Porcentaje Retencion Garantia | % Retención Garantía | Smallmoney | Porcentaje de retención de garantía. | Se aplica como fondo de garantía de cumplimiento. |
| Valor Retencion Garantias | Valor Retención Garantías | Decimal | Valor de la retención de garantía. | Monto retenido como garantía de cumplimiento. |
| Valor Descuentos | Valor Descuentos | Decimal | Total de descuentos aplicados al acta. | Suma de todas las deducciones al valor bruto. |
| Valor Total Neto | Valor Total Neto | Decimal | Valor a pagar al contratista después de descuentos. | Métrica de pago efectivo al contratista. |
| Valor Iva Total | Valor IVA Total | Decimal | Valor total del IVA del acta. | IVA calculado sobre el valor bruto del acta. |
| Valor Total Acta | Valor Total Acta | Decimal | Valor bruto total del acta antes de descuentos. | Valor base para el cálculo de descuentos y retenciones. |
| No Factura | Número Factura | Varchar | Número de factura del contratista. | Referencia del documento fiscal del contratista. |
| Cantidad Acta | Cantidad Acta | Numeric | Cantidad ejecutada cobrada en el acta. | Cantidad de unidades de obra o insumo en el acta. |
| Valor Unitario | Valor Unitario | Numeric | Valor unitario pactado. | Precio unitario del ítem o insumo en el acta. |
| Valor Iva Unitario | Valor IVA Unitario | Numeric | Valor de IVA por unidad. | IVA por unidad del ítem o insumo. |
| Valor Total | Valor Total Línea | Numeric | Valor total de la línea del acta (sin descuentos). | Resultado de Cantidad × Valor Unitario. |
| No Contrato | Número Contrato | int | Número del contrato asociado al acta. | Referencia de negocio hacia el contrato origen. |
| Tipo Acta | Tipo Acta | varchar | Tipo de acta: Anticipos, Por grupos, Generales, Todo costo, Devoluciones. | Determina la lógica de cálculo del acta. |

## Reglas de Negocio

- **Valor Neto de Pago**: El valor efectivamente pagado al contratista es `Valor Total Neto`, resultado de restar del `Valor Total Acta` todos los descuentos, amortizaciones y retenciones.
- **Tipo Acta**: El tipo determina si el acta corresponde a un desembolso de anticipo, una medición de avance o una devolución.
- **Relación con Contratos**: Toda acta debe estar vinculada a un contrato existente en `FACT_Contratos` a través del `No Contrato`.

## Casos de Uso

- Control de pagos a contratistas por proyecto.
- Seguimiento de retenciones y garantías pendientes de liberar.
- Análisis de la amortización de anticipos.
