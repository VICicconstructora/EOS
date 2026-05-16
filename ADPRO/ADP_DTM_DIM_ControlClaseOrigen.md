# ADP_DTM_DIM_ControlClaseOrigen

## Objetivo

Dimensión de orígenes de control. Clasifica las transacciones de `FACT_ControlProyecto` según su clase (naturaleza del costo) y origen (tipo de documento que generó el registro). Es la clave para segmentar el ciclo de vida del costo en el modelo: Presupuesto, Proyección, Asegurado, Consumido e Invertido.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_ControlProyecto | Activa | 1:N | Clasificación del tipo y origen de cada registro de costo. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdClaseOrigen | ID Clase Origen | Smallint | Id de relación. | Llave primaria de la dimensión. |
| Clase | Código Clase | Char | Código de la clase de control. | Código corto que identifica la clase. |
| Clase Descripcion | Clase | Varchar | Descripción de la clase. | Nombre de la etapa del costo (ej. Presupuesto, Invertido). |
| Origen | Código Origen | Varchar | Tipo de documento origen: Actas, Nomina, Cuentas Control, Traslados Ajustes. | Indica la fuente documental que generó el registro. |
| Origen Descripcion | Origen | Varchar | Descripción del origen del documento. | Nombre descriptivo del tipo de documento origen. |

## Reglas de Negocio

- **Clase**: Define la etapa del ciclo de vida del costo. Los valores documentados son: Presupuesto Inicial, Proyección, Asegurado, Consumido e Invertido.
- **Origen**: Determina el tipo de documento que generó el registro. Los orígenes conocidos son: Actas, Nomina, Cuentas Control y Traslados Ajustes.
- Esta dimensión es crítica para la construcción de medidas DAX que separen el presupuesto de la ejecución real.
