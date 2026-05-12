# `adi_dtm_conceptospp`

> **Power BI:** `ADI_DTM ConceptosPP`  ·  **Rol:** Dimensión  ·  **Filas:** 82  ·  **Columnas:** 8

## Propósito

Catálogo de conceptos de plan de pagos (Cuota inicial, Mensualidad, Saldo, etc.) que estructuran los acuerdos y recaudos del cliente.

## Reglas de Negocio (¡IMPORTANTE!)

*   **Afectación a la Venta (`afectaconceptopp` -> 0 o 1):** Esta es la columna más crítica. Hay conceptos de pago que **agregados no entran al balance general** de la compañía, porque son recaudos para terceros (ej: Gastos Notariales o de Escrituración). Los conceptos que "No afectan" el valor, *no* se deben tener en cuenta al sumar la cartera o la venta. Por diseño, la suma de los planes de pago (`adi_dtm_acuerdos_pago`) que SÍ afectan, debería siempre ser igual al valor total de la venta (`adi_dtm_venta.valorneto`).
*   **Grupos de Concepto (`descgrupoconceptopp`):** El negocio se analiza mucho mejor por Grupos que por el concepto detallado. Por ejemplo, el grupo **"Cuota Inicial"** engloba adentro separaciones, pago de cesantías o cuotas regulares. La regla de negocio dicta que si el cliente toma un crédito, la agrupación de "Cuota Inicial" en su plan de pagos no debería ser inferior al 30% del valor total.
*   **Relevancia de los Códigos:** Aunque hay 82 conceptos, **los códigos del 1 al 8 (`codconceptopp`) son el "Core"** del negocio. Son los más repetitivos y relevantes macro-económicamente. El resto corresponden a casuísticas raras o marginales.
*   **Variables Inutilizadas:** La columna `clasificacionconceptopp` se puede omitir o ignorar por completo en los modelos de PowerBI, ya que nunca se usa para reportería real.

## Descripción

Define cada renglón posible dentro de un acuerdo de pago o consignación. Permite agrupar pagos por su naturaleza.

## Columnas clave

- `codconceptopp` — PK del concepto de plan de pagos.
- `descconceptopp` — Descripción fina del ítem.
- `descgrupoconceptopp` — Agrupador general (Cuota inicial, Saldo, etc.).
- `afectaconceptopp` — Bandera 0/1 para filtrar si la suma entra al valor oficial de venta y al balance.

## Relaciones

_Sin FKs salientes._

**Referenciada por (FKs entrantes):**

- `adi_dtm_acuerdos_pago.idconcepto` → `adi_dtm_conceptospp` — Cada renglón de acuerdo de pago referencia un concepto.
- `adi_dtm_tiposventa.codconceptoasociado` → `adi_dtm_conceptospp` — Liga lógicamente la modalidad de venta al concepto fuerte de pago.

## Preguntas típicas que responde

- ¿Cuál es la suma esperada en el acuerdo de pagos para el Grupo de "Cuota Inicial", y corresponde al mínimo exigido del 30%?
- En el balance general de una venta, si omite los conceptos que tienen `afectaconcep... = 0` (gastos de terceros), ¿el acuerdo iguala el valor real?

## Esquema completo (8 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `codempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codconceptopp` | `int4` | No |
| 4 | `descconceptopp` | `varchar` | Sí |
| 5 | `idgrupoconceptopp` | `int4` | Sí |
| 6 | `descgrupoconceptopp` | `varchar` | Sí |
| 7 | `afectaconceptopp` | `int2` | Sí |
| 8 | `clasificacionconceptopp` | `varchar` | Sí |

---

[← Volver al índice](../README.md)