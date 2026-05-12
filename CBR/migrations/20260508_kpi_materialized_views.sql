-- =============================================================================
-- Migration: convertir wrappers public.kpi_* en materialized views
-- Fecha:     2026-05-08
-- Proyecto:  Supabase IC (CBR)
-- Motivo:    Las vistas v_kpi_*_serie_mensual recomputan un CTE pesado
--            (max(snap_ppto), Seq Scan sobre ppto_valores 87k filas) en cada
--            query → 1.3 s c/u → al disparar 10 queries en paralelo desde el
--            cliente el statement_timeout (~8 s) las cancelaba.
--            La carga de datos es mensual, así que matviews + refresh manual
--            es la solución correcta.
--
-- Resultado: SELECT individual cae de ~1300 ms a ~0.2 ms (~7000× más rápido).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop wrappers existentes y crearlos como MATERIALIZED VIEW
--    (mismos nombres → el cliente no necesita cambios)
-- ---------------------------------------------------------------------------

-- YTD por proyecto (uno por KPI, ~31 filas c/u)
DROP VIEW IF EXISTS public.kpi_ventas_ytd_proyecto;
CREATE MATERIALIZED VIEW public.kpi_ventas_ytd_proyecto AS
  SELECT * FROM sinco_ic_calc.v_kpi_ventas_ytd_proyecto WITH NO DATA;
CREATE UNIQUE INDEX kpi_ventas_ytd_proyecto_pk
  ON public.kpi_ventas_ytd_proyecto(proyecto_ppto);
GRANT SELECT ON public.kpi_ventas_ytd_proyecto TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_escrituracion_ytd_proyecto;
CREATE MATERIALIZED VIEW public.kpi_escrituracion_ytd_proyecto AS
  SELECT * FROM sinco_ic_calc.v_kpi_escrituracion_ytd_proyecto WITH NO DATA;
CREATE UNIQUE INDEX kpi_escrituracion_ytd_proyecto_pk
  ON public.kpi_escrituracion_ytd_proyecto(proyecto_ppto);
GRANT SELECT ON public.kpi_escrituracion_ytd_proyecto TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_tramites_ytd_proyecto;
CREATE MATERIALIZED VIEW public.kpi_tramites_ytd_proyecto AS
  SELECT * FROM sinco_ic_calc.v_kpi_tramites_ytd_proyecto WITH NO DATA;
CREATE UNIQUE INDEX kpi_tramites_ytd_proyecto_pk
  ON public.kpi_tramites_ytd_proyecto(proyecto_ppto);
GRANT SELECT ON public.kpi_tramites_ytd_proyecto TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_cartera_ytd_proyecto;
CREATE MATERIALIZED VIEW public.kpi_cartera_ytd_proyecto AS
  SELECT * FROM sinco_ic_calc.v_kpi_cartera_ytd_proyecto WITH NO DATA;
CREATE UNIQUE INDEX kpi_cartera_ytd_proyecto_pk
  ON public.kpi_cartera_ytd_proyecto(proyecto_ppto);
GRANT SELECT ON public.kpi_cartera_ytd_proyecto TO anon, authenticated;

-- Series mensuales (12 meses × proyectos, ~150-400 filas c/u)
DROP VIEW IF EXISTS public.kpi_ventas_serie_mensual;
CREATE MATERIALIZED VIEW public.kpi_ventas_serie_mensual AS
  SELECT * FROM sinco_ic_calc.v_kpi_ventas_serie_mensual WITH NO DATA;
CREATE UNIQUE INDEX kpi_ventas_serie_mensual_pk
  ON public.kpi_ventas_serie_mensual(proyecto_ppto, mes);
GRANT SELECT ON public.kpi_ventas_serie_mensual TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_escrituracion_serie_mensual;
CREATE MATERIALIZED VIEW public.kpi_escrituracion_serie_mensual AS
  SELECT * FROM sinco_ic_calc.v_kpi_escrituracion_serie_mensual WITH NO DATA;
CREATE UNIQUE INDEX kpi_escrituracion_serie_mensual_pk
  ON public.kpi_escrituracion_serie_mensual(proyecto_ppto, mes);
GRANT SELECT ON public.kpi_escrituracion_serie_mensual TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_tramites_serie_mensual;
CREATE MATERIALIZED VIEW public.kpi_tramites_serie_mensual AS
  SELECT * FROM sinco_ic_calc.v_kpi_tramites_serie_mensual WITH NO DATA;
CREATE UNIQUE INDEX kpi_tramites_serie_mensual_pk
  ON public.kpi_tramites_serie_mensual(proyecto_ppto, mes);
GRANT SELECT ON public.kpi_tramites_serie_mensual TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_cartera_serie_mensual;
CREATE MATERIALIZED VIEW public.kpi_cartera_serie_mensual AS
  SELECT * FROM sinco_ic_calc.v_kpi_cartera_serie_mensual WITH NO DATA;
