# `adi_dtm_tiposventa`

> **Power BI:** `ADI_DTM TiposVenta`  ·  **Rol:** Dimensión  ·  **Filas:** 4  ·  **Columnas:** 5

## Propósito

Catálogo de tipos de venta (Clasificación de la modalidad de financiación o flujo principal presupuestado).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Tipos de Financiación:** Esta tabla, más que "tipos de documentos legales", clasifica la venta según hacia dónde va el mayor volumen de dinero en el plan de pagos (el crédito).
    *   **Contado:** El cliente no utiliza crédito constructor ni de terceros.
    *   **Crédito:** El cliente utiliza para financiarse la **misma entidad** financiera que usa la constructora para el proyecto.
    *   **Crédito Tercero:** El comprador toma el crédito con un banco diferente al del consorcio constructor (ej: El proyecto es con Davivienda, pero el cliente se financia con Bancolombia).
    *   **Leasing:** Modalidad de arrendamiento financiero, generalmente representa el mayor volumen de dinero dentro de este plan de pagos.
*   **Asociación con Conceptos:** El campo `codconceptoasociado` NO es transaccional interno, sino que **apunta directamente a la tabla madre** de conceptos (`adi_dtm_conceptospp`), sirviendo como llave para atar el tipo de venta con el concepto contable al que entrará la mayor parte del dinero.
*   **Casuística VIS + Subsidios:** A futuro (o en cruces de consultas) se suele analizar la combinación de este tipo de venta junto con la existencia de "Subsidios" en los proyectos VIS, para determinar la composición total del negocio.

## Descripción

Tabla muy pequeña. Clasifica cada venta según su modalidad financiera principal. La PK es la descripción (`desctipovta`), igual que en el modelo PBI.

## Columnas clave

- `desctipovta` — PK textual y etiqueta principal para reportes.
- `codconceptoasociado` — Llave que relaciona la modalidad de venta con el concepto de pago principal esperado.

## Relaciones

_Sin FKs salientes formales, pero con relación lógica._

**Relación Lógica (No FK pero importante):**
- `adi_dtm_tiposventa.codconceptoasociado` → Se mapea con `adi_dtm_conceptospp`.

**Referenciada por (FKs entrantes):**

- `adi_dtm_venta.tipo` → `adi_dtm_tiposventa` — Cada venta tiene un tipo (modalidad).

## Preguntas típicas que responde

- ¿Cuál es la distribución de Cartera entre Crédito Propio (Constructor) vs Crédito de Terceros?
- ¿Qué volumen de negocios entra por modalidad "Contado" vs "Leasing"?

## Esquema completo (5 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codtipovta` | `int4` | Sí |
| 4 | `desctipovta` | `varchar` | No |
| 5 | `codconceptoasociado` | `int4` | Sí |

---

[← Volver al índice](../README.md)