# `adi_dtm_listadeprecios`

> **Power BI:** `ADI_DTM ListaDePrecios`  ·  **Rol:** Dimensión  ·  **Filas:** 453  ·  **Columnas:** 22

## Propósito

Cabecera general del catálogo evolutivo de precios por proyecto. (Define las reglas de tiempo y validez).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Vigencia e Historia:** Las fechas de vigencia (`fechainiciovigencialistaprecio` / `fechafinvigencialistaprecio`) determinan de forma exacta qué precio "debería" haber tenido una unidad en el pasado, o qué precio tendrá que tener en el futuro. Permite la trazabilidad en el tiempo.
*   **Inventario Restante (Base):** Para calcular y reportar el "Inventario Restante Actual", la regla estandarizada es cruzar y valorar la disponibilidad con la lista en estado **"Vigente"** (es decir, la lista activa del día de hoy).
*   **Comparación P&G y Proyecciones Avanzadas:** 
    *   La estimación rápida de una etapa (lo vendido a precio histórico + inventario disponible a precio vigente) es un cálculo base/rápido. 
    *   Sin embargo, al comparar contra un **P&G (Pérdidas y Ganancias)** o una proyección financiera estructurada, esta simple suma siempre será inferior a la meta corporativa. Esto ocurre porque el negocio proyecta incrementos sistémicos de precio (ya sea cada cierto tiempo o tras cumplir *n* unidades vendidas) que superarán el precio en vitrina actual. Listas futuras a veces están precargadas y a veces no, por lo que el P&G incorpora esa curva de valorización esperada.

## Descripción

Esta tabla funciona solo como el agrupador maestro (la "Llave"). Todo el detalle de cuánto vale puntualmente *el apartamento 101* bajo la lista de *Abril 2026*, se encuentra en la tabla hija `adi_dtm_listadeprecios_detalle`.

## Columnas clave

- `idlistaprecio` — PK de la lista.
- `codproyecto` — Proyecto al que pertenece la lista.
- `fechainiciovigencialistaprecio / fechafinvigencialistaprecio` — Ventana de tiempo donde esta lista aplicaba.
- `estadolistaprecio` — Estado lógico (Ej. Vigente, Inactivo).

## Relaciones

_Sin FKs salientes._

**Referenciada por (FKs entrantes):**

- `adi_dtm_listadeprecios_detalle.idlistaprecio` → `adi_dtm_listadeprecios` — Cada renglón de detalle pertenece a una lista de la cabecera.

## Preguntas típicas que responde

- ¿Cuál es la lista de precios que está activa (vigente) hoy para el macroproyecto X?
- ¿Cuándo fue la última vez que le subimos los precios a la etapa Y (basado en la fecha inicio de vigencia de sus listas)?

## Esquema completo (22 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `codempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codmacroproyecto` | `int4` | Sí |
| 4 | `nombremacroproyecto` | `varchar` | Sí |
| 5 | `codproyecto` | `int4` | Sí |
| 6 | `nombreproyecto` | `varchar` | Sí |
| 7 | `idlistaprecio` | `int4` | No |
| 8 | `numerolistaprecio` | `int4` | Sí |
| 9 | `nombrelistaprecio` | `varchar` | Sí |
| 10 | `estadolistaprecio` | `varchar` | Sí |
| 11 | `motivolistaprecio` | `varchar` | Sí |
| 12 | `usuariocreacionlistaprecio` | `varchar` | Sí |
| 13 | `fechacreacionlistaprecio` | `timestamp` | Sí |
| 14 | `observacioneslistaprecio` | `text` | Sí |
| 15 | `fechainiciovigencialistaprecio` | `timestamp` | Sí |
| 16 | `fechafinvigencialistaprecio` | `timestamp` | Sí |
| 17 | `usuarioapruebalistaprecio` | `varchar` | Sí |
| 18 | `fechaapruebalistaprecio` | `timestamp` | Sí |
| 19 | `usuariosincronizalistaprecio` | `varchar` | Sí |
| 20 | `fechasincronizalistaprecio` | `timestamp` | Sí |
| 21 | `usuariomodificacionlistaprecio` | `varchar` | Sí |
| 22 | `fechamodificacionlistaprecio` | `timestamp` | Sí |

---

[← Volver al índice](../README.md)