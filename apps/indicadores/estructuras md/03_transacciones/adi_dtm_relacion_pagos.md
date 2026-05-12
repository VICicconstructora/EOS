# `adi_dtm_relacion_pagos`

> **Power BI:** `ADI_DTM Relacion_Pagos`  ·  **Rol:** Hecho transaccional  ·  **Filas:** 92,369  ·  **Columnas:** 25

## Propósito

Pagos efectivamente recibidos (Caja real de la compañía).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Complemento Dinámico de la Cartera ("La Película"):** Mientras los campos fijos de mora en la tabla de `acuerdos_pago` ofrecen una foto simple y chata (que puede agrupar montos muy recientes con deudas muy antiguas), el área gerencial prefiere usar **esta tabla cruzada** contra las expectativas pactadas para armar la "Película". Es decir, analizar paso a paso, peso a peso y fecha por fecha cómo se ha ido cancelando la deuda para tener un perfil fidedigno del recaudo y la antigüedad real de la cartera vencida.
*   **Recaudo Puro y Adelantos:** `relacion_pagos` es la verdad financiera. Un cliente no se considera "al día" hasta que el registro de consignaciones reales cubre sus hitos. Es vital entender que **un cliente puede "adelantar" pagos**. Cuando esto ocurre, aparecerán en esta tabla aunque su fecha programada en `acuerdos_pago` sea futura (recordando que el acuerdo no se modifica sin un "Otro sí").
*   **Descuentos e Intereses (`descuento`, `intereses`):** Estos valores pueden afectar el valor total de la venta o no. La clave aquí es la vinculación con el mapa de conceptos (`idconcepto`), puesto que al momento de la **escrituración**, el sistema y la contabilidad evalúan cruzando con los conceptos qué porción correspondía al valor de venta y qué porción fue puramente generada por intereses o descuentos.

## Descripción

Cada fila es un movimiento de pago real (caja, transferencia, consignación). Documenta cuándo entró plata, por qué concepto, y en qué cuenta.

## Columnas clave

- `idventa` — FK a la venta madre (Agrupación).
- `fechaconsignacion` / `fecha` — Cuándo se recibió o registró el dinero.
- `valor / neto` — Monto pagado.
- `idconcepto` — A qué concepto de pago abonó este ingreso.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_relacion_pagos.idventa` → `adi_dtm_venta.idventa` — Venta cuyo pago se está registrando.

## Preguntas típicas que responde

- Análisis gerencial: ¿Trazando Acuerdos vs Relación Pagos, cuál es la verdadera curva temporal de recaudo (la "Película")?
- ¿Cuánto dinero entró en efectivo/consignación durante Enero 2026?

## Esquema completo (25 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `nombreproyecto` | `varchar` | Sí |
| 4 | `nombremacroproyecto` | `varchar` | Sí |
| 5 | `idventa` | `int4` | Sí |
| 6 | `recibo` | `varchar` | Sí |
| 7 | `cuota` | `varchar` | Sí |
| 8 | `fecha` | `timestamp` | Sí |
| 9 | `fechaconsignacion` | `timestamp` | Sí |
| 10 | `valor` | `numeric` | Sí |
| 11 | `descuento` | `numeric` | Sí |
| 12 | `intereses` | `numeric` | Sí |
| 13 | `neto` | `numeric` | Sí |
| 14 | `doccontableno` | `int4` | Sí |
| 15 | `doccontabletipo` | `varchar` | Sí |
| 16 | `cuentabancariapago` | `varchar` | Sí |
| 17 | `bancocuentabancariapago` | `varchar` | Sí |
| 18 | `descripciondocumento` | `varchar` | Sí |
| 19 | `observaciondocumento` | `varchar` | Sí |
| 20 | `idconcepto` | `int4` | Sí |
| 21 | `codmacroproyecto` | `int4` | Sí |
| 22 | `codproyecto` | `int4` | Sí |
| 23 | `codigointerno` | `varchar` | Sí |
| 24 | `compradornombre` | `varchar` | Sí |
| 25 | `compradordocumento` | `varchar` | Sí |

---

[← Volver al índice](../README.md)