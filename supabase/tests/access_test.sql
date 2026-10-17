-- Studesk · access and rules test suite
-- Signs in as each kind of person and proves what they can and cannot do.
-- Runs inside one transaction and rolls back, so it leaves the database untouched.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/access_test.sql
--
-- Expects the local seed (supabase/seed.sql). Any failure stops the run with "FAIL: …".

\set QUIET on
begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres): sign-ups for the team, and a second studio for isolation tests
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-e000-000000000001', 'asif@amstudio.test'),
  ('00000000-0000-4000-e000-000000000002', 'ATHIQ@amstudio.test'),   -- case-insensitive match
  ('00000000-0000-4000-e000-000000000003', 'lilia@amstudio.test'),
  ('00000000-0000-4000-e000-000000000004', 'disha@amstudio.test'),
  ('00000000-0000-4000-e000-000000000005', 'bushra@amstudio.test'),
  ('00000000-0000-4000-e000-000000000006', 'nashwa@amstudio.test');

insert into public.orgs (id, name) values ('00000000-0000-4000-a000-0000000000b2', 'Other Studio');
insert into public.people (id, org_id, email, name, role) values
  ('00000000-0000-4000-b000-0000000000b2', '00000000-0000-4000-a000-0000000000b2', 'boss@other.test', 'Other Boss', 'principal');
insert into auth.users (id, email) values ('00000000-0000-4000-e000-0000000000b2', 'boss@other.test');
insert into public.projects (id, org_id, name, tier) values
  ('00000000-0000-4000-c000-0000000000b2', '00000000-0000-4000-a000-0000000000b2', 'Secret Other Project', 'development');

do $$ begin raise notice '— setup done'; end $$;

-- ---------------------------------------------------------------------------
-- 1. Sign-in allowlist
-- ---------------------------------------------------------------------------
do $$ begin
  if (select auth_user_id from public.people where email = 'athiq@amstudio.test') <> '00000000-0000-4000-e000-000000000002' then
    raise exception 'FAIL: first sign-in did not link the auth user to the person (case-insensitive email)';
  end if;
  raise notice 'ok  1a · first sign-in links the account to the team member, ignoring email case';

  begin
    insert into auth.users (email) values ('stranger@gmail.com');
    raise exception 'FAIL: an email not on the team list created an account';
  exception when insufficient_privilege then
    raise notice 'ok  1b · an email not on the team list cannot create an account';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Anonymous visitors see nothing
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin
  begin
    perform 1 from public.projects;
    raise exception 'FAIL: anonymous visitor could query projects';
  exception when insufficient_privilege then
    raise notice 'ok  2  · anonymous visitors are refused outright';
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. Junior architect (Bushra)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-e000-000000000005","role":"authenticated"}', true) \gset
set local role authenticated;
do $$
declare n int; t uuid; d timestamptz;
begin
  select count(*) into n from public.projects;
  if n <> 6 then raise exception 'FAIL: junior should see all 6 studio projects, saw %', n; end if;
  raise notice 'ok  3a · junior sees the whole studio plan (6 projects)';

  if exists (select 1 from public.projects where name = 'Secret Other Project') then
    raise exception 'FAIL: junior can see another studio''s project';
  end if;
  raise notice 'ok  3b · junior cannot see another studio''s projects';

  update public.projects set priority = 1 where code = 'AMS-26-014';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: junior re-prioritised a project'; end if;
  raise notice 'ok  3c · junior cannot change project priority';

  -- her own task: status may change, and done_at is stamped by the server
  select id into t from public.tasks where title = 'Toilet details T1–T3';
  update public.tasks set status = 'checked', done_at = '2000-01-01' where id = t;
  select done_at into d from public.tasks where id = t;
  if d is null or d < now() - interval '1 minute' then
    raise exception 'FAIL: done_at not server-stamped (got %)', d;
  end if;
  raise notice 'ok  3d · junior moves her own task to Checked; completion time comes from the server clock';

  begin
    update public.tasks set title = 'Renamed by junior' where id = t;
    raise exception 'FAIL: junior changed a task title';
  exception when insufficient_privilege then
    raise notice 'ok  3e · junior cannot change task details, only status';
  end;

  begin
    update public.tasks set assignee_id = '00000000-0000-4000-b000-000000000006' where id = t;
    raise exception 'FAIL: junior reassigned her task';
  exception when insufficient_privilege then
    raise notice 'ok  3f · junior cannot reassign her task to someone else';
  end;

  update public.tasks set status = 'issued' where title = 'Section AA and BB';  -- Nashwa's task
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: junior updated a colleague''s task'; end if;
  raise notice 'ok  3g · junior cannot touch a colleague''s task';

  update public.settings set slot_limit = 99;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: junior changed studio settings'; end if;
  raise notice 'ok  3h · junior cannot change studio settings';

  begin
    insert into public.task_schedule (task_id, org_id, start_date, end_date)
    values (t, '00000000-0000-4000-a000-000000000001', '2026-01-01', '2026-01-02');
    raise exception 'FAIL: a user wrote a forecast date';
  exception when insufficient_privilege then
    raise notice 'ok  3i · nobody types forecast dates — only the server writes task_schedule';
  end;

  select count(*) into n from public.audit_log;
  if n <> 0 then raise exception 'FAIL: junior can read the audit log'; end if;
  raise notice 'ok  3j · junior cannot read the audit log';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. Project Architect (Lilia, lead of Kadri; not of Mangala)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-e000-000000000003","role":"authenticated"}', true) \gset
