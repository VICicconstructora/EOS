-- ============================================================================
-- Vista materializada: mv_proyectos_kpis
-- Fecha: 2026-05-29
-- KPIs por proyecto desde public.historico (último corte disponible).
-- Vista materializada → resultados precomputados, sin timeout.
-- Refrescar tras cada sync: REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_proyectos_kpis;
-- ============================================================================

DROP VIEW IF EXISTS public.vw_proyectos_kpis;

CREATE MATERIALIZED VIEW public.mv_proyectos_kpis AS
WITH
  ultimo_corte AS (
    SELECT proyecto, MAX(fecha_datos) AS fecha_datos
    FROM public.historico
    GROUP BY proyecto
  ),
  -- Cupo: MAX = cupo original aprobado del crédito constructor.
  -- El saldo disponible disminuye mes a mes con los desembolsos, así que
  -- MAX(valor) recupera el límite inicial, que es el denominador correcto.
  cupo_base AS (
    SELECT h.proyecto, MAX(h.valor) AS cupo_credito
    FROM public.historico h
    JOIN ultimo_corte uc ON uc.proyecto = h.proyecto
    WHERE h.pg = '11.7 Cupo'
      AND h.tipo_dato = 'HISTORICO'
      AND h.fecha <= uc.fecha_datos
    GROUP BY h.proyecto
  ),
  kpis AS (
    SELECT
      h.proyecto,
      uc.fecha_datos,
      SUM(CASE WHEN h.pg = '17.12 Un vendidas'          AND h.tipo_dato = 'HISTORICO' AND h.fecha <= uc.fecha_datos THEN h.valor ELSE 0 END) AS ventas_un,
      SUM(CASE WHEN h.pg = '17.22 Vendido Vivienda ($)' AND h.tipo_dato = 'HISTORICO' AND h.fecha <= uc.fecha_datos THEN h.valor ELSE 0 END) AS ventas_cop,
      SUM(CASE WHEN h.pg = '1.28 Credito Vendido'       AND h.tipo_dato = 'HISTORICO' AND h.fecha <= uc.fecha_datos THEN h.valor ELSE 0 END) AS credito_ingresos
    FROM public.historico h
    JOIN ultimo_corte uc ON uc.proyecto = h.proyecto
    GROUP BY h.proyecto, uc.fecha_datos
  )
SELECT
  k.proyecto,
  k.fecha_datos,
  k.ventas_un,
  k.ventas_cop,
  k.credito_ingresos,
  COALESCE(cb.cupo_credito, 0) AS cupo_credito,
  CASE
    WHEN COALESCE(cb.cupo_credito, 0) > 0
    THEN ROUND((k.credito_ingresos / cb.cupo_credito * 100)::numeric, 1)
    ELSE NULL
  END AS cubrimiento_pct
FROM kpis k
LEFT JOIN cupo_base cb ON cb.proyecto = k.proyecto
ORDER BY k.proyecto;

-- Índice único → permite REFRESH CONCURRENTLY (sin bloquear lecturas)
CREATE UNIQUE INDEX mv_proyectos_kpis_pkey ON public.mv_proyectos_kpis (proyecto);

-- Acceso REST para el cliente anon
GRANT SELECT ON public.mv_proyectos_kpis TO anon, authenticated;
