-- =====================================================================
-- Seed: documentos CBR en tabla documents
-- Fecha: 2026-05-09
-- Ejecutar DESPUÉS de 20260509_documents_onboarding.sql
-- =====================================================================

-- Esquema principal CBR
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/esquema',
  'CBR — Esquema General de la Base de Datos',
  $doc001$# Contexto de la Base de Datos: ERP Comercial + Targets

Esta base de datos contiene modelos semánticos obtenidos de nuestro ERP con información comercial, de trámites y de cartera; **más** los datos de gestión de PPTO y Flujo Histórico que viven en schemas paralelos.

**REGLA CRÍTICA NÚMERO 1: SCHEMAS Y NOMBRES DE TABLAS**

| Schema | Origen | Cuándo usarlo |
|---|---|---|
| `sinco_ic_raw` | ETL Sinco (ERP) | Datos transaccionales: ventas, trámites, recaudo, inventarios. Fuente de verdad para proyectos propios. |
| `sinco_ic_calc` | Vistas/cálculos derivados | KPIs, agregados, vistas materializadas que mezclan raw + targets + histórico. |
| `sinco_ic_export` | Snapshots con sufijo `_s` | Versiones congeladas para Power BI / consumo externo. |
| `sinco_ic_targets` | Excel `PPTOProyectos2026.xlsx` | Presupuesto por proyecto y línea P&G. |
| `sinco_ic_historico` | Excel `Historico.xlsx` (SharePoint, mensual) | Ejecución "real" para proyectos socio (sin CRM). |

Los nombres de las tablas SIEMPRE son en minúsculas con prefijo `adi_dtm_`. NUNCA uses comillas dobles con mayúsculas.

**REGLA CRÍTICA NÚMERO 2: BÚSQUEDA DE PROYECTOS**
Usa el CATÁLOGO DE PROYECTOS para buscar coincidencias exactas. Usa igualdad exacta, no ILIKE, cuando la coincidencia es clara.

**REGLA CRÍTICA NÚMERO 3: VENTAS NETAS VS BRUTAS**
Por defecto usa `adi_dtm_venta` (datos netos/activos). Solo suma `adi_dtm_desistimientosventa` cuando el usuario pida explícitamente ventas brutas o históricas.

**REGLA CRÍTICA NÚMERO 4: FUENTE DE EJECUCIÓN POR PROYECTO**
Antes de calcular KPIs de ejecución:
1. Consultar `sinco_ic_targets.proyectos_map.fuente_real` para ese proyecto.
2. Si `CRM` → leer de `sinco_ic_raw`.
3. Si `FlujoHistorico` → leer de `sinco_ic_historico.flujo_historico`.
4. Nunca mezclar ambas fuentes en la misma fila/agregación.

