# ADP_DTM_FACT_InventarioResumido

## Objetivo

Tabla de hechos de movimientos de inventario resumido. Consolida todos los tipos de movimiento de almacén (entradas, salidas, devoluciones, traslados, etc.) en una sola tabla con una clasificación por tipo de movimiento. Permite un análisis integral del comportamiento del inventario sin necesidad de cruzar múltiples tablas de hechos.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha del movimiento. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que pertenece el movimiento. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo que se mueve. |

## Tipos de Movimiento

| Código Tipo | Descripción |
|---|---|
| AI | Ajuste de Inventario |
| AP | Ajuste de Precio |
| DO | Devolución de Obra |
| DP | Devolución a Proveedor |
| DR | Devolución de Reintegro |
| DV | Devolución de Venta |
| EB | Entrada de Bodega |
| ED | Entrada de Donación |
| EE | Entrada por Existencias |
| EN | Entrada por Nota en Valor |
| EP | Entrada por Pedido / Compra |
| SA | Salida a Administración |
| SB | Salida a Bodega |
| SP | Salida por Pedido |
| TE | Traslado Entrada |
| TS | Traslado Salida |
| VD | Venta Directa |
| VT | Venta a Tercero |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha del movimiento. | Llave foránea a DIM_Fecha. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| Tipo | Tipo Movimiento | varchar | Código del tipo de movimiento (ver tabla de tipos arriba). | Clasificación del movimiento. Crítico para filtros analíticos. |
| Documento | Número Documento | bigint | Número del documento que generó el movimiento. | Identificador de negocio para trazabilidad. |
| Bodega | Código Bodega | int | Código de la bodega involucrada en el movimiento. | Identifica la bodega de origen o destino. |
| Cantidad | Cantidad | numeric | Cantidad de insumo movilizado. | Positivo para entradas, negativo para salidas según convención. |
| Unitario Neto | Valor Unitario Neto | numeric | Valor unitario del insumo sin IVA. | Costo neto por unidad. |
| Valor Iva | Valor IVA | numeric | Valor del IVA del movimiento. | IVA aplicado al movimiento. |
| Unitario | Valor Unitario Total | numeric | Valor unitario del insumo incluyendo IVA. | Costo total por unidad con impuesto. |
| Total | Valor Total Movimiento | numeric | Valor total del movimiento. | **Métrica principal**. Resultado de Cantidad × Unitario. |

## Reglas de Negocio

- **Tabla Consolidada**: Esta tabla es la fuente primaria para análisis de inventario ya que consolida todos los tipos de movimiento en una sola vista.
- **Convención de Signos**: Los movimientos de entrada generan cantidades y valores positivos; los de salida generan cantidades y valores negativos. Verificar la convención en ADPRO antes de construir medidas.
- **Tipo**: Es el campo de segmentación más importante. Todos los análisis deben filtrar o segmentar por `Tipo` para evitar doble conteo.
- **Saldo de Inventario**: El saldo actual de inventario para un insumo y proyecto se calcula como `SUM(Total)` agrupado sin filtrar por `Tipo`.

## Casos de Uso

- Kardex de inventario: movimientos cronológicos de un insumo por proyecto.
- Saldo de inventario valorizado a una fecha de corte.
- Análisis de rotación de inventario por tipo de movimiento.
- Cuadre entre movimientos físicos y valorización contable.
