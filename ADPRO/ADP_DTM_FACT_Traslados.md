# ADP_DTM_FACT_Traslados

## Objetivo

Tabla de hechos de traslados entre proyectos. Registra los movimientos de inventario entre proyectos: la salida de material de un proyecto y la entrada correspondiente en otro. Permite controlar el flujo de recursos compartidos entre obras.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto (Traslado) | Activa | N:1 | Proyecto origen que despacha el material. |
| ADP_DTM_DIM_Proyecto (Entrada) | Activa | N:1 | Proyecto destino que recibe el material. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo trasladado. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto Traslado | ID Proyecto Origen | int | Id del proyecto que envía el material. | Llave foránea a DIM_Proyecto (lado salida). |
| SkIdProyecto Entrada | ID Proyecto Destino | int | Id del proyecto que recibe el material. | Llave foránea a DIM_Proyecto (lado entrada). |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| Numero Traslado | Número Traslado | bigint | Número del documento de traslado (salida). | Identificador de negocio del movimiento de salida. |
| Cantidad Traslado | Cantidad Traslada | decimal | Cantidad de insumo enviada desde el proyecto origen. | Unidades físicas despachadas. |
| Valor Unitario Traslado | Valor Unitario Traslado | money | Valor unitario del insumo en el proyecto origen. | Costo promedio del proyecto origen al momento del traslado. |
| Valor Total Traslado | Valor Total Traslado | money | Valor total del traslado (lado salida). | **Métrica principal** del costo trasladado desde el origen. |
| Numero Entrada Traslado | Número Entrada Traslado | bigint | Número del documento de entrada en el proyecto destino. | Identificador del movimiento de entrada en el proyecto receptor. |
| Cantidad Entrada Traslado | Cantidad Recibida | decimal | Cantidad de insumo recibida en el proyecto destino. | Debe coincidir con Cantidad Traslado. |
| Unitario Entrada Traslado | Valor Unitario Recibido | money | Valor unitario del insumo en el proyecto destino. | Puede diferir del origen por ajuste de costos promedio. |
| Total Entrada Traslado | Valor Total Recibido | money | Valor total recibido en el proyecto destino. | Valoración del material en el inventario del proyecto receptor. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Doble Registro**: Cada traslado genera dos movimientos en el inventario: una salida en el proyecto origen y una entrada en el proyecto destino. Esta tabla consolida ambos lados.
- **Cuadre de Cantidades**: La `Cantidad Traslado` debe ser igual a la `Cantidad Entrada Traslado`. Diferencias indican inconsistencias en el registro.
- **Diferencias en Valor**: El `Valor Unitario Traslado` y el `Unitario Entrada Traslado` pueden diferir si el costo promedio del proyecto destino se recalcula al recibir el material.
- **Impacto en ControlProyecto**: Los traslados se reflejan en `FACT_ControlProyecto` como origen "Traslados Ajustes" para ambos proyectos.

## Casos de Uso

- Control de materiales compartidos entre proyectos.
- Verificación del cuadre entre lo enviado y lo recibido.
- Análisis del impacto de traslados en el costo de cada proyecto.
