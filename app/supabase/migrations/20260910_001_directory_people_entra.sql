-- =====================================================================
-- Migración: espejo del directorio de Entra para el módulo de Tareas
-- Fecha: 2026-09-10
--
-- Problema que resuelve:
--   task_create valida al responsable contra el "roster" (invited_users +
--   profiles). Ese roster es solo quien fue invitado a la app Tracción —
--   37 + 64 filas — y NO la empresa. Asignarle una tarea a alguien que
--   trabaja en IC pero nunca entró a la app (Edwar Alejandro Vasquez Avila,
--   evasquez@icconstructora.co) fallaba dos veces: find_person no lo
--   encontraba y, aun con el correo a mano, la RPC lo rechazaba.
--
--   El directorio real de IC Constructora es Entra ID. VIC ya lo consulta
--   vía Microsoft Graph, pero Postgres no puede llamar a Graph: por eso el
--   bot espeja aquí a quien resuelve, y la validación sigue viviendo en la
--   base (el LLM nunca puede inventarse una persona).
--
-- Cambios:
--   1. Tabla public.directory_people (espejo de Entra, escrito por VIC).
--   2. _task_person_name pasa a consultar también ese espejo.
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLA: directory_people  (espejo perezoso de Entra ID)
--    No pretende ser un censo completo: se llena con la gente que VIC
--    resuelve al buscar o asignar. La fuente de verdad sigue siendo Entra.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.directory_people (
  email         text primary key,
  full_name     text not null default '',
  job_title     text not null default '',
  area          text not null default '',
  aad_object_id text not null default '',
  source        text not null default 'entra',
  synced_at     timestamptz not null default now()
);

comment on table public.directory_people is
  'Espejo de personas de Entra ID que VIC ha resuelto. Lo escribe el bot '
  '(service_role) para que las RPC de tareas puedan validar responsables '
  'que no están en invited_users/profiles. Fuente de verdad: Entra.';

alter table public.directory_people enable row level security;
-- Sin políticas: solo service_role (VIC) escribe/lee directo. Las RPC de
-- tareas son SECURITY DEFINER y la leen igual.

-- ═══════════════════════════════════════════════════════════════════
-- 2. HELPER: _task_person_name — tercera fuente
--    Orden: roster de la app primero (nombre curado por RRHH), Entra al
--    final. Devuelve NULL si la persona no existe en ninguna: esa sigue
--    siendo la única puerta para asignar.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public._task_person_name(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select full_name from public.invited_users  where lower(email) = lower(trim(p_email)) limit 1),
    (select full_name from public.profiles       where lower(email) = lower(trim(p_email)) limit 1),
    (select nullif(full_name, '') from public.directory_people
       where lower(email) = lower(trim(p_email)) limit 1)
  );
$$;
