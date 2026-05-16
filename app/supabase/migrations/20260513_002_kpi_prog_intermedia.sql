-- ============================================================================
-- Migración: 20260513_002_kpi_prog_intermedia.sql
-- Propósito : Vistas KPI de Programación Intermedia de Compras YTD.
-- Fuente    : sinco_ic_raw.adp_dtm_vfact_controlproyecto (ADPRO)
--   contratos_programados = SUM(Valor Total) WHERE clase='P'       → presupuesto a contratar
--   contratos_cerrados    = SUM(Valor Total) WHERE clase IN ('B','T') → asegurado (contratado)
-- Unidad    : MM$ (millones COP)
-- Responsable: Marcela Arroyave (Gerencia de Control — Compras)
-- Concepto  : contratos_cerrados / contratos_programados × 100
-- ============================================================================

-- ============================================================================
-- Vista 1: kpi_prog_intermedia_ytd_proyecto
-- Un registro por macroproyecto con presupuesto total vs asegurado acumulado.
-- ============================================================================
CREATE OR REPLACE VIEW public.kpi_prog_intermedia_ytd_proyecto AS
WITH base AS (
  SELECT
    "MacroProyecto Descripcion"                                                           AS macro,
    SUM(CASE WHEN clase = 'P'           THEN "Valor Total" ELSE 0 END) / 1e6             AS contratos_programados,
    SUM(CASE WHEN clase IN ('B', 'T')   THEN "Valor Total" ELSE 0 END) / 1e6             AS contratos_cerrados
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
  ROUND(contratos_programados, 0)        AS contratos_programados,
  ROUND(contratos_cerrados, 0)           AS contratos_cerrados,
  'ADPRO - Asegurado acumulado'          AS fuente_real
FROM base
WHERE contratos_programados > 0;


-- ============================================================================
-- Vista 2: kpi_prog_intermedia_serie_mensual
-- Serie mensual (últimos 12 meses) para la línea de tendencia (sparkline).
--   contratos_programados = presupuesto mensual prorrateado (ppto_total / 12)
--   contratos_cerrados    = asegurado real del mes (clase B o T)
-- ============================================================================
CREATE OR REPLACE VIEW public.kpi_prog_intermedia_serie_mensual AS
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
  ROUND(p.total_ppto_mm / 12, 0)         AS contratos_programados,
  ROUND(m.asegurado_mm, 0)               AS contratos_cerrados
FROM mensual m
JOIN ppto_total p ON p.macro = m.macro
ORDER BY m.macro, m.mes;
