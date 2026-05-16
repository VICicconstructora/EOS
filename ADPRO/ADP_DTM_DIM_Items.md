# ADP_DTM_DIM_Items

## Objetivo

Define el catálogo de actividades o unidades de obra del presupuesto. Representa los diferentes ítems de construcción sobre los cuales se asignan recursos y se mide el avance físico y financiero.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_ControlProyecto | Activa | 1:N | Vinculación del costo transaccional con la actividad presupuestal. |

## Estructura de Jerarquía

A diferencia de otros modelos, la jerarquía de Capítulos e Ítems en esta dimensión no depende de tablas externas de niveles, sino que está codificada y estructurada dentro de la columna **`Item No`**. Los reportes deben agrupar por esta columna para reflejar la estructura del presupuesto original.

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdItems | ID Ítem | Int | Id del ítem. | Llave primaria subrogada. |
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdAPU | ID APU | Int | Id del APU. | Identificador del Análisis de Precios Unitarios asociado. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |
| Item No | Código de Ítem | varchar | Número del ítem en el presupuesto. | **Eje principal** para la estructura de capítulos. |
| SubCapitulo | SubCapítulo | varchar | Subcapítulo asignado. | Informativo (No es llave de relación). |
| Item Descripcion | Actividad / Ítem | varchar | Descripción del ítem. | Nombre de la unidad de obra. |
| Cantidad | Cantidad Presupuesto | numeric | Cantidad en presupuesto. | Referencial al presupuesto maestro; para ejecución real consultar FACT_ControlProyecto. |
| Valor Sin IVA | Costo Presupuesto | numeric | Valor total del ítem. | Valor base de la actividad. Informativo. |
| Precio Venta | Precio de Venta | Money | Precio de venta configurado. | Informativo. |
| Codigo Cliente | Código Cliente | varchar | Código asignado del cliente. | Informativo. |

## Reglas de Negocio

- **Jerarquía**: La lógica de agrupación de capítulos debe derivarse del **Item No**.
- **Campos Obsoletos**: Las columnas `Item estado`, `Metro cuadrado` y `SubCapitulo` (para propósitos de relación) no deben ser consideradas para lógica de cálculo o filtrado crítico.
- **Cantidades**: Las columnas de `Cantidad` y `Valor Sin IVA` en esta tabla son referenciales al presupuesto maestro; para análisis de ejecución real se debe consultar `FACT_ControlProyecto`.

## Medidas DAX Sugeridas

- **Conteo de Actividades**: `Total Actividades = COUNTROWS('ADP_DTM_DIM_Items')`

## Recomendaciones

- Dado el volumen de ítems (~32,000), se recomienda utilizar filtros por `Item No` para facilitar la búsqueda en los visuales de Power BI.
- Ocultar las columnas de bloqueo para simplificar la experiencia del usuario final si no son requeridas expresamente para auditoría.
