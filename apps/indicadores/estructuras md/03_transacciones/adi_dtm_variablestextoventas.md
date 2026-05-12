# `adi_dtm_variablestextoventas`

> **Power BI:** `ADI_DTM VariablesTextoVentas`  ·  **Rol:** Atributos extendidos  ·  **Filas:** 1,061  ·  **Columnas:** 8

## Propósito

Campos de texto personalizables que CBR define por venta (clausulas, notas, etc.).

## Descripción

Estructura tipo EAV (Entity-Attribute-Value) ligera. Almacena variables de texto adicionales que no caben en `venta`.

## Columnas clave

- `codventa` — FK a la venta.
- `nombrevariable / valor` — Atributo libre + su valor.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_variablestextoventas.codventa` → `adi_dtm_venta.idventa` — Venta a la que aplica.

_No es referenciada por otras tablas._

## Preguntas típicas que responde

- ¿Qué variables de texto se usan más?
- ¿Buscar ventas con una cláusula específica?

## Esquema completo (8 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codventa` | `int4` | Sí |
| 4 | `codigoalt` | `varchar` | Sí |
| 5 | `nombre` | `varchar` | Sí |
| 6 | `obs` | `text` | Sí |
| 7 | `valor` | `text` | Sí |
| 8 | `etiqueta` | `varchar` | Sí |

---

[← Volver al índice](../README.md)