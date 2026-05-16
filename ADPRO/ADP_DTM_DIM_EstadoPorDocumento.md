# ADP_DTM_DIM_EstadoPorDocumento

## Objetivo

Dimensión de estados de documentos ADPRO. Permite identificar el estado de aprobación o procesamiento de cada tipo de documento transaccional (contratos, actas, anticipos, devoluciones, compras, notas en valor).

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_Contratos | Activa | 1:N | Estado del contrato. |
| ADP_DTM_FACT_Acta | Activa | 1:N | Estado del acta. |
| ADP_DTM_FACT_Compras | Activa | 1:N | Estado de la orden de compra. |
| ADP_DTM_FACT_Anticipo | Activa | 1:N | Estado del anticipo. |
| ADP_DTM_FACT_Devoluciones | Activa | 1:N | Estado de la devolución. |
| ADP_DTM_FACT_NotasEnValor | Activa | 1:N | Estado de la nota en valor. |
| ADP_DTM_FACT_Pedidos | Activa | 1:N | Estado del pedido. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdEstado | ID Estado | Int | Id del estado del documento. | Llave primaria de la dimensión. |
| Descripcion Estado | Estado | Varchar | Descripción del estado del documento. | Nombre del estado (ej. Aprobado, Anulado, En proceso). |
| Tipo Documento | Tipo Documento | Varchar | Tipo de documento al que aplica el estado: Contratos, Actas, Anticipos, Devoluciones, Compras, Notas En Valor. | Permite filtrar estados por tipo de transacción. |
| Empresa | Empresa | Varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Granularidad por Tipo**: Los estados son específicos por tipo de documento. Un mismo código de estado puede tener distinto significado entre tipos de documento.
- **Filtrado Operativo**: En los reportes se deben excluir documentos con estados de anulación para los totales financieros.
