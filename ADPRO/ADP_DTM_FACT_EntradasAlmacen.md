# ADP_DTM_FACT_EntradasAlmacen

## Objetivo

Tabla de hechos de entradas de almacén. Registra el ingreso físico de materiales e insumos a las bodegas de los proyectos, vinculando cada entrada con su orden de compra y proveedor. Es la fuente para el análisis del inventario recibido y la liquidación de órdenes de compra.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto que recibe el material. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo recibido. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Proveedor que entrega el material. |
| ADP_DTM_DIM_Fecha | Activa (Compra) | N:1 | Fecha de la orden de compra relacionada. |
| ADP_DTM_DIM_Fecha | Activa (Entrada) | N:1 | Fecha de entrada física al almacén. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdFechaCompra | ID Fecha Compra | int | Id de la fecha de la orden de compra. | Llave foránea a DIM_Fecha. |
| SkIdFechaEntrada | ID Fecha Entrada | int | Id de la fecha de entrada al almacén. | Llave foránea a DIM_Fecha. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero (Proveedor). | Llave foránea a DIM_Tercero. |
| Entrada Estado | Estado Entrada | varchar | Estado de la entrada de almacén. | Informativo (ej. Aprobada, Anulada). |
| Total Entrada | Total Entrada | money | Valor total de la entrada incluyendo IVA. | **Métrica principal** para valorar el inventario recibido. |
| Entrada Numero | Número Entrada | int | Número de la entrada en ADPRO. | Identificador de negocio de la entrada. |
| Remision | Remisión | varchar | Número de remisión del proveedor. | Referencia del documento de despacho del proveedor. |
| Compra Numero | Número Compra | int | Número de la orden de compra relacionada. | Vínculo con `FACT_Compras`. |
| Compra Total Pagar | Total a Pagar Compra | decimal | Total a pagar por la compra asociada. | Referencia del valor comprometido en la compra. |
| Entrada Factura | Factura Proveedor | varchar | Número de factura del proveedor. | Referencia del documento fiscal del proveedor. |
| Entrada Cantidad | Cantidad Entrada | numeric | Cantidad de insumo recibido. | Unidades físicas ingresadas al almacén. |
| Entrada Valor Iva | Valor IVA Entrada | money | Valor del IVA de la entrada. | IVA calculado sobre el valor neto recibido. |
| Entrada Valor Sin Iva | Valor Neto Entrada | money | Valor de la entrada sin IVA. | Base para el control de costos netos. |
| Bodega codigo | Código Bodega | varchar | Código de la bodega receptora. | Identifica la bodega física que recibe el material. |
| Bodega Descripcion | Bodega | varchar | Descripción de la bodega receptora. | Nombre de la bodega. |

## Reglas de Negocio

- **Relación con Compras**: Cada entrada debe estar vinculada a una orden de compra en `FACT_Compras` a través de `Compra Numero`.
- **Total Entrada**: Es la métrica principal para la valoración del inventario recibido. Incluye IVA.
- **Bodega**: Permite el análisis de stock por bodega física dentro de cada proyecto.

## Casos de Uso

- Control de recepciones de material por proveedor y proyecto.
- Liquidación de órdenes de compra (comparativo comprado vs. recibido).
- Análisis de inventario valorizado por bodega.
