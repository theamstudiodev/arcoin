-- Studesk · 01 · Foundation
-- Organisations, people, the domain vocabulary, and the identity helpers every rule depends on.
--
-- Every domain table carries org_id. There is one org today (AM Studio); the Mysore and
-- Bangalore branches, or other studios, become more rows here rather than a migration later.

-- ---------------------------------------------------------------------------
-- Vocabulary — these names are used verbatim in code and UI
-- ---------------------------------------------------------------------------
create type public.project_tier as enum ('development', 'ready_to_release', 'response_awaited', 'dormant');
create type public.task_status  as enum ('todo', 'in_progress', 'for_check', 'checked', 'issued');
create type public.person_role  as enum ('principal', 'director', 'lead', 'junior', 'technical');
create type public.package_code as enum ('P01', 'P02', 'P03', 'P04', 'P05', 'CS', 'SV', 'TD', 'ADD');

comment on type public.package_code is
  'P01 Site and Study · P02 Design (Concepts) · P03 Proposal and Presentation · P04 Design and Tender · '
  'P05 Co-ordinated Consultant and Vendor Drawings · CS Civil/Structure · SV Services · TD Technical Details · '
  'ADD Additional tasks (work outside the drawing list)';

-- ---------------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------------
create table public.orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People — the studio team. A person is created by an admin first; signing in with the
-- same email links their auth account (see 0300_rules: app.link_auth_user).
-- ---------------------------------------------------------------------------
create table public.people (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs (id) on delete restrict,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name         text not null check (length(trim(name)) > 0),
  role         public.person_role not null,
  -- share of a working day available for production: Asif 0.25, Athiq 0.5, everyone else 1
  capacity     numeric(3, 2) not null default 1 check (capacity > 0 and capacity <= 1),
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index people_org_email_uq on public.people (org_id, lower(email));
create index people_org_idx on public.people (org_id) where active;

-- ---------------------------------------------------------------------------
-- Identity helpers. They live in a private schema so they are not exposed as RPC
-- endpoints, and run as SECURITY DEFINER so policies on `people` can call them
-- without recursing into their own RLS.
-- ---------------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;

create or replace function app.my_person_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.people p where p.auth_user_id = auth.uid() and p.active
$$;

create or replace function app.my_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.org_id from public.people p where p.auth_user_id = auth.uid() and p.active
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.people p
    where p.auth_user_id = auth.uid() and p.active and p.role in ('principal', 'director')
  )
$$;

comment on function app.is_admin() is 'Admins are the principal (Asif) and the studio director (Athiq).';
