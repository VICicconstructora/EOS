# `sinco_ic_historico.flujo_historico`

> **Rol:** Hecho de ejecución (proyectos socios)  ·  **Filas:** 342,383 (al 2026-05-08)  ·  **Snapshots:** 16 (`2025-01-01` → `2026-04-01`)  ·  **Estado:** Activo

## Propósito

Tabla que almacena los **cortes mensuales de proyección y ejecución** para los
proyectos donde IC NO tiene CRM (proyectos en sociedad). Sustituye al rol que
cumple `adi_dtm_venta` / `adi_dtm_relacion_pagos` para esos proyectos.

Cada mes se publica un nuevo "Flujo Histórico" — un Excel con la misma
estructura del PPTO pero reflejando lo realmente pasado hasta esa fecha de
corte y la re-proyección hacia el futuro. La diferencia entre dos cortes
sucesivos del mismo proyecto y línea P&G permite reconstruir el "real" del
mes intermedio.

## Origen

Excel `Historico.xlsx` en SharePoint:

<https://icconstructora.sharepoint.com/sites/GND/Documentos/Historico.xlsx>

(URL del usuario:
`https://icconstructora.sharepoint.com/:x:/r/sites/GND/_layouts/15/Doc.aspx?sourcedoc=%7B4C0D59E8-BE62-4928-9AA0-9398314E76E7%7D&file=Historico.xlsx`)

## Reglas de Negocio (¡IMPORTANTE!)

* **Cada corte es un snapshot inmutable.** Una vez cargado un mes, no se
  reescribe. Si necesitas corregir, agregas otra carga con `fecha_corte`
  posterior y el frontend usará la más reciente.
* **El "real" no está en una columna específica del Excel.** Es la
  comparativa entre el corte vigente y un corte anterior, restringida al
  rango pasado. Conceptualmente:
  ```
  real(proyecto, pyg, mes_X) = valor en corte_actual donde fecha_periodo = mes_X
                               (siempre que mes_X <= fecha_corte_actual)
  ```
* **Solo aplica a proyectos `fuente_real = 'FlujoHistorico'`** según
  `proyectos_map`. Para proyectos `'CRM'` esta tabla no se consulta.
* **Estructura idéntica a `ppto_valores`** para que las vistas KPI puedan
  hacer UNION ALL sobre las dos cuando se consolide portafolio mixto
  (algunos propios + algunos socios).

## Esquema (propuesto)

```sql
CREATE SCHEMA IF NOT EXISTS sinco_ic_historico;

CREATE TABLE sinco_ic_historico.flujo_historico (
  proyecto_ppto    TEXT NOT NULL REFERENCES sinco_ic_targets.proyectos_map(proyecto_ppto),
  fecha_corte      DATE NOT NULL,              -- mes del snapshot del Excel Historico (último día del mes)
  pyg_codigo       TEXT NOT NULL REFERENCES sinco_ic_targets.pyg_lineas(codigo),
  pyg_descripcion  TEXT NOT NULL,
  fecha_periodo    DATE NOT NULL,              -- mes al que se refiere el valor
  valor            NUMERIC(20,2) NOT NULL,
  PRIMARY KEY (proyecto_ppto, fecha_corte, pyg_codigo, fecha_periodo)
);

CREATE INDEX ON sinco_ic_historico.flujo_historico (fecha_corte DESC, pyg_codigo);
```

## Vista derivada para "real ejecutado"

```sql
CREATE OR REPLACE VIEW sinco_ic_historico.v_real_ejecutado AS
SELECT
  fh.proyecto_ppto,
  fh.pyg_codigo,
  fh.fecha_periodo,
  fh.valor AS valor_real
FROM sinco_ic_historico.flujo_historico fh
JOIN (
  SELECT proyecto_ppto, MAX(fecha_corte) AS ultimo_corte
  FROM sinco_ic_historico.flujo_historico
  GROUP BY proyecto_ppto
) ult ON fh.proyecto_ppto = ult.proyecto_ppto AND fh.fecha_corte = ult.ultimo_corte
WHERE fh.fecha_periodo <= ult.ultimo_corte;
```

Esto entrega, por proyecto y línea P&G, los meses pasados con su valor
ejecutado según el snapshot más reciente.

## Carga inicial completada (2026-05-08)

| Proyecto PPTO | Filas | Cortes |
|---|---:|---:|
| Mitika E1-E4 (consolidado de 8 sub-proyectos) | 73,174 | 16 |
| Verde Vivo E1-E4 | 95,626 | 16 |
| Azul Celeste E1-E4 | 69,905 | 16 |
| Azul Turquesa E1-E4 | 78,049 | 16 |
| Well | 25,629 | 16 |
| **TOTAL** | **342,383** | |

Detalle de la estructura del Excel fuente, incluyendo el caso especial de
Mitika con dos sistemas de códigos P&G:
[`estructura_archivos.md`](estructura_archivos.md).

## Ingestión incremental futura

Cuando llegue un nuevo corte mensual, NO recargar todo. Estrategia:

1. Verificar `MAX(fecha_corte)` actual en `flujo_historico`.
2. Filtrar el Excel solo por `Fecha Datos > MAX(fecha_corte)`.
3. Aplicar las mismas normalizaciones (Mitika sub-proyectos, descripciones
   P&G).
4. `INSERT ... ON CONFLICT DO NOTHING` para idempotencia.

El proceso podría automatizarse vía Fabric / Logic App / GitHub Action si
el equipo financiero publica el Excel con nombre y ruta estables.

## Preguntas típicas que responde

- ¿Cuánto vendió en realidad "Praia E3" (proyecto socio) en abril 2026?
- Comparado con el PPTO 2026, ¿cuánto está atrasado o adelantado el flujo
  ejecutado de un proyecto socio?
- ¿Cómo evolucionaron las proyecciones de un proyecto socio mes a mes?
  (Comparando snapshots sucesivos.)

---
[← Volver al índice](README.md)
