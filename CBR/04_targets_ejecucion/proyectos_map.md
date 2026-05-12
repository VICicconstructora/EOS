# `sinco_ic_targets.proyectos_map` (+ `proyectos_map_erp`)

> **Rol:** Catálogo / dimensión de proyectos PPTO  ·  **Filas:** 50 proyectos PPTO  ·  **Modelo:** 1:N hacia ERP

## Propósito

Define, **por proyecto del portafolio**, dos cosas críticas:

1. **Cómo se llama el proyecto en cada fuente** (PPTO vs ERP Sinco).
2. **De dónde se lee la ejecución "real"** (CRM directo o Flujo Histórico mensual).

Es la tabla puente que permite cruzar PPTO con ejecución real sin asumir
nombres iguales y sin asumir que todos los proyectos tienen datos en CRM.

## Reglas de Negocio (¡IMPORTANTE!)

* **Granularidad PPTO ≠ ERP (es 1:N).** El PPTO consolida etapas que el ERP
  separa. Por ejemplo, un solo "Bosque Central Vivienda" en PPTO equivale a 3
  filas en `adi_dtm_proyectos` (etapas 1, 2, 3). Por eso el mapeo se modela
  con una tabla hija `proyectos_map_erp` (no como dos columnas en
  `proyectos_map`).
* **Source of truth de "qué hay en el portafolio":** este catálogo, no el
  Excel. Si llega un nuevo proyecto en `Estructuracion` o se cae uno, se
  refleja aquí primero.
* **`fuente_real` controla el ruteo de queries:** los KPIs de ejecución NUNCA
  deben mezclar fuentes en una misma fila. Para cada proyecto, o lees CRM o
  lees FlujoHistorico, no ambos. Para `fuente='Estructuracion'` queda NULL
  (no hay ejecución que comparar).
* **`proyectos_map_erp` solo se popula para `fuente_real='CRM'`.** Los
  proyectos socios (`FlujoHistorico`) no tienen filas hijas — no existen en
  `adi_dtm_venta`.
* **Reclasificación entre fuentes:** un proyecto puede empezar en
  `Estructuracion` y promoverse a `Proyectos` cuando arranca ejecución
  (caso vivo: Praia E3, ver abajo).
* **Castilla Imperial — regla de parqueaderos:** los 120 parqueaderos del
  proyecto pueden asignarse a **Imperial 2B** (entrando gratis o pagos como
  parte del P&G de 2B) **o** venderse independientes vía **Imperial P** con
  su propio P&G. El ruteo del ingreso depende de cómo se vendió la unidad.
  Esto significa que los KPIs de Imperial 2B y Imperial P **no son
  agregables sin doble-conteo**: hay que sumar P&G distintos.

## Esquema

```sql
CREATE TABLE sinco_ic_targets.proyectos_map (
  proyecto_ppto    TEXT PRIMARY KEY,            -- "Bosque Central Vivienda"
  fuente           TEXT NOT NULL,               -- 'Proyectos' | 'Estructuracion'
  fuente_real      TEXT,                        -- 'CRM' | 'FlujoHistorico' | NULL (Estructuracion)
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  notas            TEXT,
  CONSTRAINT chk_fuente_real CHECK (
    (fuente = 'Estructuracion' AND fuente_real IS NULL)
    OR
    (fuente = 'Proyectos' AND fuente_real IN ('CRM','FlujoHistorico'))
  )
);

-- Hija 1:N con el ERP
CREATE TABLE sinco_ic_targets.proyectos_map_erp (
  proyecto_ppto      TEXT NOT NULL REFERENCES sinco_ic_targets.proyectos_map(proyecto_ppto) ON DELETE CASCADE,
  idproyecto         INT NOT NULL,              -- corresponde a adi_dtm_venta.idproyecto / adi_dtm_proyectos.prycodigoproyecto
  vtanombreproyecto  TEXT NOT NULL,             -- nombre tal cual aparece en adi_dtm_venta
  PRIMARY KEY (proyecto_ppto, idproyecto)
);

CREATE INDEX ON sinco_ic_targets.proyectos_map_erp (idproyecto);
```

## Mapeo PPTO ↔ ERP (resuelto)

### Proyectos en ejecución → CRM (8 macros, 14 proyectos PPTO, 17 etapas ERP)

