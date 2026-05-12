# Estructura de los archivos Excel: PPTO y Flujo Histórico

Documenta el formato exacto, los snapshots disponibles y las particularidades
detectadas durante la primera carga (2026-05-07 al 2026-05-08). Sirve como
referencia para futuras actualizaciones e ingestiones incrementales.

## 1. `PPTOProyectos2026.xlsx` (presupuesto base)

**Ubicación:** `C:\Users\Administrador\Downloads\PPTOProyectos2026.xlsx`
(originalmente generado por flujo Fabric).

**Formato general:** wide-by-tab pero internamente long.

### Hojas (23)

| Hoja | Filas | Rol |
|---|---:|---|
| `PptoConsolidado` | 87,835 | **Verdad consolidada.** Es la que se carga a `ppto_valores`. |
| Por proyecto: `Well`, `VerdeVivo`, `AzulCeleste`, `AzulTurqueza`, `Mitika`, `CastillaLiving`, `Gaia`, `PrimeraEste`, `Praia`, `LaHacienda`, `ReservaOporto`, `CastillaImperial`, `BosqueCentral`, `Teraza`, `McTotal`, `PradoAlto`, `Fabricato`, `UdaraAnapoima`, `UdaraConcejo`, `BLVD92`, `GranManzana`, `ValleEzquio` | Variable | Subset de `PptoConsolidado` filtrado por proyecto. **No se cargan**, son redundantes. |

### Columnas (idénticas en todas las hojas)

| Columna | Tipo | Notas |
|---|---|---|
| `Proyecto` | string | "Azul Celeste E1", "Bosque Central Vivienda", etc. 50 distintos |
| `Fecha Datos` | date | **Fecha del snapshot del PPTO** (todas las filas: `2025-12-01`) |
| `Fuente` | string | `'Proyectos'` (operando) o `'Estructuracion'` (pipeline). 30 vs 20 proyectos |
| `P&G` | string | Código + descripción, ej. `"17.2 Ventas Vivienda ($)"` |
| `TOTAL` | numeric | Siempre 0 en muestreo. **No se carga** |
| `Fecha` | date | Periodo mensual (último día del mes) |
| `Valor` | numeric | El número |

### Snapshots disponibles

Solo **uno**: `2025-12-01` (PPTO 2026 aprobado en diciembre 2025).

### Granularidad de fecha_periodo

PPTO usa **último día del mes** (ej. `2026-03-31`, `2026-04-30`). El Historico
usa primer día del mes (ej. `2026-03-01`). Para comparar entre tablas,
truncar a mes: `DATE_TRUNC('month', fecha_periodo)`.

### Rango temporal

`2019-06-30` → `2037-07-31` (mensual). Incluye histórico retroactivo y
proyección futura.

### Reglas detectadas

- 50 proyectos sin solapamiento entre `Proyectos` (30) y `Estructuracion` (20).
- 101 líneas P&G distintas (catalogadas en `pyg_lineas`).
- Sin duplicados verificados sobre la PK lógica `(proyecto, fuente, P&G, fecha)`.

---

## 2. `Historico.xlsx` (ejecución mensual)

**Ubicación:** `C:\Users\Administrador\Downloads\Historico.xlsx`
**SharePoint:** `https://icconstructora.sharepoint.com/sites/GND/DataMart/Historico.xlsx`
**Tamaño:** 32.8 MB (mucho más grande que el PPTO porque acumula snapshots).

### Modelo conceptual: cada `Fecha Datos` es una "foto" completa

Cada `fecha_corte` (`Fecha Datos`) representa una FOTO del estado del
proyecto en ese momento. La foto contiene **dos partes** según el
`fecha_periodo` (`Fecha`) de cada fila:

| Comparativa | Significado |
|---|---|
| `fecha_periodo` < `fecha_corte` | **Histórico real ejecutado.** Lo que efectivamente pasó. |
| `fecha_periodo` ≥ `fecha_corte` | **Proyección.** Lo que la empresa espera que pase desde el momento del corte hacia adelante. |

Cuando el equipo financiero publica un nuevo corte mensual:
- Las cifras del histórico se **estabilizan** (el pasado no cambia).
- Las cifras de proyección se **re-calibran** vs el corte anterior.

Comparando dos cortes sucesivos del mismo proyecto y línea P&G se puede
reconstruir cómo evolucionó la proyección mes a mes — útil para sparklines
y análisis de "cómo iba el plan vs cómo está ahora".

