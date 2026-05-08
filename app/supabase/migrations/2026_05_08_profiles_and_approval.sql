-- =====================================================================
-- Migración: profiles + onboarding (Fase 1 Entra ID)
-- Fecha: 2026-05-08
-- =====================================================================

-- 1. Tabla profiles
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text default '',
  role            text not null default 'pending'
                  check (role in ('pending','viewer','area_manager','cross_leader','admin')),
  status          text not null default 'pending'
                  check (status in ('pending','active','suspended')),
  area            text default '',
  manager_id      uuid references public.profiles(id),
  azure_oid       text unique,
  photo_url       text default '',
  job_title       text default '',
  phone           text default '',
  locked_fields   text[] default '{}',
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx   on public.profiles(role);

-- 2. Helper functions
create or replace function public.is_active_user() returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$ language sql stable security definer;

create or replace function public.current_role_app() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

grant execute on function public.is_active_user()  to authenticated, anon;
grant execute on function public.current_role_app() to authenticated, anon;

-- 3. Trigger handle_new_user (se dispara al insertar en auth.users)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, azure_oid, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             ''),
    'pending',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Trigger guard_profile_sensitive_fields
create or replace function public.guard_profile_sensitive_fields()
returns trigger as $$
begin
  if public.current_role_app() = 'admin' then
    return new;
  end if;
  if (new.role        is distinct from old.role)        or
     (new.status      is distinct from old.status)      or
     (new.area        is distinct from old.area)        or
     (new.manager_id  is distinct from old.manager_id)  or
     (new.approved_at is distinct from old.approved_at) or
     (new.approved_by is distinct from old.approved_by) or
     (new.azure_oid   is distinct from old.azure_oid)   or
     (new.email       is distinct from old.email)       then
    raise exception 'Cannot modify sensitive profile fields outside approve_user RPC';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_guard_sensitive on public.profiles;
create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();

-- 5. RPCs admin
create or replace function public.approve_user(
  target_id   uuid,
  new_role    text,
  new_area    text,
  new_manager uuid
) returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can approve users';
  end if;
  if new_role not in ('viewer','area_manager','cross_leader','admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
     set role        = new_role,
         area        = new_area,
         manager_id  = new_manager,
         status      = 'active',
         approved_at = now(),
         approved_by = auth.uid(),
         updated_at  = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function public.suspend_user(target_id uuid)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can suspend users';
  end if;
  update public.profiles
     set status = 'suspended', updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function public.reactivate_user(target_id uuid)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can reactivate users';
  end if;
  update public.profiles
     set status = 'active', updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function public.change_user_role(target_id uuid, new_role text)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;
  if new_role not in ('viewer','area_manager','cross_leader','admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
     set role = new_role, updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

grant execute on function public.approve_user(uuid, text, text, uuid) to authenticated;
grant execute on function public.suspend_user(uuid)                    to authenticated;
grant execute on function public.reactivate_user(uuid)                 to authenticated;
grant execute on function public.change_user_role(uuid, text)          to authenticated;

-- 6. RLS de profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_read"
  on public.profiles for select
  using (public.is_active_user() or id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid() or public.current_role_app() = 'admin')
  with check (id = auth.uid() or public.current_role_app() = 'admin');

-- (No insert/delete policies: las inserciones solo vía trigger handle_new_user (security definer)
-- y la eliminación solo por cascada cuando se borra auth.users.)

-- 7. Vincular tabla people con profiles (preparación para Plan 4)
alter table public.people
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Match existente por email (no-op cuando no hay matches; idempotente)
update public.people p
   set profile_id = pr.id
  from public.profiles pr
 where p.email = pr.email
   and p.email <> ''
   and p.profile_id is null;
