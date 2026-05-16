# ADP_DTM_DIM_Insumo

## Objetivo

Esta dimensión contiene el catálogo maestro de recursos utilizados en la construcción y operación de los proyectos de **IC CONSTRUCTORA**. Clasifica cada recurso por su naturaleza (material, equipo, mano de obra) y permite el análisis detallado del costo por categorías.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_ControlProyecto | Activa | 1:N | Categorización de los costos transaccionales por tipo de recurso. |

## Jerarquías Recomendadas

Para la navegación en reportes (Drill-down), se debe utilizar la siguiente estructura:
1. **Naturaleza**: `Tipo Descripcion` (Ej: MATERIAL, EQUIPO, MANO DE OBRA).
2. **Familia**: `Agrupacion Descripcion` (Ej: ACEROS, CEMENTOS, ARRIENDO EQUIPO).
3. **Recurso**: `Insumo Descripcion` (Nombre detallado del insumo).

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| Empresa | Empresa | nvarchar | Nombre de la empresa. | Informativo. |
| SkIdInsumo | ID Insumo | Int | Id del insumo. | Llave primaria del catálogo. |
| Insumo Descripcion | Insumo | varchar | Descripción del insumo. | Nombre descriptivo del material o servicio. |
| Agrupacion | Código Agrupación | varchar | Id de la agrupación. | Código de referencia de la familia. |
| Agrupacion Descripcion | Agrupación | varchar | Descripción de la agrupación. | Usar para filtros de alto nivel. |
| Tipo | Código Tipo | Char | Id del tipo de insumo. | Código de referencia del tipo. |
| Tipo Descripcion | Tipo | varchar | Descripción del tipo de insumo. | Nivel superior de la jerarquía (Material, Mano de Obra, etc.). |
| Unidad | Sigla Unidad | varchar | Id de la unidad de medida. | Abreviatura de la medida (KG, M3, UND). |
| Descripcion Unidad | Unidad de Medida | varchar | Descripción de la unidad de medida. | Nombre completo de la unidad. |
| Estado | Estado | varchar | Estado actual del insumo. | Indica si el insumo está ACTIVO o INACTIVO. |
| Requiere Equipo | Requiere Equipo | varchar | Nivel de requerimiento del equipo. | Informativo. |
| Dias Reposicion | Días de Reposición | Int | Número de días de reposición. | Informativo para gestión de inventario. |
| SubAnalisis | Sub-análisis | Char | Permite asignarlo como Sub-análisis en APUs. | Informativo. |
| Devolutivo | Devolutivo | Char | Indica que es un insumo devolutivo. | No debe ser utilizado para lógica de negocio en el modelo actual. |
| Stock Maximo | Stock Máximo | Int | Cantidad máxima en inventario. | Informativo para gestión de inventario. |
| Stock Minimo | Stock Mínimo | Int | Cantidad mínima en inventario. | Informativo para gestión de inventario. |
| Valor Unitario | Costo Promedio | Money | Valor unitario antes de IVA. | Representa el **Costo Promedio** ponderado, no el último precio de compra. |
| Porcentaje IVA | % IVA | Float | Porcentaje de IVA configurado. | Informativo. |
| Valor Neto | Valor Neto | Money | Valor unitario incluido IVA. | Precio de referencia con impuesto. |

## Reglas de Negocio

- **Valoración**: La columna `Valor Unitario` en esta dimensión refleja el costo promedio en el inventario/sistema, no necesariamente el último precio de compra.
- **Exclusiones**: La columna `Devolutivo` no debe ser utilizada para lógica de negocio en el modelo actual.

## Medidas DAX Sugeridas

- **Conteo de Insumos**: `Total Insumos = COUNTROWS('ADP_DTM_DIM_Insumo')`
- **Insumos Activos**: `Insumos Activos = CALCULATE([Total Insumos], 'ADP_DTM_DIM_Insumo'[Estado] = "ACTIVO")`

## Recomendaciones

- Utilizar las columnas de **Descripción** para visualización y las de **Código** para ordenamiento si es necesario.
- Esta tabla es fundamental para reportes de "Explosión de Insumos" cruzando contra `FACT_ControlProyecto`.
