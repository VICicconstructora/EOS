# ADP_DTM_FACT_Anticipo

## Objetivo

Tabla de hechos de anticipos de almacén. Registra los anticipos entregados a proveedores y contratistas para garantizar el suministro de materiales o la ejecución de servicios. Permite el seguimiento de la amortización de anticipos a través del ciclo de actas y compras.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que pertenece el anticipo. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Tercero beneficiario del anticipo. |
| ADP_DTM_DIM_Fecha | Activa (Anticipo) | N:1 | Fecha de registro del anticipo. |
| ADP_DTM_DIM_Fecha | Activa (Pago) | N:1 | Fecha de pago del anticipo. |
| ADP_DTM_DIM_Usuario | Activa | N:1 | Usuario que registró el anticipo. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado del anticipo. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero. | Llave foránea a DIM_Tercero. |
| SkIdFechaAnticipo | ID Fecha Anticipo | int | Id de la fecha de registro del anticipo. | Llave foránea a DIM_Fecha. |
| SkIdFechaPago | ID Fecha Pago | int | Id de la fecha de pago efectivo del anticipo. | Llave foránea a DIM_Fecha. |
| SkIdUsuario | ID Usuario | int | Id de relación para Usuario. | Llave foránea a DIM_Usuario. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Anticipo Numero | Número Anticipo | int | Número del anticipo en ADPRO. | Identificador de negocio del anticipo. |
| Porcentaje Amortizado | % Amortizado | float | Porcentaje del anticipo amortizado a la fecha. | Indica qué proporción del anticipo ha sido descontada en actas. |
| Valor Anticipo | Valor Anticipo | money | Valor total del anticipo entregado. | Monto desembolsado al tercero. **Métrica principal**. |
| Factura | Factura | varchar | Número de factura asociada al anticipo. | Referencia del documento fiscal. |

## Reglas de Negocio

- **Amortización**: El anticipo se descuenta gradualmente en cada acta a través del campo `Porcentaje Anticipo` de `FACT_Acta`. El `Porcentaje Amortizado` en esta tabla refleja el estado acumulado.
- **Saldo Pendiente**: El saldo del anticipo por recuperar se calcula como `Valor Anticipo × (1 - Porcentaje Amortizado / 100)`.

## Casos de Uso

- Control de anticipos entregados y pendientes de amortizar.
- Análisis de saldo de anticipos por proyecto y tercero.
- Verificación de que todos los anticipos queden amortizados al cierre del proyecto.
