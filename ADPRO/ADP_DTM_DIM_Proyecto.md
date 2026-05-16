# ADP_DTM_DIM_Proyecto

## Objetivo

Dimensión central del modelo encargada de almacenar el catálogo de proyectos y macroproyectos de la constructora. Permite filtrar y agrupar la información transaccional de costos, presupuestos y recursos (principalmente cruzando con tablas de hechos como ControlProyecto). Contiene los metadatos descriptivos, configuración tributaria (VIS) y ubicación jerárquica de cada obra o centro de operaciones.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_FACT_ControlProyecto | Activa | 1:N | Filtrar y agrupar los registros de costos, presupuestos y ejecución por proyecto. |
| Otras tablas FACT (Actas, Compras, etc.) | Activa | 1:N | Dimensionar los diferentes hechos transaccionales a nivel de proyecto. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdProyecto | ID Subrogado Proyecto | Int | Id de relación. | Llave primaria técnica para las relaciones. |
| Nombre Proyecto | Nombre Proyecto | varchar | Nombre del proyecto. | Nombre descriptivo del proyecto. |
| Clase Proyecto | Clase Proyecto | varchar | Clase a la cual pertenece. | Clasificación operativa o contable. |
| Tipo | Tipo | varchar | Tipo: ADPRO, CBR o Ambas. | Distingue el sistema de origen o aplicación del proyecto. |
| Estado | Estado | varchar | Estado: Presupuesto, Inactivo, Finalizado, En ejecución. | Informativo, no suele usarse como filtro principal. |
| Presupuesto Fijo | Presupuesto Fijo | Char | Si tiene presupuesto fijo o no. | Informativo. |
| Propietario | Propietario | varchar | Propietario del proyecto. | Informativo. |
| Sucursal | Código Sucursal | smallint | Código de la sucursal. | Suele ser equivalente al proyecto en el análisis. |
| Sucursal Nombre | Sucursal | varchar | Nombre de la sucursal. | Proyecto y Sucursal son equivalentes en el análisis. |
| MacroProyecto | ID Macroproyecto | varchar | Código del macro proyecto. | Un macroproyecto agrupa varios proyectos/sucursales. |
| MacroProyecto Descripcion | Macroproyecto | varchar | Descripción del macro proyecto. | Nivel más alto de agrupación para filtros en reportes. |
| Centro Costo | Código Centro de Costo | varchar | Código del centro de costo. | Varias sucursales pueden estar asociadas a un mismo centro de costos. |
| Centro Costo Descripcion | Centro de Costo | varchar | Descripción del centro de costo. | Nombre descriptivo del centro de costos. |
| VIS | Es VIS | Char | El proyecto es de tipo VIS (SI o NO). | Filtro crítico para diferenciar configuración tributaria. |
| Sucursal Administrativa | Sucursal Administrativa | varchar | Descripción de la sucursal administrativa. | Informativo. |
| SkIdEmpresa | ID Empresa | smallint | Id de relación por empresa. | Llave foránea a DIM_Empresa. |
| Empresa | Empresa | nvarchar | Nombre de la empresa. | Informativo. |
| Codigo Proyecto | Código Proyecto | Texto | Llave de negocio o código interno en el ERP. | Identificador usado por los usuarios de negocio. |
| Ciudad | Ciudad | Texto | Ciudad donde se desarrolla el proyecto. | Agrupación geográfica. |
| Fecha De Inicio | Fecha de Inicio | Fecha | Fecha de arranque del proyecto. | Informativo. |
| Fecha De Finalizacion | Fecha de Fin | Fecha | Fecha estimada de término. | Informativo. |
| PorcentajeAdministracion | % Administración | Decimal | Porcentaje A del esquema A.I.U. | Informativo. |
| PorcentajeImprevistos | % Imprevistos | Decimal | Porcentaje I del esquema A.I.U. | Informativo. |
| PorcentajeUtilidad | % Utilidad | Decimal | Porcentaje U del esquema A.I.U. | Informativo. |

## Medidas DAX

- **Total Proyectos Activos**:
  `CALCULATE(COUNTROWS(ADP_DTM_DIM_Proyecto), ADP_DTM_DIM_Proyecto[Estado] = "En ejecucion")`

- **Total Macroproyectos**:
  `DISTINCTCOUNT(ADP_DTM_DIM_Proyecto[MacroProyecto Descripcion])`

## Reglas de negocio

- **Jerarquía espacial-financiera**: Un **Macroproyecto** agrupa múltiples **Proyectos**. Un **Proyecto** es homólogo a una **Sucursal**. Múltiples sucursales/proyectos pueden cargar presupuestos y ejecuciones a un mismo **Centro de Costos**.
- **Impuestos y exenciones**: La clasificación `VIS` define un tratamiento tributario y de costos particular, convirtiéndolo en un corte crítico de la información a nivel de portafolio.
- **Filtros Globales**: Los análisis parten siempre desde el nivel de `MacroProyecto` y profundizan hacia el `Proyecto`.

## Validaciones

- Verificar que no existan valores nulos o en blanco en `SkIdProyecto` ni en `Codigo Proyecto`.
- Asegurar que la relación uno-a-muchos (1:N) con `ADP_DTM_FACT_ControlProyecto` mantenga integridad referencial (proyectos huérfanos).

## Recomendaciones

- **Limpieza de Modelo**: Eliminar en Power Query las columnas informativas vacías antes de cargar el modelo.
- **Ocultar columnas técnicas**: Ocultar las llaves subrogadas (`SkIdProyecto`) y campos ID para los usuarios de negocio.
- **Crear Jerarquía explícita**: Crear una jerarquía llamada "Portafolio de Proyectos" estructurada como Macroproyecto > Proyecto > Centro de Costo.
