# ADP_DTM_DIM_TipoContrato

## Objetivo

Dimensión de tipos de contrato. Clasifica los contratos según su modalidad de ejecución y pago, permitiendo segmentar el análisis de compromisos contractuales por naturaleza.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_Contratos | Activa | 1:N | Clasificación del tipo de cada contrato. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdTipoContrato | ID Tipo Contrato | Int | Id del tipo de contrato. | Llave primaria de la dimensión. |
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| Tipo Codigo | Código Tipo | varchar | Código del tipo de contrato. | Código de referencia en ADPRO. |
| Tipo Descripcion | Tipo Contrato | varchar | Descripción del tipo de contrato. | Nombre descriptivo (ej. Por Administración, Por Precio Fijo). |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Tipo de Contrato**: Determina las reglas de facturación y medición de avance aplicables a cada contrato.
- El tipo de contrato se relaciona directamente con la clase de acta que se puede generar (ver `ADP_DTM_FACT_Acta`).
