# Tabla: ADP_DTM_VFACT_ControlProyecto

Esta tabla es una **Vista de Hechos Denormalizada** (Flat Table) que consolida la información de la tabla de hechos central con sus dimensiones relacionadas en una sola estructura. Es ideal para análisis rápidos, exportaciones a Excel o herramientas que no soportan modelos relacionales complejos.

## Naturaleza de la Tabla

A diferencia de `FACT_ControlProyecto`, esta tabla no contiene solo IDs (claves foráneas), sino que incluye los nombres y descripciones de todas las dimensiones (Proyecto, Insumo, Ítem, Capítulo, Fecha, Empresa).

## Estructura de Datos Principal

| Categoría | Columnas Clave | Descripción |
| :--- | :--- | :--- |
| **Empresa** | `NombreEmpresa`, `Nit` | Contexto legal del registro. |
| **Proyecto** | `Nombre Proyecto`, `Sucursal Nombre`, `MacroProyecto Descripcion`, `Centro Costo`, `VIS` | Detalles completos de la ubicación y tipo de proyecto. |
| **Hechos** | `Cantidad`, `Valor Total`, `Valor Sin IVA`, `Valor Unitario Control` | Métricas financieras base. |
| **Origen** | `Origen Documento`, `Origen Documento Detalle` | Identificación de la fuente del dato en ADPRO. |
| **Temporal** | `Fecha`, `Año`, `Mes`, `NombreMes`, `MesAño` | Atributos de tiempo para segmentación temporal. |
| **Insumo** | `Codigo Insumo`, `Insumo Descripcion`, `Agrupacion Descripcion`, `Tipo Descripcion` | Detalle del recurso (Material, Mano de Obra, etc.). |
| **Ítem** | `Item No`, `Item Descripcion`, `SubCapitulo` | Detalle de la actividad presupuestal. |
| **Capítulo** | `Capitulo Numero`, `Capitulo Descripcion`, `Tipo Costo` | Nivel superior de agrupación del costo. |

## Reglas de Negocio

1. **Granularidad**: La granularidad es la misma que la de `FACT_ControlProyecto` (Insumo por Ítem por Documento por Fecha).
2. **Redundancia**: Al ser una tabla denormalizada, la información descriptiva se repite en cada fila, lo que aumenta significativamente el tamaño del archivo (~937 MB).
3. **Uso Recomendado**: Se recomienda su uso para **Power Pivot** o análisis ad-hoc donde no se desee gestionar el esquema estrella manualmente. Para **Power BI**, es preferible utilizar el modelo relacional (`FACT` + `DIMs`) para optimizar el rendimiento.

## Ventajas de esta Vista

- **Facilidad de uso**: No requiere conocimientos de relaciones para cruzar datos de proyecto con costos.
- **Autocontenida**: Incluye atributos de proyecto avanzados como `Area A Construir`, `Porcentaje Administracion`, e indicadores `VIS`.
- **Análisis de Insumos**: Incluye detalles técnicos del insumo como `Unidad`, `Estado`, `Stock Mínimo/Máximo` y `Valor Unitario Insumo`.

## Relaciones (Implícitas)

Aunque es una tabla plana, conceptualmente agrupa las siguientes dimensiones ya documentadas:
- [DIM_Proyecto](ADP_DTM_DIM_Proyecto.md)
- [DIM_Insumo](ADP_DTM_DIM_Insumo.md)
- [DIM_Items](ADP_DTM_DIM_Items.md)
- [DIM_CapituloPresupuesto](ADP_DTM_DIM_CapituloPresupuesto.md)
- [DIM_Fecha](ADP_DTM_DIM_Fecha.md)
