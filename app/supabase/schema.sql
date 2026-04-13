-- =============================================
-- IC CONSTRUCTORA — Sistema EOS
-- Esquema de base de datos Supabase
-- =============================================

-- Habilitar extensión para UUIDs
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLA: vto (Vision/Traction Organizer)
-- =============================================
create table if not exists public.vto (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,
  core_values     text[] default '{}',
  core_focus      text default '',
  niche           text default '',
  ten_year_target text default '',
  marketing_strategy text default '',
  three_year_picture text default '',
  one_year_plan   text default '',
  quarterly_rocks_text text default '',
  is_complete     boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- =============================================
-- TABLA: rocks (Rocas trimestrales)
-- =============================================
create table if not exists public.rocks (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  title       text not null,
  owner       text not null default '',
  priority    text not null default 'media' check (priority in ('alta','media','baja')),
  status      text not null default 'on-track' check (status in ('on-track','off-track','done')),
  due         date,
  notes       text default '',
  quarter     text not null,   -- e.g. 'Q2_2026'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rocks_company_quarter on public.rocks(company_id, quarter);

-- =============================================
-- TABLA: issues (Asuntos / IDS)
-- =============================================
create table if not exists public.issues (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,
  title           text not null,
  type            text not null default 'operacional'
    check (type in ('operacional','personas','financiero','comunicacion','estrategico')),
  priority        text not null default 'media' check (priority in ('alta','media','baja')),
  status          text not null default 'open' check (status in ('open','discussing','solved')),
  identified_by   text default '',
  discussion      text default '',
  solution        text default '',
  owner           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists issues_company_status on public.issues(company_id, status);

-- =============================================
-- TABLA: people (Equipo)
-- =============================================
create table if not exists public.people (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  name        text not null,
  role        text not null default '',
  dept        text not null default '',
  email       text default '',
  phone       text default '',
  gwc         boolean[] default '{true,true,true}',   -- [entiende, quiere, puede]
  values_fit  boolean default true,
  notes       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================
-- TABLA: metrics (Scorecard semanal)
-- =============================================
create table if not exists public.metrics (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  name        text not null,
  category    text not null default 'General',
  owner       text default '',
  goal        numeric not null default 0,
  unit        text default '',
  lower_is_better boolean default false,
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.metric_values (
  id          uuid primary key default uuid_generate_v4(),
  metric_id   uuid not null references public.metrics(id) on delete cascade,
  week_label  text not null,   -- e.g. 'Sem 8'
  week_date   date,
  value       numeric not null,
  created_at  timestamptz default now()
);

-- =============================================
-- TABLA: processes (Procesos medulares)
-- =============================================
create table if not exists public.processes (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  name        text not null,
  owner       text default '',
  status      text default 'needs-work' check (status in ('documented','in-progress','needs-work')),
  documented  boolean default false,
  steps       text[] default '{}',
  kpi         text default '',
  notes       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================
-- TABLA: meetings (Reuniones)
-- =============================================
create table if not exists public.meetings (
  id          uuid primary key default uuid_generate_v4(),
  company_id  text not null,
  type        text not null default 'l10' check (type in ('l10','quarterly','annual','issue')),
  title       text not null,
  date        date not null,
  time        text default '09:00',
  duration    integer default 90,   -- minutes
  attendees   text[] default '{}',
  status      text default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  rating      integer check (rating between 1 and 10),
  scorecard_ok boolean,
  rocks_reviewed boolean,
  issues_solved integer default 0,
  notes       text default '',
  created_at  timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
-- Habilitamos RLS en todas las tablas
alter table public.vto        enable row level security;
alter table public.rocks      enable row level security;
alter table public.issues     enable row level security;
alter table public.people     enable row level security;
alter table public.metrics    enable row level security;
alter table public.metric_values enable row level security;
alter table public.processes  enable row level security;
alter table public.meetings   enable row level security;

-- Política: solo usuarios autenticados de la misma compañía
-- (Ajusta según tu modelo de multi-tenant o usuarios individuales)
create policy "company_access_vto"
  on public.vto for all
  using (company_id = 'ic-constructora');

create policy "company_access_rocks"
  on public.rocks for all
  using (company_id = 'ic-constructora');

create policy "company_access_issues"
  on public.issues for all
  using (company_id = 'ic-constructora');

create policy "company_access_people"
  on public.people for all
  using (company_id = 'ic-constructora');

create policy "company_access_metrics"
  on public.metrics for all
  using (company_id = 'ic-constructora');

create policy "access_metric_values"
  on public.metric_values for all
  using (
    exists (
      select 1 from public.metrics m
      where m.id = metric_id and m.company_id = 'ic-constructora'
    )
  );

create policy "company_access_processes"
  on public.processes for all
  using (company_id = 'ic-constructora');

create policy "company_access_meetings"
  on public.meetings for all
  using (company_id = 'ic-constructora');

-- =============================================
-- DATOS INICIALES (seed opcional)
-- =============================================
insert into public.vto (company_id, core_values, core_focus, niche, is_complete)
values (
  'ic-constructora',
  array['Integridad', 'Excelencia', 'Compromiso', 'Innovación', 'Trabajo en Equipo'],
  'Construir el futuro de la infraestructura con calidad y confianza.',
  'La constructora de mayor confianza para proyectos industriales en la región.',
  false
) on conflict do nothing;

-- =============================================
-- TABLA: implementation_progress (fases EOS)
-- =============================================
create table if not exists public.implementation_progress (
  id           uuid primary key default uuid_generate_v4(),
  company_id   text not null,
  phase_id     integer not null check (phase_id between 1 and 5),
  status       text default 'pending' check (status in ('pending','active','completed')),
  scheduled_date date,
  completed_at timestamptz,
  notes        text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (company_id, phase_id)
);

create table if not exists public.implementation_tasks (
  id           uuid primary key default uuid_generate_v4(),
  company_id   text not null,
  phase_id     integer not null check (phase_id between 1 and 5),
  task_key     text not null,
  completed    boolean default false,
  completed_at timestamptz,
  completed_by text default '',
  unique (company_id, phase_id, task_key)
);

alter table public.implementation_progress enable row level security;
alter table public.implementation_tasks    enable row level security;

create policy "company_access_impl_progress"
  on public.implementation_progress for all
  using (company_id = 'ic-constructora');

create policy "company_access_impl_tasks"
  on public.implementation_tasks for all
  using (company_id = 'ic-constructora');

-- =============================================
-- TABLA: transcriptions (transcripciones L10)
-- =============================================
create table if not exists public.transcriptions (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,
  meeting_id      uuid references public.meetings(id) on delete set null,
  source          text default 'manual' check (source in ('manual','otter','teams','zoom')),
  participants    text[] default '{}',
  topics          jsonb default '[]',
  decisions       text[] default '{}',
  commitments     jsonb default '[]',
  raw_transcript  text default '',
  created_at      timestamptz default now()
);

alter table public.transcriptions enable row level security;

create policy "company_access_transcriptions"
  on public.transcriptions for all
  using (company_id = 'ic-constructora');
