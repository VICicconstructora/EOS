# Dimensión: ADP_DTM_DIM_CapituloPresupuesto

Esta dimensión contiene el catálogo de capítulos de presupuesto definidos en ADPRO. Es fundamental para la segmentación del costo en el modelo de control de proyectos.

## Estructura de Datos

| Columna | Tipo de Dato | Descripción |
| :--- | :--- | :--- |
| **SkIdCapitulo** | Clave (PK) | Identificador único del capítulo en el Data Mart. |
| **SkIdEmpresa** | FK | Relación con la dimensión Empresa. |
| **Codigo Proyecto** | String | Código del proyecto al que pertenece el capítulo. |
| **Capitulo Numero** | String | Código numérico del capítulo (ej. 1, 2, 0). |
| **Capitulo Descripcion** | String | Nombre descriptivo del capítulo. |
| **Tipo Costo** | String | Clasificación del tipo de costo asociado. |
| **Tipo Costo Orden** | Integer | Ordenamiento lógico para reportes. |
| **Empresa** | String | Nombre de la empresa. |

## Reglas de Negocio

1. **Capítulo Comodín (0)**: El `Capitulo Numero = 0` actúa como un "comodín" para agrupar costos que no han sido asignados explícitamente a un capítulo de presupuesto en el origen (ej. Valores Comprados, Entradas No Asignadas).
2. **Diferenciación por Proyecto**: Un mismo código de capítulo puede repetirse en diferentes proyectos con significados o presupuestos distintos. Por lo tanto, la clave de negocio real es la combinación de `Codigo Proyecto` + `Capitulo Numero`.
3. **Jerarquía**: Se utiliza principalmente como el nivel superior de agrupación para los ítems de presupuesto (`DIM_Items`).

## Uso en el Modelo

- **Filtro Principal**: Se utiliza para segmentar el reporte de "Costo vs Presupuesto" por grandes categorías de obra (ej. Estructura, Cimentación, Acabados).
- **Relaciones**: Se conecta con `FACT_ControlProyecto` a través de `SkIdCapitulo`.

## Jerarquías Sugeridas

- **Estructura de Costo**: `Tipo Costo` > `Capitulo Descripcion`.
