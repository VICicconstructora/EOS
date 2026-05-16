# ADP_DTM_FACT_SalidasAlmacen

## Objetivo

Tabla de hechos de salidas de almacén. Registra el despacho de materiales e insumos desde las bodegas del proyecto hacia los frentes de trabajo. Representa el costo consumido real (recursos salidos del inventario para ejecución de obra).

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto que despacha el material. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha de salida del almacén. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo despachado. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Tercero receptor del material. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdFechaSalida | ID Fecha Salida | int | Id de la fecha de salida del almacén. | Llave foránea a DIM_Fecha. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero. | Llave foránea a DIM_Tercero. |
| Salida Numero | Número Salida | numeric | Número de la salida de almacén. | Identificador de negocio de la salida. |
| Salida Remision | Remisión Salida | varchar | Número de remisión de la salida. | Referencia del documento de despacho interno. |
| Salida Usuario | Usuario Salida | nvarchar | Usuario que registró la salida. | Informativo para auditoría. |
| Bodega Codigo | Código Bodega | int | Código de la bodega origen del despacho. | Identifica la bodega de donde sale el material. |
| Bodega Descripcion | Bodega | varchar | Descripción de la bodega origen. | Nombre de la bodega. |
| Salida Descuento | Tiene Descuento | varchar | Indica si la salida tiene descuento (SI/NO). | Informativo. |
| Salida Cantidad | Cantidad Salida | numeric | Cantidad de insumo despachado. | Unidades físicas salidas del almacén. |
| Salida Valor Unitario | Valor Unitario Salida | numeric | Valor unitario del insumo al momento de la salida. | Costo promedio ponderado al momento del despacho. |
| Salida Valor Total | Valor Total Salida | money | Valor total de la salida. | **Métrica principal** del costo consumido. Resultado de Cantidad × Valor Unitario. |
| Salida Item | Ítem de Salida | varchar | Ítem del presupuesto al que se carga la salida. | Vincula el consumo con la actividad presupuestal. |
| Descuentos Cantidad | Cantidad con Descuento | numeric | Cantidad ajustada por descuento. | Informativo. |

## Reglas de Negocio

- **Costo Consumido**: Las salidas de almacén representan el estado **Consumido** en el ciclo del costo de `FACT_ControlProyecto`. Cada salida genera un registro con esa clasificación.
- **Valoración PROMEDIO**: El `Salida Valor Unitario` refleja el costo promedio ponderado del inventario al momento del despacho.
- **Trazabilidad**: El campo `Salida Item` vincula cada despacho con el ítem de presupuesto correspondiente.

## Casos de Uso

- Análisis del costo consumido por insumo, proyecto y período.
- Explosión de insumos: qué materiales se han despachado por ítem de presupuesto.
- Control de rotación de inventario por bodega.
