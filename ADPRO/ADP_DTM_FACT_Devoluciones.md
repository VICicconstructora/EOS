# ADP_DTM_FACT_Devoluciones

## Objetivo

Tabla de hechos de devoluciones de entradas de almacén. Registra la devolución de materiales al proveedor por calidad, exceso de inventario u otras causas. Revierte parcial o totalmente el efecto de una entrada de almacén en el inventario.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto que realiza la devolución. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Proveedor al que se devuelve el material. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo devuelto. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha de la devolución. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado de la devolución. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero (Proveedor). | Llave foránea a DIM_Tercero. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha de la devolución. | Llave foránea a DIM_Fecha. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Devolucion Numero | Número Devolución | int | Número de la devolución en ADPRO. | Identificador de negocio de la devolución. |
| Remision | Remisión | varchar | Número de remisión de la devolución. | Referencia del documento de despacho de la devolución. |
| Salida Descuento | Tiene Descuento | varchar | Indica si aplica descuento en la devolución. | Informativo. |
| Total | Total Devolución | money | Valor total de la devolución. | **Métrica principal**. Reduce el inventario valorizado. |
| Devolucion Factura | Factura Devolución | varchar | Número de factura de la nota crédito del proveedor. | Referencia del documento fiscal de la devolución. |

## Reglas de Negocio

- **Efecto en Inventario**: Una devolución reduce el stock del insumo en la bodega del proyecto.
- **Relación con Entradas**: Toda devolución debe estar vinculada a una entrada previa en `FACT_EntradasAlmacen`.
- **Total**: El valor de la devolución debe reflejarse como un crédito que reduce el costo del insumo en el proyecto.

## Casos de Uso

- Control de calidad: identificar proveedores con mayor tasa de devoluciones.
- Ajuste del inventario valorizado por proyecto.
- Seguimiento de notas crédito pendientes de proveedor.
