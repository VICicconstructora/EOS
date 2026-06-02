-- =====================================================================
-- Migración: recompute de alarmas de listas de precios + tracking de push
-- Fecha: 2026-06-02
--
-- 1. Columna pushed_at en alarms: marca cuándo VIC notificó la alarma al
--    usuario, para no enviarla dos veces.
-- 2. Función recompute_alarmas_listas_precio(): recalcula desde la vista y
--    hace upsert en alarms (idempotente). La llama pg_cron semanalmente y
--    también la Edge Function de push antes de enviar.
-- =====================================================================

alter table public.alarms
  add column if not exists pushed_at timestamptz;

create or replace function public.recompute_alarmas_listas_precio()
returns integer
language plpgsql
security definer
set search_path = public, sinco_ic_calc
as $$
declare n integer;
begin
  insert into public.alarms
    (company_id, external_id, project, category, etapa, detail,
     severity, expires_at, dias, status, last_seen_at, updated_at)
  select
    'ic-constructora',
    slug || '::' || etapa || '::lista_precio',
    slug, 'lista_precio', etapa,
    'Última lista de precios creada el ' || to_char(ultima_lista,'YYYY-MM-DD')
       || ' (' || dias_sin_actualizar || ' días sin actualizar) — ' || nombre_proyecto,
    severidad, ultima_lista, -dias_sin_actualizar,
    'active', now(), now()
  from sinco_ic_calc.v_listas_precio_atrasadas
  where severidad in ('alta','media')
  on conflict (company_id, external_id) do update set
    detail       = excluded.detail,
    severity     = excluded.severity,
    expires_at   = excluded.expires_at,
    dias         = excluded.dias,
    status       = case when public.alarms.status = 'resolved' then 'active' else public.alarms.status end,
    last_seen_at = now(),
    updated_at   = now();

  get diagnostics n = row_count;

  -- Resolver las que ya no aplican (volvieron a estar al día): estaban activas,
  -- son de categoría lista_precio, y no se vieron en este recompute.
  update public.alarms
     set status = 'resolved', resolved_at = now(), updated_at = now()
   where company_id = 'ic-constructora'
     and category = 'lista_precio'
     and status in ('active','acknowledged')
     and last_seen_at < now() - interval '1 minute';

  return n;
end;
$$;

-- ESCRIBE en alarms: solo service_role (Edge Function) y postgres (pg_cron).
-- No exponer a anon/authenticated.
revoke execute on function public.recompute_alarmas_listas_precio() from public;
grant  execute on function public.recompute_alarmas_listas_precio() to service_role;
