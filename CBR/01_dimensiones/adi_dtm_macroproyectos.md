# `adi_dtm_macroproyectos`

> **Power BI:** `ADI_DTM MacroProyectosMc`  ·  **Rol:** Dimensión  ·  **Filas:** 9  ·  **Columnas:** 19

## Propósito

Catálogo de macroproyectos. Sirve como la unidad geográfica o conceptual de más alto nivel dentro del negocio. 

## Reglas de Negocio (¡IMPORTANTE!)

*   **Definición de Macroproyecto vs. Proyecto:** A nivel comercial y operativo en CBR, el **Macroproyecto** equivale a lo que comercialmente se llama una **Ubicación o Proyecto Global**. Las tablas hijas de **Proyectos** (`adi_dtm_proyectos`) en realidad contienen **Etapas o Subetapas** del Macroproyecto.
*   **Filtros de Pruebas o Inactividad:** **NO se deben aplicar filtros excluyendo nombres de prueba ni datos inactivos a nivel de macroproyecto**. El 100% de la información contenida en esta tabla corresponde a ubicaciones reales. Si existen personas desistidas / inactivos, esa validación se maneja a nivel de las transacciones (ej: en tablas de desistimientos), no ocultando el macroproyecto.
*   **Filtro por Estado (`macestado`):** Por ahora, **ignorar este campo**. No se utiliza en la toma de decisiones ni en los reportes globales.
*   **Sociedades y Empresas (`macsociedadnombre`, `macnombreempresa`):** Representan la constructora o entidad legal que controla el proyecto. Aunque una constructora puede tener varias empresas y se podría usar como filtro, en la práctica es un componente **poco relevante** para la reportería del día a día.

## Columnas clave

- `maccodigomacro` — PK lógica del macroproyecto.
- `macnombremacro` — Nombre comercial del macroproyecto la "Ubicación".

## Relaciones

_Sin FKs salientes._

**Referenciada por (FKs entrantes):**

- `adi_dtm_proyectos.prycodmacroproy` → `adi_dtm_macroproyectos` — Cada proyecto (etapa) pertenece a un macroproyecto.

## Preguntas típicas que responde

- ¿Cuántos macroproyectos (ubicaciones reales) hay activos?
- ¿Cuál es el ranking de macroproyectos por valor de venta?
- ¿Qué subetapas (proyectos) pertenecen a un macroproyecto X?

## Esquema completo (19 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `maccodigomacro` | `int4` | No |
| 2 | `macnombremacro` | `varchar` | Sí |
| 3 | `macciudad` | `varchar` | Sí |
| 4 | `macsociedadnombre` | `varchar` | Sí |
| 5 | `maccodigosociedad` | `varchar` | Sí |
| 6 | `mactelefono` | `varchar` | Sí |
| 7 | `macdireccion` | `varchar` | Sí |
| 8 | `machorarioatencion` | `varchar` | Sí |
| 9 | `maccodigoempresa` | `varchar` | Sí |
| 10 | `macnombreempresa` | `varchar` | Sí |
| 11 | `macidregional` | `int4` | Sí |
| 12 | `macnombreregional` | `varchar` | Sí |
| 13 | `macidsupermacroproyecto` | `int4` | Sí |
| 14 | `macnombresupermacroproyecto` | `varchar` | Sí |
| 15 | `macgerentenombre` | `varchar` | Sí |
| 16 | `macgerenteidentificacion` | `varchar` | Sí |
| 17 | `macgerenteexpidentificacion` | `varchar` | Sí |
| 18 | `macgerentecargo` | `varchar` | Sí |
| 19 | `macestado` | `int2` | Sí |

---

[← Volver al índice](../README.md)