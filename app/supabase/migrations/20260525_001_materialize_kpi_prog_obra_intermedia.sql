-- ============================================================================
-- Migración: 20260525_001_materialize_kpi_prog_obra_intermedia.sql
-- Propósito : Convertir las 4 vistas de Prog. Obra y Prog. Intermedia en
--             MATERIALIZED VIEWs para evitar statement timeout.
--             La tabla fuente (adp_dtm_vfact_controlproyecto) tiene ~900k filas /
--             711 MB y produce timeout en cada request del API.
-- Refresco   : pg_cron diario a las 02:00 UTC (aproximadamente 21:00 hora Colombia)
-- ============================================================================

-- ============================================================================
-- 1. Eliminar vistas regulares anteriores
-- ============================================================================
DROP VIEW IF EXISTS public.kpi_programacion_obra_ytd_proyecto;
DROP VIEW IF EXISTS public.kpi_programacion_obra_serie_mensual;
DROP VIEW IF EXISTS public.kpi_prog_intermedia_ytd_proyecto;
DROP VIEW IF EXISTS public.kpi_prog_intermedia_serie_mensual;


-- ============================================================================
-- 2. MATERIALIZED VIEW: kpi_programacion_obra_ytd_proyecto
-- ============================================================================
CREATE MATERIALIZED VIEW public.kpi_programacion_obra_ytd_proyecto AS
WITH base AS (
  SELECT
    "MacroProyecto Descripcion"                                               AS macro,
    SUM(CASE WHEN clase = 'P' THEN "Valor Total" ELSE 0 END) / 1e6           AS obra_ppto,
    SUM(CASE WHEN clase = 'I' THEN "Valor Total" ELSE 0 END) / 1e6           AS obra_real
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL',
    'GAIA',
    'PRAIA NATURA',
    'PRIMERA ESTE',
    'CASTILLA IMPERIAL',
    'CASTILLA LIVING',
    'LA HACIENDA JAMUNDI',
    'RESERVA DE OPORTO'
  )
  GROUP BY "MacroProyecto Descripcion"
)
SELECT
  macro                                AS proyecto_ppto,
  ROUND(obra_ppto, 0)                  AS obra_ppto,
  ROUND(obra_real, 0)                  AS obra_real,
  'ADPRO - Invertido acumulado'        AS fuente_real
FROM base
WHERE obra_ppto > 0;

CREATE UNIQUE INDEX ON public.kpi_programacion_obra_ytd_proyecto (proyecto_ppto);
GRANT SELECT ON public.kpi_programacion_obra_ytd_proyecto TO anon, authenticated;


-- ============================================================================
-- 3. MATERIALIZED VIEW: kpi_programacion_obra_serie_mensual
-- ============================================================================
CREATE MATERIALIZED VIEW public.kpi_programacion_obra_serie_mensual AS
WITH ppto_total AS (
  SELECT
    "MacroProyecto Descripcion"                       AS macro,
    SUM("Valor Total") / 1e6                          AS total_ppto_mm
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL', 'GAIA', 'PRAIA NATURA', 'PRIMERA ESTE',
    'CASTILLA IMPERIAL', 'CASTILLA LIVING', 'LA HACIENDA JAMUNDI', 'RESERVA DE OPORTO'
  )
  AND clase = 'P'
  GROUP BY "MacroProyecto Descripcion"
),
mensual AS (
  SELECT
    "MacroProyecto Descripcion"                       AS macro,
    DATE_TRUNC('month', fecha)::DATE                  AS mes,
    SUM("Valor Total") / 1e6                          AS invertido_mm
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL', 'GAIA', 'PRAIA NATURA', 'PRIMERA ESTE',
    'CASTILLA IMPERIAL', 'CASTILLA LIVING', 'LA HACIENDA JAMUNDI', 'RESERVA DE OPORTO'
  )
  AND clase = 'I'
  AND fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
  GROUP BY "MacroProyecto Descripcion", DATE_TRUNC('month', fecha)::DATE
)
SELECT
  m.macro                              AS proyecto_ppto,
  m.mes,
  ROUND(p.total_ppto_mm / 12, 0)       AS obra_ppto,
  ROUND(m.invertido_mm, 0)             AS obra_real
FROM mensual m
JOIN ppto_total p ON p.macro = m.macro
ORDER BY m.macro, m.mes;

CREATE UNIQUE INDEX ON public.kpi_programacion_obra_serie_mensual (proyecto_ppto, mes);
GRANT SELECT ON public.kpi_programacion_obra_serie_mensual TO anon, authenticated;