## Ejemplo de Consulta Común
```sql
SELECT vtanombreproyecto, SUM(valorneto) AS ventas_totales
FROM sinco_ic_raw.adi_dtm_venta
GROUP BY vtanombreproyecto;
```$doc001$,
  'cbr',
  'datos-negocio',
  array['esquema', 'base-datos', 'reglas', 'sinco'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();

-- Tabla central de ventas
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/venta',
  'CBR — adi_dtm_venta (Tabla Central de Ventas)',
  $doc002$# `adi_dtm_venta`

> **Rol:** Hecho central (fact)  ·  **Filas:** 2,682  ·  **Columnas:** 59

## Propósito
Tabla central de ventas / negocios. Corazón del modelo y base de todos los cruces financieros.

## Reglas de Negocio CRÍTICAS

- **Valor monetario para P&G:** Usar siempre `valorneto`. No usar `subtotal`.
- **Fecha de cierre comercial:** Usar `fechaventa`. Determina el mes/año de la venta.
- **Datos netos:** Esta tabla solo tiene ventas activas. Las caídas están en `adi_dtm_desistimientosventa`.

## Columnas Clave
- `idventa` — PK lógica de la venta.
- `idcomprador` — FK al comprador (quién compró).
- `idproyecto` — FK al proyecto/etapa donde se compró.
- `valorneto` — Valor pactado total para P&G.
- `fechaventa` — Fecha oficial de cierre comercial.
- `vtanombreproyecto` — Nombre del proyecto (texto, usar para filtros exactos).
- `nombrevendedor` — Asesor comercial responsable.
- `estadoventa` — Estado actual de la venta.

## Relaciones
- `idcomprador` → `adi_dtm_comprador.idcomprador`
- `idproyecto` → `adi_dtm_proyectos.prycodigoproyecto`
- Referenciada por: `adi_dtm_acuerdos_pago`, `adi_dtm_relacion_pagos`, `adi_dtm_tramites`, `adi_dtm_desistimientosventa`

## Preguntas típicas
- ¿Cuánto se vendió (valorneto) en el trimestre? → filtrar por `fechaventa`
- ¿Cuántas ventas por asesor? → agrupar por `nombrevendedor`
- ¿Ventas por proyecto? → agrupar por `vtanombreproyecto`$doc002$,
  'cbr',
  'datos-negocio',
  array['ventas', 'venta', 'adi_dtm_venta', 'fact', 'sinco'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();

-- Dimensión proyectos
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/proyectos',
  'CBR — adi_dtm_proyectos (Catálogo de Proyectos)',
  $doc003$# `adi_dtm_proyectos`

> **Rol:** Dimensión  ·  **Filas:** 28  ·  **Columnas:** 48

## Propósito
Catálogo de proyectos / etapas inmobiliarias.

## Reglas de Negocio CRÍTICAS
- **VIS (`pryvis`):** Bandera S/N muy importante. Proyectos No VIS NUNCA deben tener ingresos de Subsidios.
- **Fechas clave:** `pryfechalicencia` (inicio construcción), `pryfechapermisoventa` (inicio ventas), `pryfechapuntoequilibrio...` (desbloqueo de fondos fiduciarios).
- **Estado del proyecto:** No es variable crítica de filtro a nivel de dimensión.

## Columnas Clave
- `prycodigoproyecto` — PK del proyecto (Código Etapa Sinco).
- `prynombreproyecto` — Nombre comercial.
- `prycodmacroproy` — FK al macroproyecto.
- `pryvis` — Bandera VIS (S/N).
- `pryfechalicencia`, `pryfechapermisoventa`, `pryfechapuntoequilibrioreal` — Fechas críticas del ciclo.

## Relaciones
- `adi_dtm_venta.idproyecto` → este catálogo
- `adi_dtm_inventarios.invcodproyecto` → este catálogo$doc003$,
  'cbr',
  'datos-negocio',
  array['proyectos', 'adi_dtm_proyectos', 'dimension', 'vis'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();

-- Tabla de trámites
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/tramites',
  'CBR — adi_dtm_tramites (Trámites por Venta)',
  $doc004$# `adi_dtm_tramites`

> **Rol:** Hecho transaccional  ·  **Filas:** 186,322  ·  **Columnas:** 27

## Propósito
Trámites legales y operativos asociados a cada venta (escrituración, hipoteca, subsidios, etc.).

## Reglas de Negocio CRÍTICAS
- **Completado:** Un trámite se considera 100% completo SOLO si `"Fecha Cumplimiento" IS NOT NULL`.
- **Bloqueo:** Ventas desbloqueadas (`bloqueo = 0`) son alerta crítica diaria — indica inconsistencia.
- **CR vs CT:** Una venta usa Banco Constructor (CR) O Tercero (CT), nunca ambos. Para KPIs combinar: `IN ('CRAR','CTAR')` para radicación, `IN ('CRFA','CTFA')` para aprobación.
- **Subsidios:** Solo ventas marcadas con subsidio generan árbol SU*/OS*.

## Columnas Clave
- `idventa` — FK a la venta.
- `"Codigo Tramite"` — Tipo de trámite (ej: TRGA = firma promesa, ESEF = firma escritura).
- `"Fecha Programada"` — Nunca se modifica. Compromiso original.
- `"Fecha Cumplimiento"` — Null = pendiente, not null = completado.
- `bloqueo` — 0 = alerta, 1 = bloqueado (normal).

## Códigos Clave de Trámites (Francisco)
| Código | Descripción | KPI |
|--------|-------------|-----|
| TRGA | FIRMA PROMESA CLIENTE | KPI #1 |
| CRAR/CTAR | RADICACIÓN CRÉDITO (constructor/tercero) | KPI #2 |
| CRFA/CTFA | APROBACIÓN CRÉDITO | KPI #3 |
| SUAR | RADICACIÓN SUBSIDIO CCF | KPI #4 |
| SUEA/OSAR | APROBACIÓN SUBSIDIO | KPI #5 |
| ESEF | FIRMA ESCRITURA CLIENTE | KPI #6 |$doc004$,
  'cbr',
  'datos-negocio',
  array['tramites', 'adi_dtm_tramites', 'escrituracion', 'credito', 'subsidios'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();

-- Mapeo proyectos PPTO vs ERP
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/proyectos-map',
  'CBR — proyectos_map (Mapeo PPTO vs ERP y Fuente de Ejecución)',
  $doc005$# `sinco_ic_targets.proyectos_map`

## Propósito
Define por proyecto del portafolio:
1. Cómo se llama en cada fuente (PPTO vs ERP Sinco).
2. De dónde se lee la ejecución "real" (CRM directo o Flujo Histórico mensual).

## Reglas CRÍTICAS
- `fuente_real = 'CRM'` → leer ejecución de `sinco_ic_raw.*`
- `fuente_real = 'FlujoHistorico'` → leer de `sinco_ic_historico.flujo_historico`
- `fuente_real = NULL` → proyecto en estructuración, sin ejecución comparable

## Portafolio Activo — CRM (propios IC)
| Proyecto PPTO | IDs ERP | Nombre en adi_dtm_venta | Ventas |
|---|---|---|---|
| Bosque Central Vivienda | 144, 145, 146 | BOSQUE CENTRAL - ETAPA 1/2/3 | 545 |
| Castilla Imperial 2A | 196 | CASTILLA IMPERIAL - ETAPA 2A | 124 |
| Castilla Imperial 2B | 199 | CASTILLA IMPERIAL - ETAPA 2B | 113 |
| Castilla Imperial P | 200 | CASTILLA IMPERIAL PARQUEADEROS - ETAPA 3 | 34 |
| Castilla Living | 158, 159 | CASTILLA LIVING - ETAPA 1B/2A | 503 |
| Gaia | 163, 164 | GAIA - ETAPA 1/2 | 24 |
| La Hacienda E1 | 132 | LA HACIENDA JAMUNDI - ETAPA 1 TORRE 1-9 | 147 |
| Praia E1 | 104 | PRAIA NATURA - ETAPA 1 | 119 |
| Praia E2 | 107 | PRAIA NATURA - ETAPA 2 | 144 |
| Praia E3 | 110 | PRAIA NATURA - ETAPA 3 | 2 |
| Primera Este E 1-2 | 122, 123 | PRIMERA ESTE - CENTRAL/SUR | 152 |
| Primera Este E3 | 124 | PRIMERA ESTE - NORTE | 18 |
| Reserva de Oporto E 1-2 | 113, 114 | RESERVA DE OPORTO ETAPA 1/2 | 549 |
| Reserva de Oporto E3 | 115, 339 | RESERVA DE OPORTO ETAPA 3+4 | 193 |

## Portafolio Activo — Flujo Histórico (socios, sin CRM)
- Azul Celeste E1, E2, E3, E4
- Azul Turquesa E1, E2, E3, E4
- Mitika E1, E2, E3, E4
- Verde Vivo E1, E2, E3, E4
- Well

## Pipeline (Estructuración — 20 proyectos, sin comparativa PPTO vs Real)
Alpujarra, Anapoima, BLVD 92, Consejo, Fabricato, Gran Manzana, La Hacienda E2-E4, Tierra Linda, Valle de Ezquio, Praia E3 (reclasificado).

Estos son candidatos a la ROCA Q2 2026: cerrar 3 nuevos negocios antes del 30 jun 2026.$doc005$,
  'cbr',
  'datos-negocio',
  array['proyectos-map', 'portafolio', 'ppto', 'erp', 'fuente-real'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();

-- Targets y ejecución (PPTO vs Real)
insert into public.documents (company_id, slug, title, content, type, category, tags, is_indexed)
values (
  'ic-constructora',
  'cbr/targets-ejecucion',
  'CBR — Targets y Ejecución (PPTO vs Real)',
  $doc006$# Targets y Ejecución (PPTO vs Real)

## El Problema que Resuelve
IC Constructora maneja dos clases de proyectos:

| Clase | Gestión | Fuente de "real" |
|---|---|---|
| **Propios** | IC vende directamente | `sinco_ic_raw` (CRM/ERP Sinco) |
| **Socios** | IC participa pero no vende | Flujo Histórico (Excel mensual en SharePoint) |

## Schemas
| Schema | Origen | Frecuencia |
|---|---|---|
| `sinco_ic_targets` | Excel PPTOProyectos2026.xlsx | Anual |
| `sinco_ic_historico` | Excel Historico.xlsx | Mensual |
| `sinco_ic_raw` | ETL Sinco | Diaria |

## KPIs Principales del Portafolio
- **Ventas YTD:** Ventas acumuladas en el año vs presupuesto anual (valorneto de adi_dtm_venta)
- **Escrituración YTD:** Escrituras acumuladas vs presupuesto (trámite ESEF completado)
- **Trámites Cumplidos/Programados:** % de avance de trámites críticos
- **Cartera Pre-escritura:** Recaudo de cuotas iniciales de compradores
- **Cartera Post-escritura:** Recaudo de crédito hipotecario + subsidios

## Comparativa PPTO vs Real
```
PPTO = sinco_ic_targets.ppto_valores.valor
REAL = CASE fuente_real
         WHEN 'CRM'            THEN agregación de sinco_ic_raw.*
         WHEN 'FlujoHistorico' THEN sinco_ic_historico.flujo_historico.valor
       END
CUMPL = REAL / PPTO
```
Las vistas materializadas en `sinco_ic_calc.kpi_*` son las que consume el frontend.$doc006$,
  'cbr',
  'datos-negocio',
  array['targets', 'ppto', 'ejecucion', 'kpi', 'ventas-ytd'],
  true
)
on conflict (company_id, slug) do update
  set content = excluded.content, updated_at = now();
