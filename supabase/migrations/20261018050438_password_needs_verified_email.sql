-- ---------------------------------------------------------------------------
-- A password only counts once the email behind it is proven
-- ---------------------------------------------------------------------------
-- A work email is not a secret: it is on the studio's drawings and in every client's inbox. Supabase's
-- sign-up endpoint is public, so anyone who knows a teammate's address can register it with a password of
-- their own. Email confirmation stops that password working *for now*, but Supabase keeps it — and the
-- moment the real person proves the address with their emailed code it becomes live, until the app saves
-- their own password a moment later. If that save fails, it stays live for good. Against Asif or Athiq
-- that is lasting admin access.
--
-- The rule: while an email is unverified, the account holds no password. Studesk never signs anyone up
-- with a password — the first one is always set after a 6-digit code — so nothing legitimate is lost.
--
-- Ordering, not timing, decides: the trigger reads only the row being written, so concurrent writers are
-- serialised by Postgres' own row lock and each re-evaluates against the committed row. A password write
-- that lands before the email is confirmed is dropped; one that lands after is the person's own and is
-- kept. The only password write an outsider can make is the INSERT that creates the account, and that is
-- always unverified (`enable_confirmations` must stay on — see CLAUDE.md).
--
-- Rollback: `drop trigger studesk_no_password_before_verified on auth.users;`
--           `drop function app.no_password_before_verified();`
-- Both are safe at any time and need no downtime. The backfill below cannot be undone — a cleared
-- password is gone — but anyone affected simply sets a password with the emailed code, as a new joiner
-- does. Nothing reads the column except Supabase's own sign-in.

create or replace function app.no_password_before_verified() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.email is not null and new.email_confirmed_at is null then
    new.encrypted_password := null;
  end if;
  return new;
end $$;

-- Named columns only: an ordinary sign-in updates last_sign_in_at, and that must not fire this.
create trigger studesk_no_password_before_verified
  before insert or update of encrypted_password, email_confirmed_at on auth.users
  for each row execute function app.no_password_before_verified();

-- Supabase fires auth triggers as supabase_auth_admin
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function app.no_password_before_verified() to supabase_auth_admin;
  end if;
end $$;

-- Any address someone already registered and nobody has verified. A confirmed account is left alone.
update auth.users
   set encrypted_password = null
 where email is not null
   and email_confirmed_at is null
   and encrypted_password is not null;