### Regla crítica de filtrado para "Real ejecutado"

```sql
-- Real ejecutado YTD para un proyecto FH:
SELECT SUM(valor)
FROM sinco_ic_historico.flujo_historico
WHERE proyecto_ppto = :p
  AND pyg_codigo = '17.2'  -- Ventas Vivienda ($)
  AND fecha_corte = (SELECT MAX(fecha_corte) FROM sinco_ic_historico.flujo_historico)
  AND fecha_periodo < fecha_corte    -- ← clave: solo histórico, no proyección
  AND fecha_periodo >= '2026-01-01'
```

**Cutoff por fuente_real:**

- `CRM` → real va hasta hoy (datos transaccionales en `adi_dtm_venta` etc.).
- `FlujoHistorico` → real va hasta el **último mes histórico del corte más
  reciente** = `(DATE_TRUNC('month', MAX(fecha_corte)) - 1 día)`.

Para comparativa apples-to-apples por proyecto, el PPTO se restringe al
mismo cutoff que el real del proyecto. Esto significa que un proyecto FH
puede mostrar PPTO YTD distinto de un CRM en el mismo dashboard si el
último corte FH está atrás de hoy.

### Hojas (14)

| Hoja | Filas | Snapshots | Rol |
|---|---:|---:|---|
| `HistoricoConsolidado` | 62,486 | 1 (`2025-10-01`) | **Versión congelada antigua.** No usar — es del corte de octubre 2025 únicamente y los nombres de proyecto difieren. |
| `Well` | 25,630 | 16 (`2025-01-01` → `2026-04-01`) | Solo proyecto WELL |
| `VerdeVivo` | 95,627 | 16 | E1, E2, E3, E4 |
| `AzulCeleste` | 69,906 | 16 | E1, E2, E3, E4 |
| `AzulTurqueza` | 78,050 | 16 | E1, E2, E3, E4 (typo: "Turqueza" en hoja, "Turquesa" en datos) |
| `Mitika` | 124,709 | 16 | **8 sub-proyectos** que se consolidan a 4 etapas PPTO |
| `CastillaLiving` | 30,393 | 15 (`2025-01-01` → `2026-03-01`) | Solo Castilla Living. **CRM, no se carga** |
| `Gaia` | 34,866 | 15 | **CRM, no se carga** |
| `PrimeraEste` | 51,067 | 11 (`2025-05-01` → `2026-03-01`) | **CRM, no se carga** |
| `Praia` | 86,272 | 15 | E1, E2, E3 — **CRM, no se carga** |
| `LaHacienda` | 53,743 | 15 | E1 — **CRM, no se carga** |
| `ReservaOporto` | 51,420 | 9 (`2025-07-01` → `2026-03-01`) | **CRM, no se carga** (nombres con espacios distintos: "Reserva De Oporto E 3" vs PPTO "Reserva De Oporto E3") |
| `CastillaImperial` | 54,204 | 15 | Solo 2B. **CRM, no se carga** |
| `BosqueCentral` | 93,738 | 15 | **3 sub-proyectos**: Vivienda + Comercio + Institucional. **CRM, no se carga** |

### Columnas (idénticas a PPTO)

`Proyecto`, `Fecha Datos`, `Fuente`, `P&G`, `TOTAL`, `Fecha`, `Valor`.

`Fecha Datos` aquí es el **`fecha_corte`** (snapshot mensual). El último corte
disponible al 2026-05-08 es **`2026-04-01`** (carga publicada por el equipo
financiero a inicios de mayo).

### Universo cargado en `flujo_historico` (FH)

Solo proyectos `fuente_real='FlujoHistorico'`:

| Proyecto PPTO | Hoja origen | Filas cargadas |
|---|---|---:|
| Well | `Well` | 25,629 |
| Verde Vivo E1-E4 | `VerdeVivo` | 95,626 |
| Azul Celeste E1-E4 | `AzulCeleste` | 69,905 |
| Azul Turquesa E1-E4 | `AzulTurqueza` | 78,049 |
| Mitika E1-E4 (consolidado) | `Mitika` | 73,174 |
| **TOTAL** | | **342,383** |

Los proyectos CRM (Bosque Central, Castilla Imperial, Castilla Living, Gaia,
La Hacienda E1, Praia E1-E3, Primera Este E1-2/E3, Reserva de Oporto)
**existen en el Historico pero NO se cargan** porque su ejecución real se lee
del CRM Sinco (`sinco_ic_raw`).

