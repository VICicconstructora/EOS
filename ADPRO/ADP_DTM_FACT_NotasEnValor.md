# ADP_DTM_FACT_NotasEnValor

## Objetivo

Tabla de hechos de notas en valor de almacén. Registra ajustes en valor (sin movimiento físico de inventario) sobre las transacciones de almacén. Permite corregir diferencias de precio o aplicar descuentos retroactivos en las operaciones de compra.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la empresa. |
| ADP_DTM_DIM_Tercero | Activa | N:1 | Tercero relacionado con la nota. |
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Proyecto al que aplica la nota. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Fecha de la nota. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Insumo al que aplica el ajuste. |
| ADP_DTM_DIM_EstadoPorDocumento | Activa | N:1 | Estado de la nota. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdTercero | ID Tercero | int | Id de relación para Tercero. | Llave foránea a DIM_Tercero. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha. | Llave foránea a DIM_Fecha. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a DIM_Insumo. |
| SkIdEstado | ID Estado | int | Id de relación para Estado. | Llave foránea a DIM_EstadoPorDocumento. |
| Nota Numero | Número Nota | int | Número de la nota en ADPRO. | Identificador de negocio de la nota. |
| Total devolucion | Total Nota | money | Valor total del ajuste en valor. | **Métrica principal**. Puede ser positivo o negativo. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Sin Movimiento Físico**: A diferencia de las devoluciones, las notas en valor no mueven inventario físico; solo ajustan el valor contabilizado.
- **Ajuste de Precio**: Generalmente se utilizan cuando el precio negociado con el proveedor difiere del precio de la orden de compra original.
- **Total devolucion**: El nombre del campo es heredado del sistema; en la práctica representa el total del ajuste en valor (puede ser una nota débito o crédito).

## Casos de Uso

- Ajuste del costo de inventario por diferencias de precio.
- Registro de bonificaciones o penalidades en valor de proveedores.
- Conciliación del costo real de compra vs. valor de entrada inicial.
