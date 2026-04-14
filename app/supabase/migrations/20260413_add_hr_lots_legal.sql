-- =============================================
-- IC CONSTRUCTORA — Módulos: RRHH, Lotes, Jurídico
-- Migración: 20260413
-- =============================================

-- =============================================
-- MÓDULO RRHH: Requisiciones de personal
-- =============================================

create table if not exists public.hr_requests (
  id                uuid primary key default uuid_generate_v4(),
  company_id        text not null,
  title             text not null,                -- Cargo solicitado
  department        text not null default '',
  requester         text not null default '',      -- Quién solicita
  headcount         integer default 1,
  status            text default 'draft'
    check (status in ('draft','approved','searching','interviews','offer','closed','cancelled')),
  priority          text default 'media'
    check (priority in ('alta','media','baja')),
  job_description   text default '',
  requirements      text default '',
  headhunter_external boolean default false,
  headhunter_name   text default '',
  headhunter_contact text default '',
  notes             text default '',
  requested_date    date not null default now(),
  target_start_date date,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists public.hr_candidates (
  id           uuid primary key default uuid_generate_v4(),
  request_id   uuid references public.hr_requests(id) on delete cascade,
  company_id   text not null,
  name         text not null,
  email        text default '',
  phone        text default '',
  source       text default 'directo'
    check (source in ('directo','headhunter','linkedin','referido','bolsa','otro')),
  status       text default 'activo'
    check (status in ('activo','descartado','oferta','contratado')),
  cv_url       text default '',
  cv_filename  text default '',
  notes        text default '',
  added_at     timestamptz default now()
);

create table if not exists public.hr_interviews (
  id             uuid primary key default uuid_generate_v4(),
  candidate_id   uuid references public.hr_candidates(id) on delete cascade,
  request_id     uuid references public.hr_requests(id) on delete cascade,
  company_id     text not null,
  interviewer    text not null,
  interview_date date,
  interview_type text default 'tecnica'
    check (interview_type in ('rrhh','tecnica','gerencia','prueba','final')),
  result         text default 'pendiente'
    check (result in ('pendiente','aprobado','reprobado','en-espera')),
  score          integer check (score between 1 and 10),
  comments       text default '',
  created_at     timestamptz default now()
);

create table if not exists public.hr_comments (
  id         uuid primary key default uuid_generate_v4(),
  request_id uuid references public.hr_requests(id) on delete cascade,
  company_id text not null,
  author     text not null,
  content    text not null,
  created_at timestamptz default now()
);

create index if not exists hr_requests_company on public.hr_requests(company_id, status);
create index if not exists hr_candidates_request on public.hr_candidates(request_id);
create index if not exists hr_interviews_request on public.hr_interviews(request_id);
create index if not exists hr_comments_request on public.hr_comments(request_id);

alter table public.hr_requests   enable row level security;
alter table public.hr_candidates enable row level security;
alter table public.hr_interviews enable row level security;
alter table public.hr_comments   enable row level security;

create policy "company_access_hr_requests"   on public.hr_requests   for all using (company_id = 'ic-constructora');
create policy "company_access_hr_candidates" on public.hr_candidates for all using (company_id = 'ic-constructora');
create policy "company_access_hr_interviews" on public.hr_interviews for all using (company_id = 'ic-constructora');
create policy "company_access_hr_comments"   on public.hr_comments   for all using (company_id = 'ic-constructora');


-- =============================================
-- MÓDULO LOTES: Seguimiento de lotes y proyectos
-- =============================================

create table if not exists public.lots (
  id                 uuid primary key default uuid_generate_v4(),
  company_id         text not null,
  name               text not null,
  address            text default '',
  area               numeric default 0,           -- m²
  status             text default 'prospecto'
    check (status in ('prospecto','analisis','negociacion','adquirido','descartado')),
  -- Contacto dueño
  owner_name         text default '',
  owner_phone        text default '',
  owner_email        text default '',
  -- Hoja resumen del proyecto
  norm               text default '',             -- Norma urbanística
  units              integer default 0,
  use_type           text default ''
    check (use_type in ('residencial','comercial','mixto','industrial','')),
  structure_type     text default '',
  structure_designer text default '',
  finishes           text default '',
  notes              text default '',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.lot_advisors (
  id         uuid primary key default uuid_generate_v4(),
  lot_id     uuid references public.lots(id) on delete cascade,
  company_id text not null,
  type       text not null,      -- 'Estructural', 'Suelos', 'Arquitecto', 'Ambiental', etc.
  name       text not null,
  company    text default '',
  phone      text default '',
  email      text default '',
  notes      text default ''
);

create table if not exists public.lot_partners (
  id            uuid primary key default uuid_generate_v4(),
  lot_id        uuid references public.lots(id) on delete cascade,
  company_id    text not null,
  role          text not null,   -- 'Comercializador', 'Constructor', 'Inversionista', 'Financiero', etc.
  name          text not null,
  contact       text default '',
  phone         text default '',
  email         text default '',
  participation numeric default 0,  -- % participación
  notes         text default ''
);

create table if not exists public.lot_scenarios (
  id                uuid primary key default uuid_generate_v4(),
  lot_id            uuid references public.lots(id) on delete cascade,
  company_id        text not null,
  name              text not null,
  version           integer default 1,
  is_active         boolean default false,
  land_cost         numeric default 0,
  construction_cost numeric default 0,
  total_units       integer default 0,
  sale_price_per_unit numeric default 0,
  total_revenue     numeric default 0,
  gross_margin      numeric default 0,
  roi               numeric default 0,
  irr               numeric default 0,    -- TIR %
  payback_months    integer default 0,
  cash_flow_notes   text default '',
  observations      text default '',
  created_by        text default '',
  created_at        timestamptz default now()
);

create table if not exists public.lot_documents (
  id          uuid primary key default uuid_generate_v4(),
  lot_id      uuid references public.lots(id) on delete cascade,
  company_id  text not null,
  name        text not null,
  category    text default 'general'
    check (category in ('general','escritura','planos','estudios','licencias','promesas','otro')),
  file_url    text default '',
  file_name   text default '',
  uploaded_by text default '',
  notes       text default '',
  created_at  timestamptz default now()
);

create index if not exists lots_company on public.lots(company_id, status);
create index if not exists lot_advisors_lot on public.lot_advisors(lot_id);
create index if not exists lot_partners_lot on public.lot_partners(lot_id);
create index if not exists lot_scenarios_lot on public.lot_scenarios(lot_id);
create index if not exists lot_documents_lot on public.lot_documents(lot_id);

alter table public.lots           enable row level security;
alter table public.lot_advisors   enable row level security;
alter table public.lot_partners   enable row level security;
alter table public.lot_scenarios  enable row level security;
alter table public.lot_documents  enable row level security;

create policy "company_access_lots"          on public.lots          for all using (company_id = 'ic-constructora');
create policy "company_access_lot_advisors"  on public.lot_advisors  for all using (company_id = 'ic-constructora');
create policy "company_access_lot_partners"  on public.lot_partners  for all using (company_id = 'ic-constructora');
create policy "company_access_lot_scenarios" on public.lot_scenarios for all using (company_id = 'ic-constructora');
create policy "company_access_lot_documents" on public.lot_documents for all using (company_id = 'ic-constructora');


-- =============================================
-- MÓDULO JURÍDICO: Procesos legales
-- =============================================

create table if not exists public.legal_processes (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,
  title           text not null,
  type            text not null
    check (type in ('compraventa','promesa','escrituracion','hipoteca','licencia','permiso','contrato','demanda','otro')),
  lot_id          uuid references public.lots(id) on delete set null,
  status          text default 'pendiente'
    check (status in ('pendiente','en-proceso','en-revision','aprobado','cerrado','cancelado')),
  priority        text default 'media'
    check (priority in ('alta','media','baja')),
  start_date      date,
  due_date        date,
  closed_date     date,
  responsible     text default '',
  external_lawyer text default '',
  law_firm        text default '',
  notary          text default '',
  value           numeric default 0,
  description     text default '',
  notes           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.legal_milestones (
  id             uuid primary key default uuid_generate_v4(),
  process_id     uuid references public.legal_processes(id) on delete cascade,
  company_id     text not null,
  title          text not null,
  due_date       date,
  completed      boolean default false,
  completed_date date,
  completed_by   text default '',
  notes          text default '',
  order_index    integer default 0
);

create table if not exists public.legal_parties (
  id         uuid primary key default uuid_generate_v4(),
  process_id uuid references public.legal_processes(id) on delete cascade,
  company_id text not null,
  name       text not null,
  role       text not null,  -- 'Vendedor', 'Comprador', 'Abogado', 'Notario', 'Fiduciaria', 'Banco', etc.
  type       text default 'externo' check (type in ('interno','externo')),
  email      text default '',
  phone      text default '',
  notes      text default ''
);

create table if not exists public.legal_documents (
  id          uuid primary key default uuid_generate_v4(),
  process_id  uuid references public.legal_processes(id) on delete cascade,
  company_id  text not null,
  name        text not null,
  category    text default 'general',
  file_url    text default '',
  file_name   text default '',
  uploaded_by text default '',
  version     text default '1.0',
  notes       text default '',
  created_at  timestamptz default now()
);

create table if not exists public.legal_comments (
  id         uuid primary key default uuid_generate_v4(),
  process_id uuid references public.legal_processes(id) on delete cascade,
  company_id text not null,
  author     text not null,
  content    text not null,
  type       text default 'nota'
    check (type in ('nota','alerta','decision','accion')),
  created_at timestamptz default now()
);

create index if not exists legal_processes_company on public.legal_processes(company_id, status);
create index if not exists legal_milestones_process on public.legal_milestones(process_id, order_index);
create index if not exists legal_parties_process on public.legal_parties(process_id);
create index if not exists legal_documents_process on public.legal_documents(process_id);
create index if not exists legal_comments_process on public.legal_comments(process_id);

alter table public.legal_processes  enable row level security;
alter table public.legal_milestones enable row level security;
alter table public.legal_parties    enable row level security;
alter table public.legal_documents  enable row level security;
alter table public.legal_comments   enable row level security;

create policy "company_access_legal_processes"  on public.legal_processes  for all using (company_id = 'ic-constructora');
create policy "company_access_legal_milestones" on public.legal_milestones for all using (company_id = 'ic-constructora');
create policy "company_access_legal_parties"    on public.legal_parties    for all using (company_id = 'ic-constructora');
create policy "company_access_legal_documents"  on public.legal_documents  for all using (company_id = 'ic-constructora');
create policy "company_access_legal_comments"   on public.legal_comments   for all using (company_id = 'ic-constructora');
