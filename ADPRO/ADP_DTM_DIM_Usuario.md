# ADP_DTM_DIM_Usuario

## Objetivo

Dimensión de usuarios del sistema ADPRO. Permite identificar y segmentar las transacciones por el usuario que las registró, facilitando auditorías y análisis de actividad por persona dentro de la organización.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_Proyeccion | Activa | 1:N | Identificación del usuario que registró la proyección. |
| ADP_DTM_FACT_Anticipo | Activa | 1:N | Identificación del usuario que registró el anticipo. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | Smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| SkIdUsuario | ID Usuario | Int | Id del usuario. | Llave primaria de la dimensión. |
| Nombre | Nombre | Varchar | Nombre del usuario. | Nombre completo o de sesión del usuario en ADPRO. |
| Cargo | Cargo | Varchar | Cargo del usuario. | Informativo. |
| Nivel Acceso | Nivel de Acceso | Varchar | Nivel de acceso del usuario al sistema. | Informativo. |
| Estado | Estado | Varchar | Estado del usuario (Activo/Inactivo). | Permite filtrar usuarios vigentes. |
| Empresa | Empresa | Varchar | Nombre de la empresa. | Informativo. |

## Reglas de Negocio

- **Trazabilidad**: Esta dimensión es clave para auditorías de quién registró cada documento en el sistema.
- **Estado**: Solo los usuarios con estado **Activo** tienen acceso operativo al sistema ADPRO.