-- ============================================================================
-- 4. MATERIALIZED VIEW: kpi_prog_intermedia_ytd_proyecto
-- ============================================================================
CREATE MATERIALIZED VIEW public.kpi_prog_intermedia_ytd_proyecto AS
WITH base AS (
  SELECT
    "MacroProyecto Descripcion"                                                           AS macro,
    SUM(CASE WHEN clase = 'P'           THEN "Valor Total" ELSE 0 END) / 1e6             AS compras_ppto,
    SUM(CASE WHEN clase IN ('B', 'T')   THEN "Valor Total" ELSE 0 END) / 1e6             AS compras_real
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL',
    'GAIA',
    'PRAIA NATURA',
    'PRIMERA ESTE',
    'CASTILLA IMPERIAL',
    'CASTILLA LIVING',
    'LA HACIENDA JAMUNDI',
    'RESERVA DE OPORTO'
  )
  GROUP BY "MacroProyecto Descripcion"
)
SELECT
  macro                                  AS proyecto_ppto,
  ROUND(compras_ppto, 0)                 AS compras_ppto,
  ROUND(compras_real, 0)                 AS compras_real,
  'ADPRO - Contratos cerrados'           AS fuente_real
FROM base
WHERE compras_ppto > 0;

CREATE UNIQUE INDEX ON public.kpi_prog_intermedia_ytd_proyecto (proyecto_ppto);
GRANT SELECT ON public.kpi_prog_intermedia_ytd_proyecto TO anon, authenticated;


-- ============================================================================
-- 5. MATERIALIZED VIEW: kpi_prog_intermedia_serie_mensual
-- ============================================================================
CREATE MATERIALIZED VIEW public.kpi_prog_intermedia_serie_mensual AS
WITH ppto_total AS (
  SELECT
    "MacroProyecto Descripcion"                       AS macro,
    SUM("Valor Total") / 1e6                          AS total_ppto_mm
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL', 'GAIA', 'PRAIA NATURA', 'PRIMERA ESTE',
    'CASTILLA IMPERIAL', 'CASTILLA LIVING', 'LA HACIENDA JAMUNDI', 'RESERVA DE OPORTO'
  )
  AND clase = 'P'
  GROUP BY "MacroProyecto Descripcion"
),
mensual AS (
  SELECT
    "MacroProyecto Descripcion"                       AS macro,
    DATE_TRUNC('month', fecha)::DATE                  AS mes,
    SUM("Valor Total") / 1e6                          AS asegurado_mm
  FROM sinco_ic_raw.adp_dtm_vfact_controlproyecto
  WHERE "MacroProyecto Descripcion" IN (
    'BOSQUE CENTRAL', 'GAIA', 'PRAIA NATURA', 'PRIMERA ESTE',
    'CASTILLA IMPERIAL', 'CASTILLA LIVING', 'LA HACIENDA JAMUNDI', 'RESERVA DE OPORTO'
  )
  AND clase IN ('B', 'T')
  AND fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
  GROUP BY "MacroProyecto Descripcion", DATE_TRUNC('month', fecha)::DATE
)
SELECT
  m.macro                                AS proyecto_ppto,
  m.mes,
  ROUND(p.total_ppto_mm / 12, 0)         AS compras_ppto,
  ROUND(m.asegurado_mm, 0)               AS compras_real
FROM mensual m
JOIN ppto_total p ON p.macro = m.macro
ORDER BY m.macro, m.mes;

CREATE UNIQUE INDEX ON public.kpi_prog_intermedia_serie_mensual (proyecto_ppto, mes);
GRANT SELECT ON public.kpi_prog_intermedia_serie_mensual TO anon, authenticated;


-- ============================================================================
-- 6. pg_cron: refresco diario a las 02:00 UTC
--    (≈ 21:00 hora Colombia, después del cierre de operaciones)
-- ============================================================================

-- Limpiar jobs anteriores si existen
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'refresh-kpi-prog-obra-ytd',
  'refresh-kpi-prog-obra-serie',
  'refresh-kpi-prog-intermedia-ytd',
  'refresh-kpi-prog-intermedia-serie'
);

SELECT cron.schedule(
  'refresh-kpi-prog-obra-ytd',
  '0 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_programacion_obra_ytd_proyecto$$
);

SELECT cron.schedule(
  'refresh-kpi-prog-obra-serie',
  '5 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_programacion_obra_serie_mensual$$
);

SELECT cron.schedule(
  'refresh-kpi-prog-intermedia-ytd',
  '10 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_prog_intermedia_ytd_proyecto$$
);

SELECT cron.schedule(
  'refresh-kpi-prog-intermedia-serie',
  '15 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_prog_intermedia_serie_mensual$$
);
