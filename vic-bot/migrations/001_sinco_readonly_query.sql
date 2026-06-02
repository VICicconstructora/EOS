-- =====================================================================
-- VIC — Acceso SQL de solo-lectura a los datos de SINCO (CBR/ADPRO/AyF)
-- =====================================================================
-- Aplicado en Supabase IC el 2026-06-02 vía MCP. Este archivo versiona el
-- DDL para que sea reproducible. Ejecutar en el SQL Editor de Supabase si
-- hay que recrear las funciones en otro entorno.
--
-- Las tres funciones son SECURITY DEFINER y solo las puede invocar service_role.
-- vic_query_sinco impone tres candados de solo-lectura:
--   1. Validación de texto: debe empezar por SELECT/WITH, un solo statement.
--   2. Blacklist de palabras de escritura/DDL.
--   3. SET LOCAL transaction_read_only = on → Postgres rechaza toda escritura
--      a nivel de motor aunque la validación de texto fallara.
-- Además fuerza LIMIT (máx 1000) y statement_timeout de 15s.

-- ---------------------------------------------------------------------
-- 1) Consulta SQL de solo-lectura
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vic_query_sinco(query_text text, row_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sinco_ic_raw, sinco_ic_targets, sinco_ic_historico, sinco_ic_calc, public
AS $$
DECLARE
  cleaned   text;
  lowered   text;
  wrapped   text;
  result    jsonb;
  eff_limit int;
BEGIN
  IF query_text IS NULL OR btrim(query_text) = '' THEN
    RAISE EXCEPTION 'Consulta vacía';
  END IF;

  cleaned := btrim(query_text);
  cleaned := regexp_replace(cleaned, ';+\s*$', '');  -- quitar ; final

  IF position(';' IN cleaned) > 0 THEN
    RAISE EXCEPTION 'Solo se permite un único statement SELECT (sin ";")';
  END IF;

  lowered := lower(cleaned);

  IF lowered !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'Solo se permiten consultas SELECT/WITH';
  END IF;

  IF lowered ~ '\m(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|copy|merge|call|do|vacuum|reindex|refresh|pg_read_file|pg_sleep|dblink|nextval|setval)\M' THEN
    RAISE EXCEPTION 'La consulta contiene una operación no permitida (solo lectura)';
  END IF;

  eff_limit := least(greatest(coalesce(row_limit, 200), 1), 1000);

  wrapped := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) AS q LIMIT %s) t',
                    cleaned, eff_limit);

  SET LOCAL transaction_read_only = on;
  SET LOCAL statement_timeout = '15s';

  EXECUTE wrapped INTO result;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- 2) Catálogo: listar tablas/vistas de un esquema SINCO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vic_list_sinco_tables(schema_name text, name_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF schema_name NOT IN ('sinco_ic_raw','sinco_ic_targets','sinco_ic_historico','sinco_ic_calc') THEN
    RAISE EXCEPTION 'Esquema no permitido: %', schema_name;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
            'tabla', table_name,
            'tipo', CASE WHEN table_type='VIEW' THEN 'vista' ELSE 'tabla' END
         ) ORDER BY table_name), '[]'::jsonb)
  INTO result
  FROM information_schema.tables
  WHERE table_schema = schema_name
    AND (name_filter IS NULL OR table_name ILIKE '%'||name_filter||'%');

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- 3) Catálogo: describir columnas de una tabla/vista SINCO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vic_describe_sinco_table(schema_name text, tbl_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF schema_name NOT IN ('sinco_ic_raw','sinco_ic_targets','sinco_ic_historico','sinco_ic_calc') THEN
    RAISE EXCEPTION 'Esquema no permitido: %', schema_name;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
            'columna', column_name,
            'tipo', data_type
         ) ORDER BY ordinal_position), '[]'::jsonb)
  INTO result
  FROM information_schema.columns
  WHERE table_schema = schema_name AND table_name = tbl_name;

  IF result = '[]'::jsonb THEN
    RAISE EXCEPTION 'Tabla no encontrada: %.%', schema_name, tbl_name;
  END IF;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- Permisos: solo el servidor (service_role) puede invocarlas. Nunca anon.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.vic_query_sinco(text, int)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vic_list_sinco_tables(text, text)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vic_describe_sinco_table(text, text)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.vic_query_sinco(text, int)           TO service_role;
GRANT EXECUTE ON FUNCTION public.vic_list_sinco_tables(text, text)    TO service_role;
GRANT EXECUTE ON FUNCTION public.vic_describe_sinco_table(text, text) TO service_role;
