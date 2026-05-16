# ADP_DTM_FACT_Proyeccion

## Objetivo

Tabla de hechos de proyecciones de presupuesto. Registra los ajustes al presupuesto original (reformas presupuestales) que permiten proyectar el costo final de cada ítem e insumo. Es la fuente para el análisis de desviaciones entre el presupuesto inicial y el costo proyectado a terminar.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Identificación del proyecto. |
| ADP_DTM_DIM_Items | Activa | N:1 | Ítem al que aplica la proyección. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo al que aplica la proyección. |
| ADP_DTM_DIM_Usuario | Activa | N:1 | Usuario que registró la proyección. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha de registro de la proyección. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado del documento de proyección. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a DIM_Items. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdReforma | ID Reforma | int | Id de la reforma presupuestal. | Identifica la reforma que genera el ajuste. |
| SkIdUsuario | ID Usuario | int | Id de relación para Usuario. | Llave foránea a DIM_Usuario. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha (registro). | Llave foránea a DIM_Fecha. |
| SkIdFecha Real | ID Fecha Real | int | Id de relación para Fecha real de ejecución. | Llave foránea a DIM_Fecha. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Cantidad | Cantidad | numeric | Cantidad proyectada del insumo. | Cantidad ajustada en la reforma. |
| Valor Unitario | Valor Unitario | money | Valor unitario de la proyección. | Precio unitario proyectado. |
| Valor Total | Valor Total | money | Valor total de la proyección. | Resultado de Cantidad × Valor Unitario. |
| Origen | Origen | varchar | Origen de la proyección. | Indica si la proyección es manual o generada por el sistema. |
| Causa | Causa | int | Código de la causa del ajuste. | Código de referencia de la causa de la reforma. |
| Cantidad Item | Cantidad Ítem | numeric | Cantidad del ítem en la proyección. | Cantidad a nivel de ítem, no de insumo. |
| Descripcion Causa | Descripción Causa | varchar | Descripción de la causa del ajuste. | Texto explicativo de por qué se realiza la proyección. |
| Ajuste Global | Ajuste Global | tinyint | Indica si es un ajuste global (1) o particular (0). | Permite identificar reformas que afectan todo el presupuesto. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Reforma Presupuestal**: Cada proyección está asociada a una reforma (`SkIdReforma`) que agrupa múltiples ajustes aprobados en un mismo acto administrativo.
- **Valor Total**: Se calcula como `Cantidad × Valor Unitario`. En los reportes se debe usar esta columna como la métrica principal.
- **Ajuste Global**: Cuando es 1, indica que la reforma afecta de manera proporcional a todos los ítems del presupuesto.

## Casos de Uso

- Análisis de Presupuesto Proyectado vs. Presupuesto Inicial por proyecto.
- Seguimiento de reformas presupuestales aprobadas.
- Proyección del costo final (EAC - Estimate at Completion).
