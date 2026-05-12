-- =====================================================================
-- Migración: tabla documents + onboarding por usuario
-- Fecha: 2026-05-09
-- =====================================================================

-- 1. Tabla documents: almacena markdown de contexto, perfiles y docs generados
create table if not exists public.documents (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  user_id     uuid references auth.users(id) on delete set null,
  slug        text not null,
  title       text not null,
  content     text not null default '',
  type        text not null default 'generated'
    check (type in ('cbr', 'user_profile', 'context', 'generated', 'plan')),
  category    text default '',
  tags        text[] default '{}',
  is_indexed  boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (company_id, slug)
);

create index if not exists documents_company_type on public.documents(company_id, type);
create index if not exists documents_user_id      on public.documents(user_id);

-- 2. RLS
alter table public.documents enable row level security;

create policy "documents_read"
  on public.documents for select
  using (
    company_id = 'ic-constructora'
    and (public.is_active_user() or id = auth.uid())
  );

create policy "documents_insert"
  on public.documents for insert
  with check (company_id = 'ic-constructora' and public.is_active_user());

create policy "documents_update"
  on public.documents for update
  using (
    company_id = 'ic-constructora'
    and (user_id = auth.uid() or public.current_role_app() = 'admin')
  )
  with check (company_id = 'ic-constructora');

-- 3. Columnas de onboarding en profiles
alter table public.profiles
  add column if not exists onboarding_completed    boolean default false,
  add column if not exists onboarding_completed_at timestamptz;

-- 4. RPC para completar onboarding (actualiza profile + guarda documento de perfil)
create or replace function public.complete_onboarding(
  profile_doc_slug    text,
  profile_doc_title   text,
  profile_doc_content text
) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  -- Marcar perfil como onboarded
  update public.profiles
     set onboarding_completed    = true,
         onboarding_completed_at = now(),
         updated_at              = now()
   where id = v_user_id;

  -- Guardar/actualizar el documento de perfil
  insert into public.documents (company_id, user_id, slug, title, content, type, category, tags)
  values (
    'ic-constructora',
    v_user_id,
    profile_doc_slug,
    profile_doc_title,
    profile_doc_content,
    'user_profile',
    'perfiles',
    array['onboarding', 'perfil-usuario']
  )
  on conflict (company_id, slug)
  do update set
    content    = excluded.content,
    updated_at = now();
end;
$$ language plpgsql security definer;

grant execute on function public.complete_onboarding(text, text, text) to authenticated;
