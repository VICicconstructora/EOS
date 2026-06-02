-- =====================================================================
-- Migración: infraestructura de push proactivo de VIC a Teams
-- Fecha: 2026-06-02
--
-- Bot Framework solo puede enviar un mensaje proactivo si ya tiene una
-- "conversation reference" del usuario (se captura la primera vez que el
-- usuario le escribe a VIC). La guardamos aquí para poder iniciar el DM.
-- =====================================================================

-- Referencias de conversación capturadas por el bot (una por usuario/Teams).
create table if not exists public.vic_conversation_refs (
  id            uuid primary key default uuid_generate_v4(),
  company_id    text not null default 'ic-constructora',
  aad_object_id text,                 -- id del usuario en Azure AD (para dirigir el push)
  user_email    text,                 -- email del usuario en Teams (upn)
  user_name     text default '',
  reference     jsonb not null,       -- conversationReference serializada de Bot Framework
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);

create unique index if not exists vic_conv_refs_email
  on public.vic_conversation_refs(company_id, user_email);

alter table public.vic_conversation_refs enable row level security;
create policy "company_access_vic_refs"
  on public.vic_conversation_refs for all
  using (company_id = 'ic-constructora');

-- Bitácora de pushes enviados (auditoría / no reenviar).
create table if not exists public.vic_push_log (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null default 'ic-constructora',
  channel     text not null default 'teams',     -- teams | email | portal
  to_email    text,
  subject     text default '',
  body        text default '',
  ref_kind    text default '',                   -- ej: 'alarms'
  ref_ids     text[] default '{}',               -- external_ids notificados
  status      text not null default 'sent'
    check (status in ('sent','failed')),
  error       text default '',
  created_at  timestamptz default now()
);

alter table public.vic_push_log enable row level security;
create policy "company_access_vic_push_log"
  on public.vic_push_log for all
  using (company_id = 'ic-constructora');
