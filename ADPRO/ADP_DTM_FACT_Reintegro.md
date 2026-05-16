# ADP_DTM_FACT_Reintegro

## Objetivo

Tabla de hechos de reintegros de proyecto de almacén. Registra la devolución de materiales desde los frentes de trabajo al almacén del proyecto. Representa el reverso de una salida de almacén cuando el material no fue utilizado o queda sobrante.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto que realiza el reintegro. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Tercero que devuelve el material al almacén. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo reintegrado. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha del reintegro. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero. | Llave foránea a DIM_Tercero. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha del reintegro. | Llave foránea a DIM_Fecha. |
| Numero Reintegro | Número Reintegro | int | Número del reintegro en ADPRO. | Identificador de negocio del reintegro. |
| Remision | Remisión | varchar | Número de remisión del reintegro. | Referencia del documento de movimiento. |
| Cantidad | Cantidad | decimal | Cantidad de insumo reintegrado al almacén. | Unidades físicas devueltas al stock. |
| Valor Unitario | Valor Unitario | money | Valor unitario del insumo al momento del reintegro. | Costo promedio ponderado al momento del reintegro. |
| Valor Total | Valor Total | money | Valor total del reintegro. | **Métrica principal**. Aumenta el inventario valorizado. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Efecto en Inventario**: Un reintegro aumenta el stock del insumo en la bodega del proyecto. Revierte el efecto de una salida anterior.
- **Impacto en Costo**: Reduce el costo consumido del ítem al que estaba asociada la salida original.
- **Diferencia con Devolución**: El reintegro es una devolución interna (de obra al almacén del proyecto), mientras que la devolución es externa (del proyecto al proveedor).

## Casos de Uso

- Control de sobrantes de material por frente de trabajo.
- Optimización del inventario disponible en bodega.
- Análisis del costo consumido neto (salidas menos reintegros).
