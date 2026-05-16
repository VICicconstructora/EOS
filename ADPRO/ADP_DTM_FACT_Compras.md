# ADP_DTM_FACT_Compras

## Objetivo

Tabla de hechos de compras. Registra las órdenes de compra emitidas a proveedores para el abastecimiento de materiales e insumos de los proyectos. Permite el análisis del gasto de compras por proveedor, insumo y proyecto.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que aplica la compra. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Proveedor de la compra. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo comprado. |
| ADP_DTM_DIM_Items | Activa | N:1 | Ítem del presupuesto al que aplica la compra. |
| ADP_DTM_DIM_Fecha | Activa (Compra) | N:1 | Fecha de la orden de compra. |
| ADP_DTM_DIM_Fecha | Activa (Entrega) | N:1 | Fecha de entrega pactada. |
| ADP_DTM_DIM_Fecha | Activa (Cierre) | N:1 | Fecha de cierre de la orden. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado de la orden de compra. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero (Proveedor). | Llave foránea a DIM_Tercero. |
| SkIdFechaCompra | ID Fecha Compra | int | Id de la fecha de la orden de compra. | Llave foránea a DIM_Fecha. |
| SkIdFechaEntrega | ID Fecha Entrega | int | Id de la fecha de entrega pactada. | Llave foránea a DIM_Fecha. |
| SkIdFechaCierre | ID Fecha Cierre | int | Id de la fecha de cierre de la orden. | Llave foránea a DIM_Fecha. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a DIM_Items. |
| Compra No | Número Compra | int | Número de la orden de compra. | Identificador de negocio de la orden de compra. |
| Cantidad Comprada | Cantidad Comprada | decimal | Cantidad de insumo comprada. | Cantidad ordenada al proveedor. |
| Valor Unitario | Valor Unitario | numeric | Precio unitario pactado con el proveedor. | Base para el cálculo del valor total. |
| IVA | IVA | money | Valor del IVA de la compra. | IVA calculado sobre el valor neto. |
| Descuento | Descuento | money | Valor del descuento aplicado. | Descuento negociado con el proveedor. |
| Valor Neto | Valor Neto | numeric | Valor de la compra sin IVA. | Base para el control de costos netos. |
| Valor IVA | Valor IVA Total | numeric | Valor total del IVA de la orden. | Informativo. |
| Valor Total | Valor Total | numeric | Valor total de la orden incluyendo IVA. | **Métrica principal** para el análisis de compras. |

## Reglas de Negocio

- **Valor Total**: Es la métrica principal para el análisis de compromisos de compra. Incluye IVA.
- **Relación con Pedidos**: Cada compra puede estar relacionada con uno o más pedidos de proyecto.
- **Relación con Entradas**: Cada compra se liquida con las entradas de almacén registradas en `FACT_EntradasAlmacen`.

## Casos de Uso

- Análisis del gasto de compras por proveedor y proyecto.
- Comparativo de precios entre proveedores para el mismo insumo.
- Seguimiento del estado de órdenes de compra pendientes de entrega.
