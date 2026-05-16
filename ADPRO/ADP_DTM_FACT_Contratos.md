# ADP_DTM_FACT_Contratos

## Objetivo

Tabla de hechos de contratos. Registra los contratos firmados con terceros (contratistas) para la ejecución de actividades e ítems del presupuesto. Permite el análisis de compromisos contractuales por proyecto, tercero y tipo de contrato.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que pertenece el contrato. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Contratista del contrato. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo o recurso contratado. |
| ADP_DTM_DIM_Items | Activa | N:1 | Ítem del presupuesto vinculado al contrato. |
| ADP_DTM_DIM_TipoContrato | Activa | N:1 | Tipo de contrato. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado del contrato. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero. | Llave foránea a DIM_Tercero. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a DIM_Items. |
| SkIdTipoContrato | ID Tipo Contrato | int | Id de relación para TipoContrato. | Llave foránea a DIM_TipoContrato. |
| SKIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Clase Contrato | Clase Contrato | varchar | Clase del contrato: Generales, Por Grupos, Todo Costo. | Determina la modalidad de ejecución y medición. |
| No. Contrato | Número Contrato | int | Número del contrato en ADPRO. | Identificador de negocio del contrato. |
| Cantidad Inicial | Cantidad Inicial | numeric | Cantidad pactada en el contrato original. | Base de comparación contra modificaciones. |
| Cantidad | Cantidad Vigente | numeric | Cantidad vigente del contrato (incluye modificaciones). | Cantidad actual contratada. |
| Valor Unitario | Valor Unitario | numeric | Valor unitario pactado. | Precio por unidad del insumo o ítem contratado. |
| Valor Iva | Valor IVA | numeric | Valor del IVA del contrato. | IVA calculado sobre el valor neto. |
| Valor Total | Valor Total (Con IVA) | numeric | Valor total del contrato incluyendo IVA. | Compromiso total del contrato. |
| Valor Contrato Sin IVA | Valor Contrato Neto | numeric | Valor total del contrato sin IVA. | Base para el control de costos netos. |
| Valor Contrato | Valor Contrato | numeric | Valor del contrato (puede diferir de Valor Total por adiciones). | Informativo. |

## Reglas de Negocio

- **Clase Contrato**: La clase determina cómo se generan las actas de cobro. Los tipos son: **Generales** (por actividad), **Por Grupos** (agrupados), **Todo Costo** (incluye todos los recursos).
- **Cantidad Vigente vs. Inicial**: La diferencia entre ambas refleja adiciones o disminuciones al contrato original.
- **Valor Total**: Es la métrica principal para el seguimiento de compromisos. Incluye IVA.

## Casos de Uso

- Análisis del valor contratado por contratista y proyecto.
- Comparativo de contratos asegurados vs. presupuesto en `FACT_ControlProyecto`.
- Seguimiento del estado de los contratos (Activo, Liquidado, Anulado).
