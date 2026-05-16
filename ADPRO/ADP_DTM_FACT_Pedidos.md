# ADP_DTM_FACT_Pedidos

## Objetivo

Tabla de hechos de pedidos de proyecto. Registra las solicitudes de materiales e insumos generadas desde los proyectos hacia el área de compras. Permite el seguimiento del ciclo de abastecimiento desde la solicitud hasta la orden de compra.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto que genera el pedido. |
| ADP_DTM_DIM_Items | Activa | N:1 | Ítem del presupuesto al que aplica el pedido. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo solicitado. |
| ADP_DTM_DIM_Fecha | Activa (Pedido) | N:1 | Fecha de generación del pedido. |
| ADP_DTM_DIM_Fecha | Activa (Requerido) | N:1 | Fecha requerida de entrega. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado del pedido. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a DIM_Items. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdFechaPedido | ID Fecha Pedido | int | Id de la fecha de generación del pedido. | Llave foránea a DIM_Fecha. |
| SkIdFechaRequerido | ID Fecha Requerido | int | Id de la fecha requerida de entrega. | Llave foránea a DIM_Fecha. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Codigo Orden De Compra | Código Orden de Compra | int | Número de la orden de compra generada. | Vincula el pedido con la orden de compra en FACT_Compras. |
| Pedido Urgente | Pedido Urgente | char | Indica si el pedido es urgente (SI/NO). | Permite priorizar la gestión de compras. |
| Tipo Pedido | Tipo Pedido | varchar | Tipo: ADICIONAL, PRESUPUESTAL, TIPO SIN ASIGNAR. | Clasifica si el pedido está dentro o fuera del presupuesto original. |
| Empresa | Empresa | nvarchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Tipo Pedido ADICIONAL**: Pedido fuera del presupuesto original que requiere aprobación de reforma.
- **Tipo Pedido PRESUPUESTAL**: Pedido que tiene respaldo en el presupuesto aprobado.
- **Pedido Urgente**: Los pedidos urgentes deben gestionarse con prioridad en el ciclo de compras.

## Casos de Uso

- Análisis del ciclo de abastecimiento (días entre pedido y entrega).
- Identificación de pedidos adicionales no presupuestados.
- Control de pedidos urgentes por proyecto.