| PPTO | ERP idproyecto(s) | ERP `vtanombreproyecto` | Ventas registradas |
|---|---|---|---|
| Bosque Central Vivienda | 144, 145, 146 | BOSQUE CENTRAL - ETAPA 1 / 2 / 3 | 545 |
| Castilla Imperial 2A | 196 | CASTILLA IMPERIAL - ETAPA 2A | 124 |
| Castilla Imperial 2B | 199 | CASTILLA IMPERIAL - ETAPA 2B | 113 |
| Castilla Imperial P | 200 | CASTILLA IMPERIAL PARQUEADEROS - ETAPA 3 | 34 |
| Castilla Living | 158, 159 | CASTILLA LIVING - ETAPA 1B / 2A | 503 |
| Gaia | 163, 164 | GAIA - ETAPA 1 / 2 | 24 |
| La Hacienda E1 | 132 | LA HACIENDA JAMUNDI - ETAPA 1 TORRE 1-9 | 147 |
| Praia E1 | 104 | PRAIA NATURA - ETAPA 1 | 119 |
| Praia E2 | 107 | PRAIA NATURA - ETAPA 2 | 144 |
| Praia E3 *(re-clasificado a Proyectos)* | 110 | PRAIA NATURA - ETAPA 3 | 2 |
| Primera Este E 1-2 | 122, 123 | PRIMERA ESTE - CENTRAL / SUR | 152 |
| Primera Este E3 | 124 | PRIMERA ESTE - NORTE | 18 |
| Reserva de Oporto E 1-2 | 113, 114 | RESERVA DE OPORTO ETAPA 1 / 2 | 549 |
| Reserva de Oporto E3 | 115, 339 | RESERVA DE OPORTO ETAPA 3 + ETAPA 4 TORRES 4 Y 5 (Torres 3, 4, 5) | 193 |

### Proyectos en ejecución → Flujo Histórico (5 macros, todas las etapas activas)

Estos no se mapean a `adi_dtm_venta`. Sus filas en `proyectos_map` quedan
sin hijas en `proyectos_map_erp`.

- Azul Celeste E1, E2, E3, E4
- Azul Turquesa E1, E2, E3, E4
- Mitika E1, E2, E3, E4
- Verde Vivo E1, E2, E3, E4
- Well

**Pendiente:** confirmar qué etapas tienen "real" en `Historico.xlsx` para
marcar `activo`. Las etapas E3/E4 con apenas 16-22 filas en PPTO
probablemente no han arrancado.

### Proyectos en pipeline → sin comparativa (20 proyectos)

`fuente='Estructuracion'`, `fuente_real=NULL`. No entran al tablero de
PPTO vs Real. Aparecen solo en tableros de "Pipeline" / "Nuevos negocios".

- Alpujarra E1, E2 · Anapoima E1, E2 · BLVD 92 · Consejo
- Fabricato E1-E4 · Gran Manzana E1, E2 · La Hacienda E2-E4
- Tierra Linda E1-E3 · Valle de Ezquio

## Excluidos del mapeo

- **HACIENDA REAL** (`idproyecto=165`, 1 venta de 2023): irrelevante.
- **CASTILLA IMPERIAL PARQUEADEROS ETAPA 2A SOLO ESCRITURACIÓN**
  (`idproyecto=338`, 5 ventas): excluido. Es un sub-proyecto de
  escrituración únicamente, no se compara contra PPTO.

## Preguntas típicas que responde

- ¿Qué proyectos son socios y por tanto necesitan Flujo Histórico para KPIs?
- ¿Cuál es la lista de `idproyecto` ERP a usar al filtrar `adi_dtm_venta`
  desde el frontend cuando el usuario escribe "Bosque Central"?
- ¿Qué proyectos están en pipeline (`fuente='Estructuracion'`) y son
  candidatos a la ROCK de "3 nuevos negocios al 30 jun 2026"?

## Patrón de query (consolidar real CRM por proyecto PPTO)

```sql
SELECT
  pm.proyecto_ppto,
  SUM(v.valorneto) AS valor_real
FROM sinco_ic_targets.proyectos_map pm
JOIN sinco_ic_targets.proyectos_map_erp pme ON pme.proyecto_ppto = pm.proyecto_ppto
JOIN sinco_ic_raw.adi_dtm_venta v ON v.idproyecto = pme.idproyecto
WHERE pm.fuente_real = 'CRM'
  AND v.fechaventa >= '2026-01-01'
GROUP BY pm.proyecto_ppto;
```

---
[← Volver al índice](README.md)
