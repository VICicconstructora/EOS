# Dimensión: ADP_DTM_DIM_Empresa

Esta dimensión identifica la entidad legal o empresa a la que pertenecen los datos del Datamart.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| Todas las tablas FACT y DIM | Activa | 1:N | Filtro de nivel superior para datos multicompañía. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación contra las otras tablas. | Llave primaria técnica para las relaciones. |
| NombreEmpresa | Nombre Empresa | varchar | Nombre de la empresa. | Razón social de la empresa. |
| Nit | NIT | varchar | Nit de la empresa. | Identificador tributario principal. |
| Direccion | Dirección | varchar | Dirección de la empresa. | Dirección de la sede principal. |
| Ref_IdEmpresa | ID Empresa Origen | smallint | Id original de la empresa de la base de datos origen. | Referencia de trazabilidad hacia el sistema fuente. |
| Ref_BdConfServidor | Orden BD Servidor | smallint | Orden de ejecución por base de datos. | Controla el orden de procesamiento en entornos multiservidor. |

## Reglas de Negocio

1. **Multicompañía**: El modelo está diseñado para soportar múltiples empresas, aunque actualmente el foco principal es **IC CONSTRUCTORA S A S**.
2. **Filtrado Global**: Generalmente se utiliza como un filtro de nivel superior en dashboards consolidados.
3. **Referencia Origen**: Las columnas `Ref_IdEmpresa` y `Ref_BdConfServidor` permiten la trazabilidad hacia el sistema transaccional origen.

## Uso en el Modelo

- **Contextualización**: Asegura que los datos financieros se atribuyan correctamente a la entidad legal correspondiente.
- **Relaciones**: Conecta con todas las tablas del modelo a través de `SkIdEmpresa`.
