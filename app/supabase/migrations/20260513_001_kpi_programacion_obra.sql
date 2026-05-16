-- ============================================================================
-- Migración: 20260513_001_kpi_programacion_obra.sql
-- Propósito : Vistas KPI de Programación de Obra YTD.
-- Fuente    : sinco_ic_raw.adp_dtm_vfact_controlproyecto (ADPRO)
--   obra_ppto = SUM(Valor Total) WHERE clase='P'  → presupuesto total del proyecto
--   obra_real = SUM(Valor Total) WHERE clase='I'  → invertido acumulado a la fecha
-- Unidad    : MM$ (millones COP)
-- Responsable: Andrés Arango (Gerencia de Construcción)
-- ============================================================================

-- ============================================================================
-- Vista 1: kpi_programacion_obra_ytd_proyecto
-- Un registro por macroproyecto con presupuesto total vs invertido acumulado.
-- ============================================================================
CREATE OR REPLACE VIEW public.kpi_programacion_obra_ytd_proyecto AS
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


-- ============================================================================
-- Vista 2: kpi_programacion_obra_serie_mensual
-- Serie mensual (últimos 12 meses) para la línea de tendencia (sparkline).
--   obra_ppto = presupuesto mensual prorrateado (ppto_total / 12)
--   obra_real = invertido real del mes (clase='I')
-- ============================================================================
CREATE OR REPLACE VIEW public.kpi_programacion_obra_serie_mensual AS
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