### Particularidad crítica: Mitika usa dos sistemas de códigos P&G

La hoja `Mitika` mezcla snapshots con **dos esquemas de códigos P&G distintos**
para las mismas métricas:

| Métrica | Código nuevo (igual a PPTO) | Código viejo (Mitika histórico) |
|---|---|---|
| Ventas Vivienda (Un) | `17.1` | `15.1` |
| Ventas Vivienda ($) | `17.2` | `15.2` |
| Ventas Vivienda (m²) | `17.3` | `15.3` |
| Escrituraciones Vivienda (Un) | `18.1` | `16.1` ⚠️ |
| Escrituraciones Vivienda ($) | `18.2` | `16.2` |
| Escrituraciones Vivienda (m²) | `18.3` | `16.3` |

⚠️ **Conflicto en `16.1`:** en Mitika viejo significa "Escrituraciones (Un)";
en PPTO actual significa "FCL ACUMULADO". **No se puede normalizar por
código** — hay que normalizar por **descripción** y mapear a la línea
canónica de `pyg_lineas`.

### Mitika: mapeo de sub-proyectos a etapas PPTO

| Sub-proyecto en Historico | Etapa PPTO |
|---|---|
| `Mitika 1.1` | Mitika E1 |
| `Mitika 1.2` | Mitika E2 |
| `Mitika 1.2T5` | Mitika E2 |
| `Mitika 1.2T6` | Mitika E2 |
| `Mitika 1.2T7` | Mitika E2 |
| `Mitika 1.2T8` | Mitika E2 |
| `Mitika 2.1` | Mitika E3 |
| `Mitika 2.2` | Mitika E4 |

Confirmado por el CEO el 2026-05-08: "mitika 1.2 que es E2 tiene las torres
5, 6, 7 y 8".

Al cargar Mitika a `flujo_historico` se **agrega** por (proyecto_ppto,
fecha_corte, pyg_codigo, fecha_periodo) — los 5 sub-proyectos de E2 se suman.

### Otras particularidades de naming

Diferencias entre Historico y PPTO que requieren normalización al cargar:

| Historico | PPTO |
|---|---|
| `WELL` (mayúsculas) | `Well` |
| `Reserva De Oporto E 3` (espacio) | `Reserva De Oporto E3` (sin espacio) |
| `Bosque Central  Vivienda` (doble espacio en HistoricoConsolidado) | `Bosque Central Vivienda` |

Estas se manejan en el script de ingestión vía `NAME_MAP`.

### Filas inválidas detectadas

- 58 filas en Mitika con `P&G = "2/10/2025"` (fecha en lugar de código). Se
  descartan.
- ~2,700 filas en Mitika con descripciones que no mapean a `pyg_lineas` (ej.
  "Flujo de caja libre", "Ingresos acumulados", "Cuotas iniciales por vender",
  "Prestamo Etapas-Necesidad Capital"). Se descartan; no son críticas para
  los KPIs actuales.

---

## 3. Proceso de ingestión (resumen ejecutivo)

```
PPTOProyectos2026.xlsx → PptoConsolidado → ppto_valores (87,835 filas, 1 snapshot)

Historico.xlsx
  ├─ 13 hojas FH simples (Well, VerdeVivo, AzulCeleste, AzulTurqueza)
  │     → flujo_historico (269,209 filas, 16 snapshots)
  └─ Hoja Mitika (compleja: 8 sub-proyectos, 2 sistemas P&G)
        → normalizar por descripcion + agregar 1.2/T5-T8 → E2
        → flujo_historico (73,174 filas adicionales)
```

**Total cargado en `flujo_historico`: 342,383 filas.**

## 4. Cadencia de actualización

| Archivo | Frecuencia | Acción |
|---|---|---|
| PPTOProyectos2026.xlsx | Anual (con posibles ajustes) | Re-cargar con nuevo `fecha_snapshot` (preserva versiones) |
| Historico.xlsx | Mensual | Cargar solo `fecha_corte` faltante (los anteriores se preservan) |

Para evitar re-cargar todo cada mes: el script de ingestión incremental debe
hacer `INSERT ... ON CONFLICT DO NOTHING` o pre-filtrar por
`fecha_corte > MAX(fecha_corte) en BD`.

---
[← Volver al índice](README.md)
