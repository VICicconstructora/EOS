-- =====================================================================
-- Migración: alarms + tasks
-- Fecha: 2026-05-09
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════
-- TABLA: alarms  (Alarmas operativas — desde Datamart.xlsx)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.alarms (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,

  -- Clave de deduplicación: "slug::etapa::categoria"
  -- Ej: "reserva-de-oporto::E1::credito"
  external_id     text not null,

  project         text not null,   -- slug del proyecto
  category        text not null
    check (category in ('credito','poliza_tr','poliza_rc','licencia')),
  etapa           text not null default '',
  detail          text not null default '',  -- descripción completa del vencimiento

  severity        text not null default 'alta'
    check (severity in ('alta','media')),   -- alta = 🔴 vencida, media = 🟡 por vencer

  expires_at      date,            -- fecha de vencimiento
  dias            integer,         -- días hasta vencimiento (negativo = vencida)

  status          text not null default 'active'
    check (status in ('active','acknowledged','resolved')),

  acknowledged_by text default '',
  acknowledged_at timestamptz,
  resolved_at     timestamptz,

  -- Marca cuándo fue vista por última vez en el sync — para marcar como resolved
  -- alarmas no vistas en el último run.
  last_seen_at    timestamptz default now(),

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Índice único para UPSERT por external_id
create unique index if not exists alarms_ext_id
  on public.alarms(company_id, external_id);

create index if not exists alarms_company_status
  on public.alarms(company_id, status);

create index if not exists alarms_project
  on public.alarms(company_id, project);

alter table public.alarms enable row level security;

create policy "company_access_alarms"
  on public.alarms for all
  using (company_id = 'ic-constructora');

-- ═══════════════════════════════════════════════════════════════════
-- TABLA: tasks  (Tareas, compromisos y to-dos)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.tasks (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,

  title           text not null,
  description     text default '',

  assigned_to     text default '',      -- email del responsable
  assigned_name   text default '',      -- nombre para mostrar (desnormalizado)

  due_date        date,

  status          text not null default 'todo'
    check (status in ('todo','in-progress','done','blocked')),

  priority        text not null default 'media'
    check (priority in ('alta','media','baja')),

  created_by      text default '',      -- email del creador

  -- Origen de la tarea: manual, desde reunión o desde alarma del Datamart
  source          text not null default 'manual'
    check (source in ('manual','meeting','datamart')),
  source_ref      text default '',      -- ID o external_id de la alarma origen

  completed_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists tasks_company_assigned
  on public.tasks(company_id, assigned_to);

create index if not exists tasks_company_status
  on public.tasks(company_id, status);

alter table public.tasks enable row level security;

create policy "company_access_tasks"
  on public.tasks for all
  using (company_id = 'ic-constructora');
