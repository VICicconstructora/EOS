# CBR · Modelo Power BI ↔ Supabase

Documentación funcional del modelo de datos de CBR (Sinco IC) replicado desde el modelo semántico de Power BI hacia el esquema `sinco_ic_raw` en Supabase.

**Resumen:** 15 tablas · ~459,732 filas · 419 columnas · 13 relaciones FK + 1 NOT VALID + dimensión de tiempo `mc_calendar`.

## Cómo usar esta documentación

Cada tabla tiene su propio archivo `.md` con: propósito, columnas clave, relaciones (entrantes y salientes), preguntas típicas que responde, y el esquema completo.

**Para responder preguntas del modelo, navega así:**

1. Identifica el **dominio** de la pregunta (venta, pago, trámite, comprador, proyecto, etc.).
2. Abre el `README.md` de la categoría correspondiente.
3. Entra al `.md` específico de la tabla.
4. La sección **Relaciones** te indica con qué otras tablas hacer JOIN.

## Jerarquía de archivos

```
docs/
├── README.md                    ← estás aquí
├── 01_dimensiones/                (Dimensiones)
│   ├── README.md
│   ├── adi_dtm_comprador.md
│   ├── adi_dtm_conceptospp.md
│   ├── adi_dtm_inventarios.md
│   ├── adi_dtm_listadeprecios.md
│   ├── adi_dtm_macroproyectos.md
│   ├── adi_dtm_proyectos.md
│   ├── adi_dtm_tiposventa.md
│   └── mc_calendar.md
├── 02_core/                (Hecho central)
│   ├── README.md
│   └── adi_dtm_venta.md
├── 03_transacciones/                (Transacciones)
│   ├── README.md
│   ├── adi_dtm_acuerdos_pago.md
│   ├── adi_dtm_desistimientosventa.md
│   ├── adi_dtm_listadeprecios_detalle.md
│   ├── adi_dtm_relacion_pagos.md
│   ├── adi_dtm_tramites.md
│   └── adi_dtm_variablestextoventas.md
```

## Índice de tablas

### Dimensiones  ([ver categoría](01_dimensiones/README.md))

| Tabla | Filas | Cols | Propósito |
|---|---:|---:|---|
| [`adi_dtm_comprador`](01_dimensiones/adi_dtm_comprador.md) | 2,548 | 76 | Catálogo de compradores (personas/empresas que adquieren unidades). |
| [`adi_dtm_conceptospp`](01_dimensiones/adi_dtm_conceptospp.md) | 82 | 8 | Catálogo de conceptos de plan de pagos (Cuota inicial, Mensualidad, Saldo, etc.). |
| [`adi_dtm_inventarios`](01_dimensiones/adi_dtm_inventarios.md) | 4,402 | 44 | Inventario físico de unidades disponibles (apartamentos, casas, lotes). |
| [`adi_dtm_listadeprecios`](01_dimensiones/adi_dtm_listadeprecios.md) | 453 | 22 | Cabecera de listas de precios (una por proyecto / fecha de vigencia). |
| [`adi_dtm_macroproyectos`](01_dimensiones/adi_dtm_macroproyectos.md) | 9 | 19 | Catálogo de macroproyectos: agrupaciones de varios proyectos/etapas que pertenecen a un mismo desarrollo inmobiliario. |
| [`adi_dtm_proyectos`](01_dimensiones/adi_dtm_proyectos.md) | 28 | 48 | Catálogo de proyectos / etapas inmobiliarias. |
| [`adi_dtm_tiposventa`](01_dimensiones/adi_dtm_tiposventa.md) | 4 | 5 | Catálogo de tipos de venta (Normal, Promesa, Escrituración, etc.). |
| [`mc_calendar`](01_dimensiones/mc_calendar.md) | 18,627 | 0 | Dimensión de calendario (todos los días entre 2000-01-02 y 2050-12-31). |

### Hecho central  ([ver categoría](02_core/README.md))

| Tabla | Filas | Cols | Propósito |
|---|---:|---:|---|
| [`adi_dtm_venta`](02_core/adi_dtm_venta.md) | 2,682 | 59 | Tabla central de ventas / negocios. Es el corazón del modelo. |

### Transacciones  ([ver categoría](03_transacciones/README.md))

