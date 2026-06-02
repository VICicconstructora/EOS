-- =====================================================================
-- Migración: alarma de listas de precios no actualizadas (CBR / SINCO)
-- Fecha: 2026-06-02
--
-- Objetivo: vigilar que cada etapa ACTIVA del portafolio tenga una lista
-- de precios creada en los últimos 30 días. Si no, se genera una alarma.
--
-- Fuente única de verdad: vista sinco_ic_calc.v_listas_precio_atrasadas.
-- La consumen los tres canales: el portal (/alarmas vía tabla alarms),
-- y VIC (vía RPC vic_listas_precio_atrasadas).
-- =====================================================================

-- ── 1. Ampliar el CHECK de category para admitir 'lista_precio' ──────
alter table public.alarms
  drop constraint if exists alarms_category_check;

alter table public.alarms
  add constraint alarms_category_check
  check (category in ('credito','poliza_tr','poliza_rc','licencia','lista_precio'));

-- ── 2. Vista: días desde la última lista de precios por etapa activa ─
-- El mapeo codproyecto (SINCO) -> (slug, etapa) replica la convención de
-- slugs ya usada en la tabla alarms. Solo incluye etapas del portafolio
-- activo (excluye Hacienda Real y cierres que no esperan lista nueva).
create or replace view sinco_ic_calc.v_listas_precio_atrasadas as
with mapeo(codproyecto, slug, etapa) as (values
  (113,'reserva-de-oporto','1'),(114,'reserva-de-oporto','2'),
  (115,'reserva-de-oporto','3'),(339,'reserva-de-oporto','4'),
  (158,'castilla-living','1B'),(159,'castilla-living','2A'),
  (196,'castilla-imperial','2A'),(199,'castilla-imperial','2B'),
  (200,'castilla-imperial','PARQUEADEROS'),
  (104,'praia-natura','1'),(107,'praia-natura','2'),(110,'praia-natura','3'),
  (163,'gaia','1'),(164,'gaia','2'),
  (122,'primera-este','CENTRO'),(123,'primera-este','SUR'),(124,'primera-este','NORTE'),
  (132,'la-hacienda-jamundi','1'),(135,'la-hacienda-jamundi','2'),
  (138,'la-hacienda-jamundi','3'),(340,'la-hacienda-jamundi','4'),
  (144,'bosque-central','1'),(145,'bosque-central','2'),(146,'bosque-central','3')
),
ultima as (
  select m.slug, m.etapa,
         max(lp.nombreproyecto)                       as nombre_proyecto,
         max(lp.fechacreacionlistaprecio)::date       as ultima_lista
  from mapeo m
  join sinco_ic_raw.adi_dtm_listadeprecios lp on lp.codproyecto = m.codproyecto
  group by m.slug, m.etapa
)
select
  slug,
  etapa,
  nombre_proyecto,
  ultima_lista,
  (current_date - ultima_lista) as dias_sin_actualizar,
  case when (current_date - ultima_lista) > 60  then 'alta'
       when (current_date - ultima_lista) >= 30 then 'media'
       else 'ok' end            as severidad
from ultima;

-- ── 3. RPC de solo lectura para VIC (devuelve solo lo atrasado >=30d) ─
create or replace function public.vic_listas_precio_atrasadas()
returns table (
  slug                text,
  etapa               text,
  nombre_proyecto     text,
  ultima_lista        date,
  dias_sin_actualizar integer,
  severidad           text
)
language sql
security definer
set search_path = sinco_ic_calc, public
as $$
  select slug, etapa, nombre_proyecto, ultima_lista, dias_sin_actualizar, severidad
  from sinco_ic_calc.v_listas_precio_atrasadas
  where severidad in ('alta','media')
  order by dias_sin_actualizar desc;
$$;

grant execute on function public.vic_listas_precio_atrasadas() to authenticated, service_role;
