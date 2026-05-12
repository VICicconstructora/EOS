# `adi_dtm_listadeprecios_detalle`

> **Power BI:** `ADI_DTM ListaDePrecios_Detalle`  ·  **Rol:** Detalle de dimensión  ·  **Filas:** 85,043  ·  **Columnas:** 14

## Propósito

Renglones de precio por unidad dentro de una lista de precios.

## Descripción

85 043 filas. Cada fila es el precio de una unidad específica dentro de una lista de precios. Es la fuente para calcular el valor de venta cuando se asigna una unidad a un comprador.

## Columnas clave

- `idlistaprecio` — FK a la lista de precios.
- `codproyecto` — FK al proyecto.
- `idunidaddetallelistaprecio` — Unidad referenciada.
- `preciototal / preciom2` — Precio de la unidad.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_listadeprecios_detalle.idlistaprecio` → `adi_dtm_listadeprecios.idlistaprecio` — Lista de precios.
- `adi_dtm_listadeprecios_detalle.codproyecto` → `adi_dtm_proyectos.prycodigoproyecto` — Proyecto.

_No es referenciada por otras tablas._

## Preguntas típicas que responde

- ¿Precio por m² promedio en una lista?
- ¿Cómo cambió el precio de una unidad entre listas?

## Esquema completo (14 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `codempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codmacroproyecto` | `int4` | Sí |
| 4 | `nombremacroproyecto` | `varchar` | Sí |
| 5 | `codproyecto` | `int4` | Sí |
| 6 | `nombreproyecto` | `varchar` | Sí |
| 7 | `iddetallelistaprecio` | `int4` | Sí |
| 8 | `idlistaprecio` | `int4` | Sí |
| 9 | `idunidaddetallelistaprecio` | `int4` | Sí |
| 10 | `descunidaddetallelistaprecio` | `varchar` | Sí |
| 11 | `valorunidaddetallelistaprecio` | `numeric` | Sí |
| 12 | `criteriodetallelistaprecio` | `varchar` | Sí |
| 13 | `porcentajedetallelistaprecio` | `float8` | Sí |
| 14 | `observacionesdetallelistaprecio` | `text` | Sí |

---

[← Volver al índice](../README.md)