CREATE UNIQUE INDEX kpi_cartera_serie_mensual_pk
  ON public.kpi_cartera_serie_mensual(proyecto_ppto, mes);
GRANT SELECT ON public.kpi_cartera_serie_mensual TO anon, authenticated;

-- Consolidados (1 fila c/u → no se puede CONCURRENTLY sin PK sintético;
-- el refresh non-concurrent bloquea por microsegundos, aceptable mensualmente)
DROP VIEW IF EXISTS public.kpi_ceo_consolidado_total;
CREATE MATERIALIZED VIEW public.kpi_ceo_consolidado_total AS
  SELECT * FROM sinco_ic_calc.v_kpi_ceo_consolidado_total WITH NO DATA;
GRANT SELECT ON public.kpi_ceo_consolidado_total TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_ceo_consolidado_crm;
CREATE MATERIALIZED VIEW public.kpi_ceo_consolidado_crm AS
  SELECT * FROM sinco_ic_calc.v_kpi_ceo_consolidado_crm WITH NO DATA;
GRANT SELECT ON public.kpi_ceo_consolidado_crm TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_monica_consolidado_total;
CREATE MATERIALIZED VIEW public.kpi_monica_consolidado_total AS
  SELECT * FROM sinco_ic_calc.v_kpi_monica_consolidado_total WITH NO DATA;
GRANT SELECT ON public.kpi_monica_consolidado_total TO anon, authenticated;

DROP VIEW IF EXISTS public.kpi_monica_consolidado_crm;
CREATE MATERIALIZED VIEW public.kpi_monica_consolidado_crm AS
  SELECT * FROM sinco_ic_calc.v_kpi_monica_consolidado_crm WITH NO DATA;
GRANT SELECT ON public.kpi_monica_consolidado_crm TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Refresh inicial (las matviews se crearon WITH NO DATA)
--    Subo el statement_timeout porque el primer poblado lee tablas grandes
-- ---------------------------------------------------------------------------
SET LOCAL statement_timeout = '120s';

REFRESH MATERIALIZED VIEW public.kpi_ventas_ytd_proyecto;
REFRESH MATERIALIZED VIEW public.kpi_escrituracion_ytd_proyecto;
REFRESH MATERIALIZED VIEW public.kpi_tramites_ytd_proyecto;
REFRESH MATERIALIZED VIEW public.kpi_cartera_ytd_proyecto;
REFRESH MATERIALIZED VIEW public.kpi_ventas_serie_mensual;
REFRESH MATERIALIZED VIEW public.kpi_escrituracion_serie_mensual;
REFRESH MATERIALIZED VIEW public.kpi_tramites_serie_mensual;
REFRESH MATERIALIZED VIEW public.kpi_cartera_serie_mensual;
REFRESH MATERIALIZED VIEW public.kpi_ceo_consolidado_total;
REFRESH MATERIALIZED VIEW public.kpi_ceo_consolidado_crm;
REFRESH MATERIALIZED VIEW public.kpi_monica_consolidado_total;
REFRESH MATERIALIZED VIEW public.kpi_monica_consolidado_crm;

-- ---------------------------------------------------------------------------
-- 3. RPC para refresh manual (invocar desde el cliente o por job mensual)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_kpi_matviews()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sinco_ic_calc, pg_temp
AS $$
DECLARE
  start_t timestamptz := clock_timestamp();
  ms_total numeric;
BEGIN
  -- YTD y series con CONCURRENTLY (no bloquean lectores)
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_ventas_ytd_proyecto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_escrituracion_ytd_proyecto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_tramites_ytd_proyecto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_cartera_ytd_proyecto;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_ventas_serie_mensual;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_escrituracion_serie_mensual;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_tramites_serie_mensual;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_cartera_serie_mensual;

  -- Consolidados (1 fila c/u): non-concurrent — bloquea por microsegundos
  REFRESH MATERIALIZED VIEW public.kpi_ceo_consolidado_total;
  REFRESH MATERIALIZED VIEW public.kpi_ceo_consolidado_crm;
  REFRESH MATERIALIZED VIEW public.kpi_monica_consolidado_total;
  REFRESH MATERIALIZED VIEW public.kpi_monica_consolidado_crm;

  ms_total := EXTRACT(EPOCH FROM clock_timestamp() - start_t) * 1000;

  RETURN jsonb_build_object(
    'refreshed_at', clock_timestamp(),
    'duration_ms', round(ms_total)
  );
END;
$$;

-- anon hereda EXECUTE por default en Supabase; revoco explícitamente para que
-- sólo usuarios logueados puedan disparar el refresh (es caro: ~3-15 s).
REVOKE ALL ON FUNCTION public.refresh_kpi_matviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_kpi_matviews() TO authenticated;
COMMENT ON FUNCTION public.refresh_kpi_matviews() IS
  'Refresca todas las materialized views kpi_*. Llamar después de cargar el Excel mensual. Duración esperada: 5-15 s.';
