# `mc_calendar`

> **Power BI:** `_McCalendar`  ·  **Rol:** Dimensión de tiempo  ·  **Filas:** 18,627  ·  **Columnas:** 0

## Propósito

Dimensión de calendario (todos los días entre 2000-01-02 y 2050-12-31).

## Descripción

Tabla creada en este proyecto (no existía en Supabase). Réplica de `_McCalendar` del modelo Power BI. Útil para joins por fecha y análisis temporal (mes, año, semana, ISO, trimestre).

## Columnas clave

- `date` — PK: fecha calendario.
- `year / month / day` — Componentes de fecha.
- `year_month` — YYYYMM para ordenar.
- `quarter` — Trimestre 1-4.
- `is_past / is_future` — Banderas relativas a hoy.

## Relaciones

_Sin FKs salientes._

**Referenciada por (FKs entrantes):**

- `(opcional) adi_dtm_acuerdos_pago.fecha` → `mc_calendar` — Fecha programada de cuota.
- `(opcional) adi_dtm_relacion_pagos.fechaconsignacion` → `mc_calendar` — Fecha real de consignación.
- `(opcional) adi_dtm_tramites."Fecha Programada"` → `mc_calendar` — Fecha programada del trámite.

## Preguntas típicas que responde

- ¿Pagos por mes en el último año?
- ¿Trámites pendientes por trimestre?

## Esquema completo (0 columnas)

_No se encontraron columnas en `information_schema` para esta tabla._

---

[← Volver al índice](../README.md)