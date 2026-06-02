-- =====================================================================
-- Migración: VIC — acceso total de SOLO LECTURA a Supabase
-- Fecha: 2026-06-02
--
-- VIC es el canal de comunicación del portal: lee TODO Supabase (todos los
-- esquemas de negocio) además del wiki. Estas RPC amplían el acceso de las
-- vic_*_sinco (acotadas a 4 esquemas) a cualquier esquema de negocio,
-- manteniendo el candado de solo-lectura.
--
-- Seguridad:
--   * SECURITY DEFINER + transacción READ ONLY + statement_timeout.
--   * Solo un statement, solo SELECT/WITH, sin DML/DDL.
--   * Bloqueo explícito de esquemas sensibles (auth, vault, storage, secretos,
--     extensiones internas). El resto del catálogo de negocio queda disponible.
-- =====================================================================

-- Esquemas que VIC NUNCA debe tocar (credenciales, sesiones, internos de Supabase).
create or replace function public._vic_esquemas_bloqueados()
returns text[] language sql immutable as $$
  select array[
    'auth','vault','storage','pgsodium','pgsodium_masks','realtime',
    'supabase_migrations','supabase_functions','net','cron','pgbouncer',
    'graphql','graphql_public','extensions','information_schema','pg_catalog','pg_toast'
  ]
$$;

-- ── Listar tablas/vistas de un esquema cualquiera (excepto bloqueados) ─
create or replace function public.vic_list_db_tables(schema_name text, name_filter text default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare result jsonb;
begin
  if schema_name = any (public._vic_esquemas_bloqueados()) then
    raise exception 'Esquema no accesible: %', schema_name;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
            'tabla', table_name,
            'tipo', case when table_type='VIEW' then 'vista' else 'tabla' end
         ) order by table_name), '[]'::jsonb)
  into result
  from information_schema.tables
  where table_schema = schema_name
    and (name_filter is null or table_name ilike '%'||name_filter||'%');
  return result;
end;
$$;

-- ── Listar los esquemas de negocio disponibles ───────────────────────
create or replace function public.vic_list_db_schemas()
returns jsonb
language sql security definer set search_path to 'public'
as $$
  select coalesce(jsonb_agg(nspname order by nspname), '[]'::jsonb)
  from pg_namespace
  where nspname <> all (public._vic_esquemas_bloqueados())
    and nspname not like 'pg_%';
$$;

-- ── Describir columnas de una tabla/vista cualquiera ─────────────────
create or replace function public.vic_describe_db_table(schema_name text, tbl_name text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare result jsonb;
begin
  if schema_name = any (public._vic_esquemas_bloqueados()) then
    raise exception 'Esquema no accesible: %', schema_name;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
            'columna', column_name,
            'tipo', data_type,
            'nullable', is_nullable
         ) order by ordinal_position), '[]'::jsonb)
  into result
  from information_schema.columns
  where table_schema = schema_name and table_name = tbl_name;
  return result;
end;
$$;

-- ── SELECT libre de solo-lectura sobre cualquier esquema de negocio ──
create or replace function public.vic_query_db(query_text text, row_limit integer default 200)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  cleaned   text;
  lowered   text;
  wrapped   text;
  result    jsonb;
  eff_limit int;
  bloq      text;
begin
  if query_text is null or btrim(query_text) = '' then
    raise exception 'Consulta vacía';
  end if;

  cleaned := btrim(query_text);
  cleaned := regexp_replace(cleaned, ';+\s*$', '');

  if position(';' in cleaned) > 0 then
    raise exception 'Solo se permite un único statement SELECT (sin ";")';
  end if;

  lowered := lower(cleaned);

  if lowered !~ '^(select|with)\s' then
    raise exception 'Solo se permiten consultas SELECT/WITH';
  end if;

  if lowered ~ '\m(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|copy|merge|call|do|vacuum|reindex|refresh|pg_read_file|pg_sleep|dblink|nextval|setval|set_config|lo_import|lo_export)\M' then
    raise exception 'La consulta contiene una operación no permitida (solo lectura)';
  end if;

  -- Bloqueo de esquemas sensibles referenciados por nombre.
  foreach bloq in array public._vic_esquemas_bloqueados() loop
    if lowered ~ ('\m'||bloq||'\s*\.') then
      raise exception 'Acceso no permitido al esquema %', bloq;
    end if;
  end loop;

  eff_limit := least(greatest(coalesce(row_limit, 200), 1), 1000);

  wrapped := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) AS q LIMIT %s) t',
                    cleaned, eff_limit);

  set local transaction_read_only = on;
  set local statement_timeout = '15s';

  execute wrapped into result;
  return result;
end;
$$;

-- VIC usa la service role key. No exponer a anon (menos privilegio).
grant execute on function public.vic_list_db_schemas()                  to authenticated, service_role;
grant execute on function public.vic_list_db_tables(text, text)         to authenticated, service_role;
grant execute on function public.vic_describe_db_table(text, text)      to authenticated, service_role;
grant execute on function public.vic_query_db(text, integer)            to authenticated, service_role;
