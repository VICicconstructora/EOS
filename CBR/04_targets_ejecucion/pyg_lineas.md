# `sinco_ic_targets.pyg_lineas`

> **Rol:** Catálogo de líneas P&G  ·  **Filas:** 101  ·  **Columnas:** 5

## Propósito

Centraliza la semántica de cada línea P&G del modelo financiero
(`17.1 Ventas Vivienda (Un)`, `1.24 Cuota Inicial Vendido`, etc.). Permite
categorizar y, sobre todo, definir **cómo agregar** la columna `valor` cuando
se calcula un YTD o un total de periodo.

## Reglas de Negocio (¡IMPORTANTE!)

* **Flujo vs Acumulado — distinción crítica:** algunas líneas P&G son flujos
  del periodo (Ventas Vivienda ($) en marzo = lo vendido en marzo) y otras
  son saldos acumulados (Cuota Inicial Vendido en marzo = lo recaudado total
  hasta marzo).
  - Flujos → `SUM(valor)` para sacar YTD.
  - Acumulados → `MAX(valor)` o el valor del último periodo del rango.
  - Confundirlos infla los KPIs por un orden de magnitud.
* **El código P&G es jerárquico:** "17" agrupa Ventas Vivienda; "17.1" es Un,
  "17.2" es $, "17.3" es m². Las variantes "IC" (`17.41`, `17.42`, `17.44`)
  son la porción correspondiente a IC en proyectos con socios. Para reportes
  consolidados de portafolio se usa la sin-sufijo IC. Para reportes de
  participación de IC se usa la versión IC.
* **Nuevas líneas se añaden, no se renombran:** si llega un PPTO con códigos
  nuevos, se inserta fila nueva. Nunca renombrar `codigo` de filas existentes
  porque rompe FKs lógicas con `ppto_valores`.

## Descripción

Cada fila es una línea del estado financiero proyectado, identificada por su
código numérico jerárquico (idéntico al usado en el Excel PPTO).

## Esquema

```sql
CREATE TABLE sinco_ic_targets.pyg_lineas (
  codigo        TEXT PRIMARY KEY,              -- "17.1"
  descripcion   TEXT NOT NULL,                 -- "Ventas Vivienda (Un)"
  categoria     TEXT NOT NULL,                 -- 'Ventas' | 'Escrituración' | 'Cartera' | 'Costos' | 'Flujo' | 'Otros'
  unidad        TEXT,                          -- 'Un' | '$' | 'm2' | NULL
  agregacion    TEXT NOT NULL                  -- 'flujo' | 'acumulado'
);
```

## Categorización inicial (por prefijo)

| Prefijo | Categoría | Líneas (ejemplos) |
|---|---|---|
| `1.1` | Cartera | Recaudo Fiducia |
| `1.2*` | Cartera (vendido) | Cuota Inicial / Crédito / Subsidios Vendido |
| `1.4*` | Cartera (no vendido) | Cuota Inicial / Crédito / Subsidios No Vendido |
| `1.6` / `1.8` | Otros ingresos | Ingreso Desistidos, Otros Ingresos |
| `2.*` | Costos | Lote, Lote Bruto, Urbanismo, Financieros Predio |
| `3.*` | Costos | Costo Directo, Construcción, Posventas, Imprevistos |
| `4.*` | Costos | Indirectos: Estudios, Comerciales, Impuestos, Operativos |
| `5.*` | Honorarios | Construcción, Comercialización, Gerencia, Estructuración |
| `6.*` | Financieros | F. Constructor, Capital Trabajo, Correcciones |
| `7.0` | Otros | Devolución IVA |
| `8.0` | Otros | Anticipos, CxP, Almacén |
| `9.0` | Costos | Total Costos |
| `10.0` | Flujo | FCO |
| `11.*` | Flujo | Crédito (Saldo, Cupo, Desembolsos, Amortizaciones) |
| `12.*` | Flujo | Otros Créditos |
| `13.*` / `14.*` | Aportes | Aportes/Reintegros IC y Socio |
| `15.*` | Préstamos | Préstamos Entre Etapas |
| `16.*` | Flujo | FCL, FCL Acumulado |
| `17.*` | **Ventas** | Ventas Vivienda (Un/$/m²), variantes IC |
| `18.*` | **Escrituración** | Escrituraciones (Un/$/m²), variantes IC |
| `19.*` | Flujo | Fuentes y Usos |
| `20.*` | Otros | Capitalización de Gastos |

## Categorización de `agregacion` (heurística inicial)

| Patrón | `agregacion` |
|---|---|
| `1.1`, `11.0` Saldo Crédito, `12.0` Saldo Otros Créditos, `1.24/26/28`, `1.44/46/48`, `16.1` FCL Acumulado | `acumulado` |
| Resto (incluye 17.*, 18.*, costos, honorarios, flujos del periodo) | `flujo` |

Esta clasificación se valida contra muestras del Excel (donde `valor` es
constante mes a mes hasta cierto punto y luego salta = acumulado; donde
`valor` varía mes a mes con sentido de "monto del mes" = flujo).

## Líneas relevantes para los KPIs CEO/Mónica

| KPI | Códigos a usar |
|---|---|
| Ventas YTD (Un) | `17.1` |
| Ventas YTD ($) | `17.2` |
| Ventas YTD (m²) | `17.3` |
| Escrituración YTD (Un) | `18.1` |
| Escrituración YTD ($) | `18.2` |
| Cartera pre-escritura (Cuota Inicial) | `1.24` (vendido) + `1.44` (no vendido) — ambos `acumulado` |
| Cartera post-escritura (Crédito) | `1.28` (vendido) + `1.48` (no vendido) — ambos `acumulado` |
| Cartera (Subsidios) | `1.26` (vendido) + `1.46` (no vendido) — ambos `acumulado` |
| Recaudo total | `1.1` Recaudo Fiducia — `acumulado` |

## Preguntas típicas que responde

- ¿Cómo agrego una línea para el YTD: con SUM o con MAX?
- ¿Qué líneas P&G pertenecen a la categoría "Ventas"?
- ¿Cuál es la versión IC de la línea "Ventas Vivienda ($)"?

---
[← Volver al índice](README.md)
