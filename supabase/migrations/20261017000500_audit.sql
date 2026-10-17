-- Studesk · 05 · Audit log
-- Every change to people, projects, packages, tasks and settings — who, what, when.
-- Append-only: nobody, including admins and the service role, can edit or delete history.

create table public.audit_log (
  id            bigint generated always as identity primary key,
  org_id        uuid not null,
  actor_auth_id uuid,          -- null when the server or a scheduled job made the change
  actor_person  uuid,
  table_name    text not null,
  row_id        uuid not null,
  action        text not null check (action in ('insert', 'update', 'delete')),
  changes       jsonb not null, -- inserts: the new row · deletes: the old row · updates: changed fields as {field: [old, new]}
  at            timestamptz not null default now()
);
create index audit_log_org_at_idx on public.audit_log (org_id, at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_org uuid;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k, jsonb_build_array(v_old -> k, v_new -> k)), '{}'::jsonb)
      into v_changes
      from jsonb_object_keys(v_new) k
     where k not in ('updated_at')
       and (v_old -> k) is distinct from (v_new -> k);
    if v_changes = '{}'::jsonb then
      return null; -- nothing meaningful changed
    end if;
  else
    v_changes := v_row;
  end if;

  v_org := coalesce((v_row ->> 'org_id')::uuid, (v_row ->> 'id')::uuid);

  insert into public.audit_log (org_id, actor_auth_id, actor_person, table_name, row_id, action, changes)
  values (
    v_org,
    auth.uid(),
    app.my_person_id(),
    tg_table_name,
    coalesce((v_row ->> 'id')::uuid, (v_row ->> 'org_id')::uuid),
    lower(tg_op),
    v_changes
  );
  return null;
end $$;

create trigger audit_people   after insert or update or delete on public.people   for each row execute function app.audit();
create trigger audit_projects after insert or update or delete on public.projects for each row execute function app.audit();
create trigger audit_packages after insert or update or delete on public.packages for each row execute function app.audit();
create trigger audit_tasks    after insert or update or delete on public.tasks    for each row execute function app.audit();
create trigger audit_settings after insert or update or delete on public.settings for each row execute function app.audit();

-- History is immutable
create or replace function app.audit_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'The audit log is append-only' using errcode = '42501';
end $$;
create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function app.audit_immutable();

alter table public.audit_log enable row level security;
revoke insert, update, delete, truncate on public.audit_log from authenticated, service_role;
grant select on public.audit_log to authenticated;
create policy audit_admin_read on public.audit_log for select to authenticated
  using (org_id = app.my_org_id() and app.is_admin());