set local role authenticated;
do $$
declare n int; t uuid; o uuid; p uuid;
begin
  insert into public.tasks (package_id, title, hours, org_id, project_id)
  values ('00000000-0000-4000-d000-000000000002', 'Client meeting deck', 4,
          '00000000-0000-4000-a000-0000000000b2', '00000000-0000-4000-c000-0000000000b2') -- spoofed
  returning id, org_id, project_id into t, o, p;
  if o <> '00000000-0000-4000-a000-000000000001' or p <> '00000000-0000-4000-c000-000000000001' then
    raise exception 'FAIL: spoofed org/project was accepted';
  end if;
  raise notice 'ok  4a · lead adds an extra task to her project; spoofed org and project are overwritten';

  update public.tasks set title = 'Client meeting deck v2', hours = 5.5, assignee_id = '00000000-0000-4000-b000-000000000006' where id = t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: lead could not edit a task on her own project'; end if;
  raise notice 'ok  4b · lead edits title, hours and assignee on her own project';

  begin
    insert into public.tasks (package_id, title) values ('00000000-0000-4000-d000-000000000003', 'Sneaky task');
    raise exception 'FAIL: lead added a task to another lead''s project';
  exception when insufficient_privilege then
    raise notice 'ok  4c · lead cannot add tasks to another lead''s project';
  end;

  begin
    update public.tasks set hours = 2.25 where id = t;
    raise exception 'FAIL: hours accepted a non half-hour value';
  exception when check_violation then
    raise notice 'ok  4d · hours must be in half-hour steps';
  end;

  update public.projects set tier = 'dormant' where code = 'AMS-26-014';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: lead changed a project tier'; end if;
  raise notice 'ok  4e · lead cannot change project tier (admins release projects)';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 5. Admin (Athiq)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-e000-000000000002","role":"authenticated"}', true) \gset
set local role authenticated;
do $$
declare n int; s date; c jsonb;
begin
  update public.projects set priority = 1 where code = 'AMS-26-014';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not change priority'; end if;
  raise notice 'ok  5a · admin changes project priority';

  select changes into c from public.audit_log
   where table_name = 'projects' and action = 'update' order by id desc limit 1;
  if c is null or c -> 'priority' <> '[2, 1]'::jsonb then
    raise exception 'FAIL: audit did not record priority 2 → 1 (got %)', c;
  end if;
  raise notice 'ok  5b · the change is in the audit log as priority [2 → 1]';

  update public.projects set tier = 'development' where code = 'AMS-26-021';
  select tier_since into s from public.projects where code = 'AMS-26-021';
  if s <> current_date then raise exception 'FAIL: tier_since not updated on release'; end if;
  raise notice 'ok  5c · releasing Kavoor to Development records the date';

  update public.settings set slot_limit = 6;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not change settings'; end if;
  raise notice 'ok  5d · admin changes studio settings';

  update public.tasks set title = 'Toilet details T1–T4' where title = 'Toilet details T1–T3';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not edit a task'; end if;
  raise notice 'ok  5e · admin edits any task';

  select count(*) into n from public.projects where name = 'Secret Other Project';
  if n <> 0 then raise exception 'FAIL: admin sees another studio''s data'; end if;
  raise notice 'ok  5f · admins are admins of their own studio only';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 6. The other studio sees none of AM Studio
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-e000-0000000000b2","role":"authenticated"}', true) \gset
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 1 then raise exception 'FAIL: other studio saw % projects, expected only its own 1', n; end if;
  select count(*) into n from public.people;
  if n <> 1 then raise exception 'FAIL: other studio saw AM Studio people'; end if;
  raise notice 'ok  6  · a second studio on the same database sees only its own data';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 7. History cannot be rewritten — not even by the database owner
-- ---------------------------------------------------------------------------
do $$ begin
  begin
    delete from public.audit_log;
    raise exception 'FAIL: audit log rows were deleted';
  exception when insufficient_privilege then
    raise notice 'ok  7  · the audit log is append-only, even for the database owner';
  end;
end $$;

do $$ begin raise notice '— all checks passed'; end $$;
rollback;