| Tabla | Filas | Cols | Propósito |
|---|---:|---:|---|
| [`adi_dtm_acuerdos_pago`](03_transacciones/adi_dtm_acuerdos_pago.md) | 65,291 | 22 | Plan de pagos pactado con el comprador, fila por cuota. |
| [`adi_dtm_desistimientosventa`](03_transacciones/adi_dtm_desistimientosventa.md) | 811 | 28 | Ventas que fueron canceladas / desistidas por el comprador. |
| [`adi_dtm_listadeprecios_detalle`](03_transacciones/adi_dtm_listadeprecios_detalle.md) | 85,043 | 14 | Renglones de precio por unidad dentro de una lista de precios. |
| [`adi_dtm_relacion_pagos`](03_transacciones/adi_dtm_relacion_pagos.md) | 92,369 | 25 | Pagos efectivamente recibidos (consignaciones reales). |
| [`adi_dtm_tramites`](03_transacciones/adi_dtm_tramites.md) | 186,322 | 27 | Trámites legales y operativos asociados a cada venta (escrituración, hipoteca, etc.). |
| [`adi_dtm_variablestextoventas`](03_transacciones/adi_dtm_variablestextoventas.md) | 1,061 | 8 | Campos de texto personalizables que CBR define por venta (clausulas, notas, etc.). |

## Mapa de relaciones

Diagrama compacto del flujo (1 → N de izquierda a derecha):

```
                                           ┌──────────────────────┐
                                           │  adi_dtm_macroproy.  │
                                           └──────────┬───────────┘
                                                      │ N:1
                ┌──────────────────────┐    ┌─────────▼───────────┐    ┌──────────────────────┐
                │  adi_dtm_comprador   │    │  adi_dtm_proyectos  │    │  adi_dtm_tiposventa  │
                └──────────┬───────────┘    └──────────┬──────────┘    └─────────┬────────────┘
                           │ 1:N                       │ 1:N                     │ 1:N
                           │                           │                         │
                           ▼                           ▼                         ▼
                ┌────────────────────────────────────────────────────────────────────┐
                │                       adi_dtm_venta  (CORE)                       │
                └──────────┬─────────────┬──────────────┬───────────────┬───────────┘
                  1:N      │       1:N   │        1:N   │      1:N      │  1:N
        ┌─────────────┐ ┌──▼──────────┐ ┌▼─────────────┐│ ┌────────────▼┐ ┌──────────────────┐
        │ acuerdos_   │ │ relacion_   │ │  tramites    │ │ desistimien-│ │ variables-       │
        │ pago        │ │ pagos       │ │              │ │ tosventa    │ │ textoventas      │
        └──────┬──────┘ └─────────────┘ └──────────────┘ │ (NOT VALID) │ └──────────────────┘
               │ N:1                                     └─────────────┘
               ▼
        ┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
        │ conceptospp │    │ listadeprecios   │◄───│ listadeprecios_  │───►│ proyectos    │
        └─────────────┘    └──────────────────┘ N:1│ detalle          │N:1 └──────────────┘
                                                   └──────────────────┘
        ┌─────────────┐
        │ inventarios │ ──N:1──► proyectos
        └─────────────┘
        ┌─────────────┐
        │ mc_calendar │ ◄── (opcional) acuerdos_pago.fecha,
        └─────────────┘                relacion_pagos.fechaconsignacion,
                                       tramites."Fecha Programada"
```

## Convenciones para preguntas

- Las preguntas sobre **cuánto se vendió / cuántos negocios** parten de `adi_dtm_venta`.
- Las preguntas sobre **dinero recibido** parten de `adi_dtm_relacion_pagos`.
- Las preguntas sobre **dinero pactado / cartera** parten de `adi_dtm_acuerdos_pago`.
- Las preguntas sobre **estado legal / escrituración** parten de `adi_dtm_tramites`.
- Las preguntas sobre **desistimiento / cancelación** parten de `adi_dtm_desistimientosventa`.
- Las preguntas sobre **inventario / unidades disponibles** parten de `adi_dtm_inventarios`.
- Cualquier corte por **tiempo** se resuelve uniendo a `mc_calendar` (o usando directamente la columna fecha).

## Archivos relacionados (raíz del proyecto)

- `../pbi_to_supabase_relationships.sql` — DDL aplicado en Supabase: PKs, FKs y `mc_calendar`.
- `../pbi_relationships_candidates.csv` — inventario completo de relaciones detectadas en Power BI con su estado (CANDIDATE, OMITTED_INACTIVE, OMITTED_BIDIRECTIONAL, CALENDAR_DIM).

---
_Documentación generada el 2026-04-18 a partir del modelo PBI Desktop (CBR.pbix) y el esquema `sinco_ic_raw` en Supabase._