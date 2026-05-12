# Targets y Ejecución (PPTO vs Real)

Este bloque del modelo no proviene del ERP Sinco. Vive en schemas paralelos
porque son **datos de gestión** (presupuestos y proyecciones) que conviven con
los datos transaccionales para permitir comparativas PPTO vs Real.

## El problema que resuelve

IC Constructora maneja dos clases de proyectos en su portafolio:

| Clase | Cómo se gestiona | Dónde está la información de "real" |
|---|---|---|
| **Propios** | IC vende directamente | `sinco_ic_raw` (CRM/ERP Sinco) |
| **Socios** | IC participa pero NO vende | No hay CRM. La ejecución llega como **Flujo Histórico** (Excel mensual) |

Por lo tanto, para construir KPIs gerenciales necesitamos saber, **proyecto por
proyecto**, dónde leer la ejecución real:

- Si es propio → consultar `adi_dtm_venta` / `adi_dtm_tramites` / `adi_dtm_relacion_pagos`.
- Si es socio → consultar el corte del mes en `flujo_historico` (snapshot del Excel).

El **PPTO** (presupuesto base) en cambio es uniforme para ambas clases: está en
`ppto_valores`, viene del Excel `PPTOProyectos2026.xlsx` y se renueva una vez al
año (con posibles ajustes en snapshots posteriores).

## Schemas Postgres

| Schema | Origen | Frecuencia de actualización |
|---|---|---|
| `sinco_ic_targets` | Excel `PPTOProyectos2026.xlsx` | Anual (snapshot por `fecha_snapshot`) |
| `sinco_ic_historico` | Excel `Historico.xlsx` (SharePoint) | Mensual (corte por `fecha_corte`) |
| `sinco_ic_raw` | ETL Sinco | Diaria/horaria (fuente de verdad CRM) |

## Tablas

| Tabla | Propósito |
|---|---|
| [`sinco_ic_targets.proyectos_map`](proyectos_map.md) | Catálogo de proyectos PPTO. Define para cada uno qué fuente de "real" usar (CRM vs FlujoHistorico). |
| [`sinco_ic_targets.proyectos_map_erp`](proyectos_map.md) | Hija 1:N. Lista los `idproyecto` del ERP que componen cada proyecto PPTO (un PPTO suele consolidar varias etapas ERP). |
| [`sinco_ic_targets.pyg_lineas`](pyg_lineas.md) | Catálogo de las 101 líneas P&G. Categoría (Ventas, Escrituración, Cartera, Costos…) y tipo de agregación (flujo vs acumulado). |
| [`sinco_ic_targets.ppto_valores`](ppto_valores.md) | Valores PPTO mensuales por `proyecto × P&G × periodo`. 87,835 filas, snapshot único `2025-12-01`. |
| [`sinco_ic_historico.flujo_historico`](flujo_historico.md) | Cortes mensuales de proyección "real" para proyectos socio. 342,383 filas, 16 snapshots `2025-01-01` → `2026-04-01`. |

## Estructura de archivos fuente

Detalle exhaustivo del formato de los Excel `PPTOProyectos2026.xlsx` y
`Historico.xlsx`, sus snapshots, hojas, columnas, particularidades (Mitika
con dos sistemas de códigos P&G, naming inconsistente entre fuentes, etc.):

→ [`estructura_archivos.md`](estructura_archivos.md)

Léelo antes de re-ingerir o modificar el pipeline de carga.

## Las dos fuentes del Excel PPTO

`PPTOProyectos2026.xlsx` trae 50 proyectos en dos cubos disjuntos:

| Fuente Excel | Cuenta | Significado | Ejemplos |
|---|---|---|---|
| `Proyectos` | 30 | Portafolio operando hoy (PPTO oficial) | Azul Celeste, Bosque Central, Gaia, Praia E1-E2, Mitika, Reserva de Oporto, Verde Vivo, Well, Castilla… |
| `Estructuracion` | 20 | Pipeline / pre-aprobación | Alpujarra, Anapoima, BLVD 92, Consejo, Fabricato, Gran Manzana, Tierra Linda, Praia E3… |

**Implicación operativa:**

- KPIs de ejecución del portafolio (Ventas YTD, Escrituración YTD, Cartera) se
  filtran por defecto en `fuente = 'Proyectos'`.
- Pipeline de "nuevos negocios" (ROCK Q2 2026: cerrar 3 antes del 30 jun 2026)
  se monitorea sobre `fuente = 'Estructuracion'`.

## Comparativa PPTO vs Real (modelo lógico)

Para cualquier línea P&G y proyecto en un periodo:

```
PPTO     = sinco_ic_targets.ppto_valores.valor    (siempre)
REAL     = CASE proyectos_map.fuente_real
             WHEN 'CRM'             THEN agregación de sinco_ic_raw.*
             WHEN 'FlujoHistorico'  THEN sinco_ic_historico.flujo_historico.valor
           END
CUMPL    = REAL / PPTO
```

Las vistas materializadas que materialicen esta lógica viven en
`sinco_ic_calc.kpi_*` y son lo que consume el frontend.

## Fuente del Flujo Histórico

Excel mensual: `Historico.xlsx` en SharePoint GND.

URL: <https://icconstructora.sharepoint.com/sites/GND/Documentos/Historico.xlsx>

Cada mes se genera un nuevo corte (snapshot). La ingesta a
`sinco_ic_historico.flujo_historico` debe preservar todos los snapshots para
poder reconstruir cómo evolucionaron las proyecciones mes a mes.

## Reglas de negocio importantes

- **Snapshots se conservan**, no se sobreescriben. PK incluye `fecha_snapshot`
  (PPTO) o `fecha_corte` (FlujoHistorico).
- **Granularidad PPTO ≠ ERP (1:N).** El PPTO consolida etapas que el ERP
  separa. El mapeo PPTO→ERP se modela como tabla hija
  `proyectos_map_erp`, no como columna escalar. Casos: Bosque Central
  (1 PPTO ↔ 3 ERP), Castilla Living (1↔2), Gaia (1↔2), Reserva de Oporto E
  1-2 (1↔2), Reserva de Oporto E3 (1↔2: ETAPA 3 + ETAPA 4 TORRES 4 Y 5),
  Primera Este E 1-2 (1↔2: CENTRAL + SUR).
- **Proyectos sin CRM** (socios) tienen `fuente_real = 'FlujoHistorico'` y
  cero filas en `proyectos_map_erp`. No deben aparecer en queries contra
  `adi_dtm_venta`.
- **Re-clasificaciones:** un proyecto puede pasar de `Estructuracion` a
  `Proyectos` cuando arranca ejecución. Al 2026-05-07 se reclasificó
  **Praia E3** (ya tenía 2 ventas y un cierre anterior).
- **Castilla Imperial — parqueaderos:** los 120 parqueaderos pueden venderse
  como parte de Imperial 2B (gratis o pago, dentro del P&G de 2B) o
  independientes vía Imperial P (con su propio P&G). No son agregables a
  ciegas — los KPIs de 2B y P se calculan separados.
- **Mapeo por nombre es frágil**: el Excel dice "Azul Celeste E1" pero
  `adi_dtm_venta.vtanombreproyecto` puede usar variantes. Por eso el mapeo
  se valida y mantiene en `proyectos_map_erp`.

---
[← Volver al índice principal](../README.md)
