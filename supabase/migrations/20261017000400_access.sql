-- Studesk · 04 · Who can see and change what
-- Row-level security is the enforcement. The UI only decides what to show.
--
--   admin  = principal (Asif) or director (Athiq)
--   lead   = the Project Architect named on a project
--   staff  = everyone else on the team
--
-- Everyone reads the whole studio's plan — that is the point of a shared plan. Writes are narrow.

-- ---------------------------------------------------------------------------
-- Table privileges. Anonymous visitors get nothing; signed-in users get table access
-- that the policies below then narrow, row by row.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage on schema app to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;

alter table public.orgs          enable row level security;
alter table public.people        enable row level security;
alter table public.projects      enable row level security;
alter table public.packages      enable row level security;
alter table public.tasks         enable row level security;
alter table public.task_schedule enable row level security;
alter table public.settings      enable row level security;
alter table public.holidays      enable row level security;

-- ---------------------------------------------------------------------------
-- orgs: read your own
-- ---------------------------------------------------------------------------
create policy orgs_read on public.orgs for select to authenticated
  using (id = app.my_org_id());

-- ---------------------------------------------------------------------------
-- people: everyone reads the team (the scheduler needs capacity in the browser);
-- only admins add, edit or remove people
-- ---------------------------------------------------------------------------
create policy people_read on public.people for select to authenticated
  using (org_id = app.my_org_id());
create policy people_admin_insert on public.people for insert to authenticated
  with check (org_id = app.my_org_id() and app.is_admin());
create policy people_admin_update on public.people for update to authenticated
  using (org_id = app.my_org_id() and app.is_admin())
  with check (org_id = app.my_org_id() and app.is_admin());
create policy people_admin_delete on public.people for delete to authenticated
  using (org_id = app.my_org_id() and app.is_admin());

-- ---------------------------------------------------------------------------
-- projects: everyone reads; admins create, re-tier, re-prioritise and assign leads
-- ---------------------------------------------------------------------------
create policy projects_read on public.projects for select to authenticated
  using (org_id = app.my_org_id());
create policy projects_admin_insert on public.projects for insert to authenticated
  with check (org_id = app.my_org_id() and app.is_admin());
create policy projects_admin_update on public.projects for update to authenticated
  using (org_id = app.my_org_id() and app.is_admin())
  with check (org_id = app.my_org_id() and app.is_admin());
create policy projects_admin_delete on public.projects for delete to authenticated
  using (org_id = app.my_org_id() and app.is_admin());

-- ---------------------------------------------------------------------------
-- packages: everyone reads; admins and the project's lead manage them
-- ---------------------------------------------------------------------------
create policy packages_read on public.packages for select to authenticated
  using (org_id = app.my_org_id());
create policy packages_write on public.packages for insert to authenticated
  with check (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)));
create policy packages_update on public.packages for update to authenticated
  using (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)))
  with check (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)));
create policy packages_delete on public.packages for delete to authenticated
  using (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)));

-- ---------------------------------------------------------------------------
-- tasks: everyone reads; admins and the project's lead manage them;
-- the assignee may update (and the tasks_before trigger limits that to status)
-- ---------------------------------------------------------------------------
create policy tasks_read on public.tasks for select to authenticated
  using (org_id = app.my_org_id());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)));
create policy tasks_update on public.tasks for update to authenticated
  using (org_id = app.my_org_id()
         and (app.is_admin() or app.is_project_lead(project_id) or assignee_id = app.my_person_id()))
  with check (org_id = app.my_org_id()
         and (app.is_admin() or app.is_project_lead(project_id) or assignee_id = app.my_person_id()));
create policy tasks_delete on public.tasks for delete to authenticated
  using (org_id = app.my_org_id() and (app.is_admin() or app.is_project_lead(project_id)));

-- ---------------------------------------------------------------------------
-- task_schedule: everyone reads; no user writes it — only the server, after the engine runs
-- ---------------------------------------------------------------------------
create policy task_schedule_read on public.task_schedule for select to authenticated
  using (org_id = app.my_org_id());
revoke insert, update, delete on public.task_schedule from authenticated;

-- ---------------------------------------------------------------------------
-- settings and holidays: everyone reads; admins change them
-- ---------------------------------------------------------------------------
create policy settings_read on public.settings for select to authenticated
  using (org_id = app.my_org_id());
create policy settings_admin_insert on public.settings for insert to authenticated
  with check (org_id = app.my_org_id() and app.is_admin());
create policy settings_admin_update on public.settings for update to authenticated
  using (org_id = app.my_org_id() and app.is_admin())
  with check (org_id = app.my_org_id() and app.is_admin());

create policy holidays_read on public.holidays for select to authenticated
  using (org_id = app.my_org_id());
create policy holidays_admin_insert on public.holidays for insert to authenticated
  with check (org_id = app.my_org_id() and app.is_admin());
create policy holidays_admin_delete on public.holidays for delete to authenticated
  using (org_id = app.my_org_id() and app.is_admin());
