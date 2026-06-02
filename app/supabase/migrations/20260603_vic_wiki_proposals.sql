-- =====================================================================
-- Migración: VIC — buzón de propuestas para el wiki (wiki_proposals)
-- Fecha: 2026-06-03
--
-- Permite que VIC ALIMENTE el wiki sin tener escritura sobre él.
-- Cuando un usuario aporta un dato nuevo en una conversación, VIC NO
-- escribe en el wiki: encola una PROPUESTA en esta tabla. El CEO (o un
-- curador delegado por área) la revisa, aprueba o rechaza. Solo las
-- aprobadas se ingestan al wiki real (proceso local, fuera del bot).
--
-- Seguridad — el candado de solo-lectura del resto NO se toca:
--   * VIC sigue sin poder escribir en wiki_documents ni en datos de negocio.
--   * La ÚNICA escritura permitida a VIC es INSERT en esta tabla, vía la
--     RPC vic_propose_wiki_update (SECURITY DEFINER, angosta).
--   * El cambio de estado (aprobar/rechazar) lo hacen curadores autenticados,
--     no VIC.
-- =====================================================================

-- ── Tabla del buzón ──────────────────────────────────────────────────
create table if not exists public.wiki_proposals (
  id                 uuid primary key default gen_random_uuid(),
  company_id         text not null default 'ic-constructora',

  -- Qué se propone
  tipo               text not null check (tipo in ('persona','proyecto','proceso','otro')),
  entidad_objetivo   text,            -- ficha del wiki a la que aplicaría, ej: wiki/personas/monica-baez.md (puede ser nueva)
  contenido          text not null,   -- el dato afirmado, redactado limpio por VIC
  cita_textual       text,            -- lo que dijo el usuario, para juzgar contexto
  confianza          text not null default 'media' check (confianza in ('alta','media','baja')),

  -- Quién y de dónde
  area               text,            -- para enrutar al curador: TI, Experiencia, Desarrollo, etc.
  propuesto_por      text not null,   -- email del usuario que aportó el dato
  origen_conversacion text,           -- id de conversación de Teams (trazabilidad)

  -- Curaduría
  estado             text not null default 'pendiente'
                       check (estado in ('pendiente','aprobada','rechazada','ingerida')),
  revisado_por       text,            -- email del curador que cambió el estado
  nota_revision      text,            -- por qué se rechazó / qué se ajustó al aprobar
  revisado_at        timestamptz,

  created_at         timestamptz not null default now()
);

create index if not exists idx_wiki_proposals_estado on public.wiki_proposals (estado, created_at desc);
create index if not exists idx_wiki_proposals_area   on public.wiki_proposals (area);

-- Dedup: evita encolar dos propuestas pendientes idénticas (mismo objetivo + contenido).
create unique index if not exists uq_wiki_proposals_pendiente
  on public.wiki_proposals (coalesce(entidad_objetivo,''), md5(contenido))
  where estado = 'pendiente';

-- ── RLS ──────────────────────────────────────────────────────────────
-- La tabla NO se expone por API anon. VIC escribe solo vía la RPC de abajo
-- (service_role). La lectura/curaduría la hace la app con usuarios autenticados.
alter table public.wiki_proposals enable row level security;

drop policy if exists wiki_proposals_select_auth on public.wiki_proposals;
create policy wiki_proposals_select_auth on public.wiki_proposals
  for select to authenticated
  using (company_id = 'ic-constructora');

drop policy if exists wiki_proposals_update_auth on public.wiki_proposals;
create policy wiki_proposals_update_auth on public.wiki_proposals
  for update to authenticated
  using (company_id = 'ic-constructora')
  with check (company_id = 'ic-constructora');

-- Sin policy de INSERT/DELETE para authenticated/anon: nadie inserta a mano.
-- El INSERT entra únicamente por la RPC SECURITY DEFINER (service_role).

-- ── Allowlist del piloto ─────────────────────────────────────────────
-- Solo estos correos pueden APORTAR propuestas durante el piloto. Ampliar
-- el rollout = agregar filas aquí (sin redeploy del bot).
create table if not exists public.vic_piloto_aportes (
  email      text primary key,
  area       text,                    -- área por defecto para enrutar sus propuestas
  nota       text,
  created_at timestamptz not null default now()
);

insert into public.vic_piloto_aportes (email, area, nota) values
  ('lserrano@icconstructora.co', 'TI',          'Gerente de TI — curador delegado TI'),
  ('erozo@icconstructora.co',    'Desarrollo',  'Director de Estructuración Financiera'),
  ('mmartinez@icconstructora.co','Experiencia', 'Coordinadora de Mercadeo y Comunicaciones'),
  ('dbenavides@icconstructora.co','Desarrollo', 'Diego Iván Benavides — Coordinador de Proyectos')
on conflict (email) do nothing;

-- ── RPC: la ÚNICA grieta de escritura para VIC ───────────────────────
-- Inserta una propuesta SOLO si el proponente está en el allowlist del piloto.
-- Si no, rechaza (durante el piloto VIC no encola de cualquiera).
-- Devuelve el id de la propuesta, o lanza excepción si el aporte no aplica.
create or replace function public.vic_propose_wiki_update(
  p_proposto_por       text,
  p_tipo               text,
  p_contenido          text,
  p_entidad_objetivo   text  default null,
  p_cita_textual       text  default null,
  p_confianza          text  default 'media',
  p_origen_conversacion text default null
)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_area    text;
  v_id      uuid;
begin
  if p_proposto_por is null or btrim(p_proposto_por) = '' then
    raise exception 'Falta el correo del proponente';
  end if;
  if p_contenido is null or btrim(p_contenido) = '' then
    raise exception 'La propuesta no puede estar vacía';
  end if;

  -- Allowlist del piloto: solo estos correos pueden aportar.
  select area into v_area
  from public.vic_piloto_aportes
  where lower(email) = lower(btrim(p_proposto_por));

  if not found then
    raise exception 'Proponente fuera del piloto: %', p_proposto_por;
  end if;

  -- Dedup: si ya hay una pendiente idéntica, no duplica; devuelve la existente.
  select id into v_id
  from public.wiki_proposals
  where estado = 'pendiente'
    and coalesce(entidad_objetivo,'') = coalesce(p_entidad_objetivo,'')
    and md5(contenido) = md5(p_contenido)
  limit 1;

  if found then
    return jsonb_build_object('id', v_id, 'estado', 'pendiente', 'duplicada', true);
  end if;

  insert into public.wiki_proposals
    (tipo, entidad_objetivo, contenido, cita_textual, confianza,
     area, propuesto_por, origen_conversacion)
  values
    (coalesce(p_tipo,'otro'), p_entidad_objetivo, p_contenido, p_cita_textual,
     coalesce(p_confianza,'media'), v_area, btrim(p_proposto_por), p_origen_conversacion)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'estado', 'pendiente', 'duplicada', false);
end;
$$;

-- VIC usa la service role key. No exponer a anon.
grant execute on function public.vic_propose_wiki_update(text,text,text,text,text,text,text)
  to service_role;
