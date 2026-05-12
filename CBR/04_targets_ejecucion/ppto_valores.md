# `sinco_ic_targets.ppto_valores`

> **Rol:** Hecho de presupuesto  ·  **Filas iniciales:** 87,835  ·  **Columnas:** 7

## Propósito

Tabla "tall" con todos los valores PPTO mensuales por proyecto y línea P&G.
Es la fotografía de presupuesto contra la cual se compara la ejecución real
(sea de CRM o de Flujo Histórico).

## Origen

Excel `PPTOProyectos2026.xlsx`, hoja `PptoConsolidado` (87,835 filas).
Cada hoja por proyecto del Excel es subset de PptoConsolidado, no se cargan
las hojas individuales.

## Reglas de Negocio (¡IMPORTANTE!)

* **Snapshots se preservan, no se sobreescriben.** Si llega un PPTO
  re-aprobado a mitad de año, se carga con un `fecha_snapshot` distinto y
  ambos quedan en la tabla. Las vistas que consume el frontend filtran por
  el snapshot vigente más reciente.
* **`fuente` divide el portafolio:**
  - `Proyectos` → portafolio operando hoy. KPIs de ejecución del CEO/Mónica
    leen de aquí.
  - `Estructuracion` → pipeline. Se usa para tableros de "nuevos negocios".
  - **No mezclar en la misma agregación**, son universos disjuntos.
* **Agregación correcta depende de la línea:** ver `pyg_lineas.agregacion`.
  Sumar a ciegas el `valor` de líneas acumuladas multiplica los KPIs por
  número-de-meses.
* **Rango temporal:** 2019-06 a 2037-07. Los valores históricos previos al
  año actual son meta retroactiva (servían para la presentación inicial del
  proyecto), normalmente no son lo que el CEO mira en su día a día.

## Descripción

Cada fila es: para un proyecto, en un snapshot de PPTO dado, una línea P&G
en un mes específico, vale `X`.

## Esquema

```sql
CREATE TABLE sinco_ic_targets.ppto_valores (
  proyecto_ppto    TEXT NOT NULL REFERENCES sinco_ic_targets.proyectos_map(proyecto_ppto),
  fecha_snapshot   DATE NOT NULL,              -- "Fecha Datos" del Excel (cuándo se generó este PPTO)
  fuente           TEXT NOT NULL,              -- 'Proyectos' | 'Estructuracion'
  pyg_codigo       TEXT NOT NULL REFERENCES sinco_ic_targets.pyg_lineas(codigo),
  pyg_descripcion  TEXT NOT NULL,              -- denormalizado para queries directas sin JOIN
  fecha_periodo    DATE NOT NULL,              -- mes del PPTO (último día del mes)
  valor            NUMERIC(20,2) NOT NULL,
  PRIMARY KEY (proyecto_ppto, fecha_snapshot, fuente, pyg_codigo, fecha_periodo)
);

CREATE INDEX ON sinco_ic_targets.ppto_valores (pyg_codigo, fecha_periodo);
CREATE INDEX ON sinco_ic_targets.ppto_valores (proyecto_ppto, fecha_periodo);
CREATE INDEX ON sinco_ic_targets.ppto_valores (fuente, pyg_codigo, fecha_periodo) WHERE fecha_snapshot = '2025-12-01';
```

## Mapeo desde el Excel

| Columna Excel | Columna tabla |
|---|---|
| `Proyecto` | `proyecto_ppto` |
| `Fecha Datos` | `fecha_snapshot` |
| `Fuente` | `fuente` |
| `P&G` (string completo) | `pyg_codigo` (parte numérica) + `pyg_descripcion` (resto) |
| `TOTAL` | (no se carga — siempre 0 en muestreo) |
| `Fecha` | `fecha_periodo` |
| `Valor` | `valor` |

## Carga inicial

87,835 filas, todas con `fecha_snapshot = 2025-12-01`. Sin duplicados verificados.

Carga proyecto por proyecto, reportando tras cada uno: `proyecto, filas
insertadas, suma valor año en curso, rango fechas mín/máx`. Si algo se ve raro
se aborta antes de seguir.

## Preguntas típicas que responde

- ¿Cuál es el PPTO de Ventas Vivienda ($) YTD para "Praia E1" en 2026?
- ¿Cuánto crédito tiene presupuestado recibir el portafolio activo en Q2 2026?
- Comparado con el snapshot anterior, ¿cómo cambió el PPTO de Costos Directos
  para "Bosque Central"?

## Vistas que se construyen encima (en `sinco_ic_calc`)

| Vista | Propósito |
|---|---|
| `kpi_ventas_ytd` | Real vs PPTO de Ventas (Un, $) por proyecto y portafolio |
| `kpi_escrituracion_ytd` | Real vs PPTO de Escrituración |
| `kpi_cartera_ytd` | Real (recaudo fiducia) vs PPTO (cuota inicial + crédito + subsidio) |

---
[← Volver al índice](README.md)
