# Dimensión: ADP_DTM_DIM_Tercero

Esta dimensión contiene el maestro de terceros (proveedores, contratistas, clientes, etc.) que interactúan con la organización en ADPRO.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_ControlProyecto | Activa | 1:N | Categorización de costos por tercero. |
| ADP_DTM_FACT_Contratos | Activa | 1:N | Identificación del contratista. |
| ADP_DTM_FACT_Acta | Activa | 1:N | Identificación del tercero en actas. |
| ADP_DTM_FACT_Compras | Activa | 1:N | Identificación del proveedor en compras. |
| ADP_DTM_FACT_Anticipo | Activa | 1:N | Identificación del tercero en anticipos. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdTercero | ID Tercero | Int | Id de relación contra las otras tablas. | Llave primaria técnica para las relaciones. |
| Nombre | Nombre Tercero | nvarchar | Nombre del tercero. | Columna principal de visualización. |
| Nit | NIT | Varchar | NIT del tercero. | Campo de búsqueda principal para evitar duplicidades. |
| Contacto | Contacto | Varchar | Nombre personal del contacto del tercero. | Informativo. |
| Email | Correo Electrónico | Varchar | Correo electrónico del tercero. | Informativo. |
| Direccion | Dirección | Varchar | Dirección del tercero. | Informativo. |
| Telefono | Teléfono | Varchar | Contactos telefónicos del tercero. | Informativo. |
| Tipo | Tipo Tercero | String | Clasificación del tercero: **A** (Acreedor), **C** (Cliente), **P** (Proveedor). | Crítico para filtrar reportes de compras vs contratos. |
| Naturaleza | Naturaleza | String | Naturaleza del tercero: **N** (Natural), **J** (Jurídica). | Permite segmentaciones tributarias. |
| Estado | Estado | String | Estado actual del tercero (ej. Activo). | Informativo. |
| Ciudad | Ciudad | String | Ciudad de ubicación del tercero. | Agrupación geográfica. |

## Reglas de Negocio

1. **Jerarquía de Tipos**: La columna `Tipo` es crítica para filtrar reportes de compras vs contratos.
2. **Naturaleza**: Permite realizar segmentaciones tributarias o de cumplimiento según si el tercero es una persona natural o una empresa (jurídica).
3. **Calidad de Datos**: Se recomienda utilizar `Nit` como el campo de búsqueda principal para evitar duplicidades por variaciones en el nombre.

## Uso en el Modelo

- **Análisis de Cartera y Pagos**: Permite desglosar el costo ejecutado por beneficiario.
- **Relaciones**: Se conecta con las tablas de hechos transaccionales como `FACT_Compras`, `FACT_Contratos` y `FACT_Acta`.

## Jerarquías Sugeridas

- **Ubicación**: `Ciudad` > `Nombre`.
- **Segmentación**: `Tipo` > `Naturaleza` > `Nombre`.
