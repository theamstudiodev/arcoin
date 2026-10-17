-- Studesk · 03 · Rules the database enforces itself
-- Anything that must hold no matter which screen, script or agent writes the row.

create or replace function app.is_project_lead(p_project_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p_project_id and pr.lead_id = app.my_person_id()
  )
$$;

-- ---------------------------------------------------------------------------
-- updated_at on simple tables
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger people_touch   before update on public.people   for each row execute function app.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- People: org never changes
-- ---------------------------------------------------------------------------
create or replace function app.people_before() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.org_id := old.org_id;
  end if;
  return new;
end $$;
create trigger people_before before update on public.people for each row execute function app.people_before();

-- ---------------------------------------------------------------------------
-- Projects: tier_since tracks the date of the last tier change; org never changes
-- ---------------------------------------------------------------------------
create or replace function app.projects_before() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.tier_since := current_date;
  else
    new.org_id := old.org_id;
    new.created_at := old.created_at;
    if new.tier is distinct from old.tier then
      new.tier_since := current_date;
    else
      new.tier_since := old.tier_since;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger projects_before before insert or update on public.projects
  for each row execute function app.projects_before();

-- ---------------------------------------------------------------------------
-- Packages: org is always the project's org
-- ---------------------------------------------------------------------------
create or replace function app.packages_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select pr.org_id into new.org_id from public.projects pr where pr.id = new.project_id;
  if new.org_id is null then
    raise exception 'Project % does not exist', new.project_id using errcode = '23503';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger packages_before before insert or update on public.packages
  for each row execute function app.packages_before();

-- ---------------------------------------------------------------------------
-- Tasks
--   · project and org are derived from the package — a client cannot place a task elsewhere
--   · done_at is stamped by the server clock when status reaches checked or issued
--   · someone who is only the assignee may change the status and nothing else
-- ---------------------------------------------------------------------------
create or replace function app.tasks_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_project uuid;
  v_org     uuid;
  done_states constant public.task_status[] := array['checked', 'issued']::public.task_status[];
begin
  select pk.project_id, pk.org_id into v_project, v_org from public.packages pk where pk.id = new.package_id;
  if v_project is null then
    raise exception 'Package % does not exist', new.package_id using errcode = '23503';
  end if;
  new.project_id := v_project;
  new.org_id := v_org;

  if tg_op = 'INSERT' then
    new.done_at := case when new.status = any (done_states) then now() end;
    if auth.uid() is not null then
      new.created_by := app.my_person_id();
    end if;
    new.created_at := now();
  else
    if new.status = any (done_states) and not (old.status = any (done_states)) then
      new.done_at := now();
    elsif not (new.status = any (done_states)) then
      new.done_at := null;
    else
      new.done_at := old.done_at;
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;

    -- The assignee-only rule. Server jobs (no auth.uid()) are exempt.
    if auth.uid() is not null
       and not app.is_admin()
       and not app.is_project_lead(old.project_id)
       and (new.title, new.assignee_id, new.hours, new.due_date, new.start_after, new.sort_order, new.package_id)
           is distinct from
           (old.title, old.assignee_id, old.hours, old.due_date, old.start_after, old.sort_order, old.package_id)
    then
      raise exception 'Only the Project Architect or an admin can change a task''s details. You can update its status.'
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;
create trigger tasks_before before insert or update on public.tasks
  for each row execute function app.tasks_before();

-- ---------------------------------------------------------------------------
-- Sign-in allowlist. An admin adds a person (with email) first; their first sign-in
-- creates the auth user, which this links to the person. An email that is not on the
-- team list cannot create an account at all.
-- ---------------------------------------------------------------------------
create or replace function app.link_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.people
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null
     and active;
  if not found then
    raise exception 'Studesk: % is not on the team list. Ask an admin to add you first.', new.email
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger studesk_link_auth_user after insert on auth.users
  for each row execute function app.link_auth_user();

-- Supabase fires auth triggers as supabase_auth_admin
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema app to supabase_auth_admin;
    grant execute on function app.link_auth_user() to supabase_auth_admin;
  end if;
end $$;
