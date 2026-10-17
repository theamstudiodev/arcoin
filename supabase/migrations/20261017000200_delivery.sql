-- Studesk · 02 · Delivery
-- Projects → packages → tasks, the engine's output table, and the studio's rules as data.

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete restrict,
  code         text check (code is null or length(trim(code)) > 0),  -- e.g. AMS-26-014
  name         text not null check (length(trim(name)) > 0),
  client       text,
  project_type text,
  tier         public.project_tier not null default 'ready_to_release',
  tier_since   date not null default current_date,   -- maintained by trigger
  priority     int check (priority between 1 and 999), -- 1 = most urgent; null = unranked
  lead_id      uuid references public.people (id) on delete set null,
  target_date  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index projects_org_code_uq on public.projects (org_id, code) where code is not null;
create index projects_org_tier_idx on public.projects (org_id, tier, priority);
create index projects_lead_idx on public.projects (lead_id);

-- ---------------------------------------------------------------------------
-- Packages — created on demand, at most one of each code per project
-- ---------------------------------------------------------------------------
create table public.packages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete restrict, -- copied from project by trigger
  project_id   uuid not null references public.projects (id) on delete cascade,
  code         public.package_code not null,
  target_issue date,
  issued_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, code)
);
create index packages_project_idx on public.packages (project_id);

-- ---------------------------------------------------------------------------
-- Tasks — drawings and additional work, scheduled by the engine
-- ---------------------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete restrict,       -- copied by trigger
  project_id  uuid not null references public.projects (id) on delete cascade,    -- copied by trigger
  package_id  uuid not null references public.packages (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  assignee_id uuid references public.people (id) on delete set null,
  hours       numeric(5, 1) not null default 0 check (hours >= 0 and hours * 2 = floor(hours * 2)), -- half-hour steps
  due_date    date,
  start_after date,                               -- optional: do not schedule before this date
  status      public.task_status not null default 'todo',
  sort_order  int not null default 0,
  done_at     timestamptz,                        -- server-stamped when status reaches checked/issued
  created_by  uuid references public.people (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_package_idx on public.tasks (package_id, sort_order);
create index tasks_open_assignee_idx on public.tasks (assignee_id) where status <> 'issued';

-- ---------------------------------------------------------------------------
-- Engine output. Written only by the server (service role) after the scheduler runs.
-- Nobody types a forecast date.
-- ---------------------------------------------------------------------------
create table public.task_schedule (
  task_id     uuid primary key references public.tasks (id) on delete cascade,
  org_id      uuid not null references public.orgs (id) on delete cascade,
  start_date  date,
  end_date    date,
  late_days   int not null default 0,
  reason      text,           -- why it could not be scheduled, e.g. 'No assignee'
  computed_at timestamptz not null default now()
);
create index task_schedule_org_idx on public.task_schedule (org_id);

-- ---------------------------------------------------------------------------
-- Studio rules — one row per org. Defaults are the limits agreed with the partners.
-- ---------------------------------------------------------------------------
create table public.settings (
  org_id         uuid primary key references public.orgs (id) on delete cascade,
  workdays       smallint[] not null default '{1,2,3,4,5,6}'   -- ISO weekdays, Mon=1 … Sun=7
                 check (workdays <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(workdays) > 0),
  hours_per_day  numeric(3, 1) not null default 6 check (hours_per_day > 0 and hours_per_day <= 12),
  slot_limit     int not null default 5  check (slot_limit > 0),      -- packages in production, studio-wide
  per_lead_slots int not null default 2  check (per_lead_slots > 0),  -- per Project Architect
  dev_limit      int not null default 15 check (dev_limit > 0),
  ready_limit    int not null default 10 check (ready_limit > 0),
  dormant_days   int not null default 60 check (dormant_days > 0),
  updated_at     timestamptz not null default now()
);

create table public.holidays (
  org_id uuid not null references public.orgs (id) on delete cascade,
  day    date not null,
  label  text,
  primary key (org_id, day)
);
