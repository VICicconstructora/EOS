# `adi_dtm_inventarios`

> **Power BI:** `ADI_DTM Inventarios`  ·  **Rol:** Dimensión / inventario  ·  **Filas:** 4,402  ·  **Columnas:** 44

## Propósito

Inventario físico de unidades disponibles (apartamentos, casas, lotes, parqueaderos).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Identificación de "Unidad Principal":** Generalmente, los anexos como parqueaderos y depósitos NO se consideran unidades principales, sino que se asocian al apartamento. **Sin embargo**, hay excepciones por proyecto (ej. "Castilla Imperial 3") donde el proyecto solo vende parqueaderos y allí pasan a ser la unidad principal. Se debe tener cuidado al filtrar ciegamente. Esta agrupación se rige por campos como `invundppalventa` y tiene cruces con la tabla de Listas de Precios.
*   **Disponibilidad Real (Estado de Venta):** Aunque existe el campo `investunidad` (que da una indicación del estado), la forma **más segura y recomendada por el negocio** para saber si una unidad está verdaderamente vendida o disponible es **cruzar el inventario con la tabla de ventas (`adi_dtm_venta`)**. Si tiene una venta asociada activa (`codventa` / `id_venta`), está vendida. El inventario se puede agrupar para vender varios registros juntos ("agrupaciones").
*   **Manejo de Precios y Valoración:**
    *   `invvalorunidad`: Refleja el precio al que la unidad **fue vendida o separada** (debe coincidir idealmente con la tabla de Ventas).
    *   `invvalorunidadlistavigente`: Es el precio actual de la unidad "en vitrina", basado en la lista de precios activa.
    *   **Proyección de Inventario:** Para proyectar cuánto vale el proyecto entero, se suma lo vendido usando su valor de cierre (`invvalorunidad`) más el inventario sobrante a precio de vitrina (`invvalorunidadlistavigente`), cruzando con las tablas históricas y futuras de `adi_dtm_listadeprecios` (pues los precios sufren incrementos proyectados a futuro).

## Descripción

Cada fila es una unidad inmobiliaria con sus características (área, alcoba, parqueadero, depósito, precio, estado). Es la unidad mínima o agrupación que se comercializa.

## Columnas clave

- `invidunidad` — ID único de la unidad lógica en Sinco.
- `invcodproyecto` — FK al proyecto (etapa) donde está la unidad.
- `invcodmacroproy` — Código del macroproyecto.
- `codventa` — Relación con la tabla central de ventas (si ya fue vendida).

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_inventarios.invcodproyecto` → `adi_dtm_proyectos.prycodigoproyecto` — Proyecto al que pertenece la unidad.

_No es referenciada por otras tablas a través de FK dura en la base, pero lógicamente se enlaza:_
- Se une de forma implícita a `adi_dtm_venta` para confirmar estatus.
- Se enlaza a Listas de Precios para proyecciones futuras.

## Preguntas típicas que responde

- ¿Cuántas unidades principales hay disponibles cruzando con las ventas efectivas?
- ¿Valor monetario proyectado del inventario sobrante vs el ya vendido?
- ¿Distribución del inventario por cantidad de alcobas y áreas?

## Esquema completo (44 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `invcodempresa` | `int4` | Sí |
| 2 | `invcodmacroproy` | `int4` | Sí |
| 3 | `invnombremacroproy` | `varchar` | Sí |
| 4 | `invcodproyecto` | `int4` | Sí |
| 5 | `invnombreproyecto` | `varchar` | Sí |
| 6 | `invcodunidad` | `varchar` | Sí |
| 7 | `invidunidad` | `int4` | Sí |
| 8 | `invdescunidad` | `varchar` | Sí |
| 9 | `invvalorunidad` | `numeric` | Sí |
| 10 | `investunidad` | `varchar` | Sí |
| 11 | `invfechavta` | `timestamp` | Sí |
| 12 | `invtipoinmueble` | `varchar` | Sí |
| 13 | `invcodtipounidad` | `int4` | Sí |
| 14 | `invtipounidad` | `varchar` | Sí |
| 15 | `invarconstruida` | `float8` | Sí |
| 16 | `invarprivada` | `float8` | Sí |
| 17 | `invarterraza` | `float8` | Sí |
| 18 | `invarbalcon` | `float8` | Sí |
| 19 | `invarpatio` | `float8` | Sí |
| 20 | `invartotal` | `float8` | Sí |
| 21 | `invarlote` | `float8` | Sí |
| 22 | `invartecnica` | `float8` | Sí |
| 23 | `invarjardineria` | `float8` | Sí |
| 24 | `invpiso` | `int4` | Sí |
| 25 | `invmatriculano` | `varchar` | Sí |
| 26 | `invcedulacatastrono` | `varchar` | Sí |
| 27 | `invfechaescritura` | `timestamp` | Sí |
| 28 | `invalcobas` | `int4` | Sí |
| 29 | `invvalorunidadlistavigente` | `numeric` | Sí |
| 30 | `codventa` | `int4` | Sí |
| 31 | `invchip` | `varchar` | Sí |
| 32 | `invinterior` | `varchar` | Sí |
| 33 | `aniosmlv` | `int4` | Sí |
| 34 | `valorsmlv` | `numeric` | Sí |
| 35 | `cantidadsmlv` | `numeric` | Sí |
| 36 | `invtorre` | `varchar` | Sí |
| 37 | `invarbodegajeint` | `float8` | Sí |
| 38 | `invundppalventa` | `int4` | Sí |
| 39 | `invcodinterno` | `varchar` | Sí |
| 40 | `invundppaltipounidad` | `int4` | Sí |
| 41 | `invfechaprog` | `timestamp` | Sí |
| 42 | `invcompradordocumento` | `varchar` | Sí |
| 43 | `invcompradornombre` | `varchar` | Sí |
| 44 | `investadoagrupacion` | `varchar` | Sí |

---

[← Volver al índice](../README.md)