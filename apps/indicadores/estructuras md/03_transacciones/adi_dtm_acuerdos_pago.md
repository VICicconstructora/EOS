# `adi_dtm_acuerdos_pago`

> **Power BI:** `ADI_DTM Acuerdos_PagoMcX`  ·  **Rol:** Hecho transaccional  ·  **Filas:** 65,291  ·  **Columnas:** 22

## Propósito

Plan de pagos pactado con el comprador, fila por cuota. Es el escenario "ideal" o "Acordado" de flujo de caja.

## Reglas de Negocio (¡IMPORTANTE!)

*   **Cartera: "La Foto" vs "La Película":** 
    *   La tabla confía y utiliza los campos calculados de mora (`mora_dias` y `mora_saldo`) para dar una **"FOTO"** del estado actual.
    *   Sin embargo, estos campos tienen limitantes de granularidad. Por ejemplo: Si un cliente debe $100 pesos de hace 1.000 días, y $1.000.000 de hace 3 días, las variables planas podrían mostrar "Mora: 1000 días" y "Valor: 1.000.100", perdiendo el detalle fino.
    *   Para ver la **"PELÍCULA"** (evaluación temporal perfecta de cómo envejeció o sanó la cartera), el negocio recurre a cruzar las fechas y valores exactos de esta tabla (`pactado` / `fecha`) contra lo que ingresó realmente en la tabla `adi_dtm_relacion_pagos`.
*   **Inmutabilidad del Plan:** El acuerdo de pagos solo muestra el plan ideal inicial acordado. **No se modifica** automáticamente si el cliente se adelanta en sus cuotas. La única forma en la que esta tabla cambia es a través de una modificación legal oficial (llamada "Otro sí" a la promesa o separación).

## Descripción

Cada fila representa un renglón del plan de pagos de una venta. Lleva concepto (cuota inicial, mensualidad, saldo), valor pactado y fecha programada. Representa la expectativa de recaudo (`pactado`).

## Columnas clave

- `idventa` — FK a la venta madre.
- `idconcepto` — FK al concepto del plan (ej. Cuota Inicial).
- `fecha` — Fecha programada de la obligación.
- `pactado` / `pagado` / `saldo` — Estados del valor de la cuota.
- `mora_dias / mora_saldo` — Variables estáticas de deuda a la fecha de extracción.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_acuerdos_pago.idventa` → `adi_dtm_venta.idventa` — Venta a la que pertenece la cuota.
- `adi_dtm_acuerdos_pago.idconcepto` → `adi_dtm_conceptospp.codconceptopp` — Concepto de la cuota.

## Preguntas típicas que responde

- ¿Cuál es la "Foto" estática de la mora por proyecto (`mora_saldo`)?
- ¿Cuánto dinero se espera recaudar en el mes de Diciembre 2026 (`pactado` filtrado por `fecha`)?

## Esquema completo (22 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `idventa` | `int4` | Sí |
| 4 | `codigointerno` | `varchar` | Sí |
| 5 | `vtaidmacro` | `int4` | Sí |
| 6 | `vtanombremacro` | `varchar` | Sí |
| 7 | `vtaidproyecto` | `int4` | Sí |
| 8 | `vtanombreproyecto` | `varchar` | Sí |
| 9 | `concepto` | `varchar` | Sí |
| 10 | `fecha` | `timestamp` | Sí |
| 11 | `pactado` | `numeric` | Sí |
| 12 | `pagado` | `numeric` | Sí |
| 13 | `saldo` | `numeric` | Sí |
| 14 | `mora_saldo` | `numeric` | Sí |
| 15 | `mora_dias` | `int4` | Sí |
| 16 | `idconcepto` | `int4` | Sí |
| 17 | `entidad` | `varchar` | Sí |
| 18 | `nitentidad` | `varchar` | Sí |
| 19 | `estadoplanpago` | `varchar` | Sí |
| 20 | `compradornombre` | `varchar` | Sí |
| 21 | `compradordocumento` | `varchar` | Sí |
| 22 | `estadocartera` | `varchar` | Sí |

---

[← Volver al índice](../README.md)