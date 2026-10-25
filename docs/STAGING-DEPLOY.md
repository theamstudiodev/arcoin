# Arcoin staging deployment plan

Gets Arcoin running on a free HTTPS URL against `arcoin-staging`, with no domain purchase, and proves the
database rules hold on the real thing. **No real employee is onboarded.** Written 2026-10-18.

Run `docs/STAGING-VALIDATION.md` after this. That document checks settings; this one puts the app online.

> **Progress: sections 1, 3 and 4 are done, and section 2 has passed.** Sections 5 to 9 are not started.
> Every hosted step needs explicit approval, and every remote operation starts by verifying the linked
> project.

### Execution order — corrected 2026-10-21

The numbering is not the running order. Section 2's behavioural tests need a `people` row to test against,
so they cannot run before section 4 creates one:

```
1 (migrations)  →  3 (RLS structure)  →  4 (org + test people)  →  2 (auth triggers, behavioural)
                →  5 (host config)   →  6 (deploy)  →  7 (signed out)  →  8 (authorisation)  →  9 (rollback)
```

Section 3 moves early because it needs no accounts and does not depend on the pending migration. Section 2's
structural half — that both triggers exist — still belongs immediately after section 1.

---

## Hosting: Vercel Hobby

**Chosen on 2026-10-20** as a testing layer, with the licence position below understood and accepted.

Technically it is the strongest option. Vercel is Next.js's own host, so `proxy.ts` runs natively with no
adapter between our code and the framework. That removes the two largest risks any other free host carries:
adapter gaps on a Next release this recent, and an untested monorepo build configuration.

| Option | Verdict |
|---|---|
| **Vercel Hobby** | **Chosen.** Native Next 16 support including `proxy.ts`, npm workspaces detected automatically, HTTPS on `*.vercel.app`, instant rollback, free. Hobby limits are far above a staging box's needs: 100 GB data transfer and 1,000,000 function invocations a month. |
| Vercel Pro | The same, at $20/month, and unambiguously within terms. The clean form of the choice above; worth revisiting when Arcoin carries the studio's real work. |
| Netlify Free | **The fallback.** Commercial use is explicitly permitted on the free plan — confirmed by Netlify's own guide and by their staff. Costs the OpenNext adapter and an untested `netlify.toml`. Switch here if Vercel ever objects. |
| Cloudflare Workers Free | Viable. Next 16's `proxy.ts` was unsupported until August 2026 and is now fixed. Needs an explicit Wrangler setup and is the least portable. |
| Render Free | Most portable — plain `next start`, no adapter — but free services sleep after 15 minutes and take about a minute to wake, which makes hands-on phone testing painful. |

### The licence position, recorded plainly

Vercel's fair-use guidelines (read 2026-10-20, page last updated 2026-09-14) say:

> **Hobby teams** are restricted to non-commercial personal use only. All commercial usage of the platform
> requires either a Pro or Enterprise plan.
>
> Commercial usage is defined as any Deployment that is used for the purpose of financial gain of **anyone**
> involved in **any part of the production** of the project, including a paid employee or consultant writing
> the code.

There is **no exception for staging, testing, preview, internal or non-public deployments**, and one of
Vercel's own examples is *"Receiving payment to create, update, or host the site"*. So a private,
zero-traffic test deployment of a studio tool is not carved out. This is recorded so the decision is not
rediscovered later as a surprise.

Accepted because the exposure is small and bounded: Vercel states *"we'll reach out before taking action"*,
the worst case is a paused deployment, and the database lives in Supabase, so nothing is lost if the
deployment disappears. Netlify is a same-day switch, and section 1 to 5 and 7 to 9 of this plan are
host-independent.

If you would rather remove the ambiguity for free, Vercel's documented route is to ask their support team
whether a private internal staging deployment qualifies. A yes costs nothing and settles it.

No platform-specific code is added either way, so `CLAUDE.md`'s portability rule still holds: the app keeps
building and running with plain `next build` / `next start` anywhere.

This choice adds no platform-specific code, so `CLAUDE.md`'s portability rule still holds: the app keeps
building and running with plain `next build` / `next start` anywhere.

---

## 1. Database migration order

`supabase db push` applies migrations in filename order. The seed is **never** pushed, so no test data or
fake team reaches staging.

| # | Migration | What it establishes |
|---|---|---|
| 1 | `20261017000100_foundation.sql` | orgs, people, settings, `org_id` everywhere |
| 2 | `20261017000200_delivery.sql` | projects, packages, tasks, task_schedule |
| 3 | `20261017000300_rules.sql` | triggers, including the sign-in allowlist |
| 4 | `20261017000400_access.sql` | row-level security policies |
| 5 | `20261017000500_audit.sql` | append-only audit log |
| 6 | `20261018050438_password_needs_verified_email.sql` | no password until the email is verified |

### Checked on staging, 2026-10-21

Staging was **not** a fresh project. Five of the six migrations were already applied; only the security fix
is pending, so this step is one migration, not six.

| Finding | State |
|---|---|
| `arcoin-staging` | `aiaxzemsbrsghlimfzpk`, ap-south-1, ACTIVE_HEALTHY, linked |
| Migrations 1–5 | already applied |
| `20261018050438_password_needs_verified_email` | **pending** — `db push --dry-run` confirms it is the only one |
| Rows in orgs, people, projects, auth.users | **0** — staging holds no data at all |
| `[remotes.staging]` override | loading correctly (`Loading config override: [remotes.staging]`) |

```bash
supabase projects list                       # verify arcoin-staging FIRST, every time
supabase migration list                      # 1-5 applied, 20261018050438 pending
supabase db push --dry-run                   # confirm it would push exactly that one
supabase db push                             # ← needs explicit approval
supabase migration list                      # expect six local, six remote
```

> ⚠️ **`supabase db query` targets the LOCAL database unless you pass `--linked`.** Without the flag it
> silently answers from the local stack. During this check it reported 29 people, 6 projects and both auth
> triggers — all true of local, none of staging, which is empty. Any hosted verification in sections 2, 3
> and 8 that omits `--linked` will quietly confirm the wrong database.

**Do not** run `supabase config push` — the email-template blocker is unresolved. Migrations and
configuration are separate commands; pushing the schema does not touch auth settings.

## 2. Both authentication triggers

```sql
select tgname from pg_trigger
 where tgrelid = 'auth.users'::regclass and not tgisinternal order by tgname;
```

Pass: exactly `studesk_link_auth_user` and `studesk_no_password_before_verified`.

```sql
select count(*) from auth.users where email_confirmed_at is null and encrypted_password is not null;
```

Pass: `0`.

Then prove they *work*, rather than merely exist — a trigger can be present and not firing:

- **Allowlist:** ask for a code for an address not in `people`. Pass: refused with the team-list message.
- **No early password:** register a listed-but-unverified address with a password, then check
  `encrypted_password is null` for it. Pass: null. This is the fix from PR #1, verified on hosted.

### Verified on staging, 2026-10-21 — all passed

Structural, straight after the section 1 push:

| Check | Result |
|---|---|
| Migrations local → remote | 6 / 6, none pending |
| `auth.users` triggers | `studesk_link_auth_user` **and** `studesk_no_password_before_verified` |
| `app.no_password_before_verified` | present |

Behavioural, after section 4 seeded the team:

| # | Test | Result |
|---|---|---|
| B1 | Insert an **unlisted** address into `auth.users` | **PASS** — refused, `42501`, *"Studesk: … is not on the team list. Ask an admin to add you first."* |
| B2 | Insert a **listed** address carrying a password | **PASS** — allowed through, and `encrypted_password` arrived `null` |
| B3 | `update auth.users set encrypted_password = …` on that unverified row | **PASS** — cleared again |
| B3b | Same, with `updated_at` written alongside it | **PASS** — still cleared |
| B4 | `POST /auth/v1/signup` with an **unlisted** address and an attacker's password | **PASS** — HTTP 500, the trigger's `42501` surfacing through GoTrue; no account created |
| B5 | Link trigger | **PASS** — only the seeded person matching the new account was bound; the other three stayed unlinked |

Residue was removed afterwards: `auth.users` is back to 0 rows, no person is linked, and
`unverified_with_password` is 0.

### What section 2's HTTP test revealed about the signup path

Signup runs in this order: **allowlist → insert → send email.** The two failures look different, and that
difference is the proof the gate discriminates correctly:

- an **unlisted** address dies at the insert — HTTP 500, *"Database error saving new user"*
- a **listed** address on a domain the mailer cannot send to gets past the allowlist and the insert, then
  fails at the email step — HTTP 400, `email_address_invalid`

`.invalid` is not itself rejected: `probe@staging.invalid` was accepted and blocked by the allowlist, while
`staging-test-admin@arcoin.invalid` reached the mailer. **GoTrue rolls the account back when the email fails**,
which is why no test account survived.

The consequence for section 8: **no test account can be created through signup** while built-in email is in
use, because built-in email only delivers to Supabase team addresses. They must be minted with the secret
key instead, exactly as section 8 already says.

If any of the above fails on a future project, stop. Do not continue to section 4.

## 3. Row-level security and permissions

`supabase/tests/access_test.sql` **cannot run against staging**, by design on two counts: it depends on the
local seed, which is never pushed, and `scripts/test-db.sh` refuses any non-local database. So hosted
verification is a targeted subset, run through the REST API with the publishable key as a real client would.

Structural checks first, in the SQL editor:

```sql
-- Every domain table has RLS switched on
select relname, relrowsecurity from pg_class
 where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;

-- The access helpers exist
select proname from pg_proc where pronamespace = 'app'::regnamespace order by proname;
```

Pass: `relrowsecurity` true for orgs, people, projects, packages, tasks, task_schedule, settings,
audit_log; and `app.my_org_id`, `app.is_admin`, `app.my_person_id` present.

### Verified on staging, 2026-10-21 — passed

Run early, since it needs no accounts and does not depend on the pending migration.

- **Row-level security: on for all 9 tables, every one with policies.** `audit_log` 1, `holidays` 3,
  `orgs` 1, `packages` 4, `people` 4, `projects` 4, `settings` 3, `task_schedule` 1, `tasks` 4. No table
  with RLS off, none with zero policies.
- **Access helpers present:** `app.my_org_id`, `app.is_admin`, `app.my_person_id`, plus `app.audit`,
  `app.audit_immutable`, `app.is_project_lead`, `app.link_auth_user`, `app.tasks_before`.
- `app.no_password_before_verified` absent, as expected until the section 1 push.

Behavioural checks are section 8, because they need accounts.

## 4. Staging organisation and settings

Real org, real settings, **no real people**:

```sql
insert into public.orgs (name) values ('AM Studio') returning id;   -- copy the id
insert into public.settings (org_id) values ('<org-id>');
```

Then the test team only — obviously fake addresses on a reserved TLD that can never receive mail, so they
can never be confused with a colleague:

```sql
insert into public.people (org_id, email, name, role, capacity, sort_order) values
  ('<org-id>', 'staging-test-admin@arcoin.invalid',  'Staging Test Admin',  'director', 0.5, 101),
  ('<org-id>', 'staging-test-lead@arcoin.invalid',   'Staging Test Lead',   'lead',     1,   102),
  ('<org-id>', 'staging-test-junior@arcoin.invalid', 'Staging Test Junior', 'junior',   1,   103);
```

`sort_order` starts at 101 so the seven real employees can later take 1–7 in the studio's own order.

**One extra account for the onboarding flow.** Built-in email only delivers to addresses on your Supabase
team, so exactly one mailbox can receive a six-digit code: the one that owns the Supabase account. Add it as
a `director` to walk the real onboarding path end to end:

```sql
insert into public.people (org_id, email, name, role, capacity, sort_order) values
  ('<org-id>', 'theamstudio.design@gmail.com', 'Staging Owner', 'director', 0.5, 100);
```

That address was read from the authenticated account (`GET /v1/profile` → `primary_email`, username
`theamstudiodev`), **not** from git config, which carries a different address entirely. Verify it the same
way rather than assuming, if the account ever changes hands.

### Done on staging, 2026-10-21 — and safely repeatable

Applied as a single `do $$ … $$` block, which is one statement and therefore one transaction. The org is
created only when absent; `settings` uses `on conflict (org_id) do nothing`; `people` uses
`on conflict (org_id, lower(email)) do nothing`, matching the `people_org_email_uq` index on
`(org_id, lower(email))`. Running it twice left the counts identical — verified, not assumed.

| sort_order | email | role | capacity |
|---|---|---|---|
| 100 | `theamstudio.design@gmail.com` | director | 0.50 |
| 101 | `staging-test-admin@arcoin.invalid` | director | 0.50 |
| 102 | `staging-test-lead@arcoin.invalid` | lead | 1.00 |
| 103 | `staging-test-junior@arcoin.invalid` | junior | 1.00 |

`settings` needed only `org_id`: its defaults already match the studio rules — workdays Mon–Sat,
6 hours a day, 5 slots studio-wide, 2 per lead, 15 in development, 10 ready to release, 60 dormant days.

Remove every `sort_order >= 100` row before the real team is onboarded — section 9 has the statement.

## 5. Hosting configuration

Only two variables, both public:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aiaxzemsbrsghlimfzpk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key from Project settings → API Keys |

**The secret key does not go on the host.** The app never reads it — verified: no reference anywhere in
`apps/web/src`, and absent from the build output. Every query runs under row-level security with the
publishable key. The secret key is needed only by the local script in section 8, and later by the scheduler.

Use the **publishable** and **secret** keys, not the legacy `anon` / `service_role` pair.

## 6. Deploy to a free HTTPS URL

No configuration file is needed. This is an npm-workspaces monorepo and `apps/web` depends on the
`@studesk/engine` workspace, so the install must happen at the repo root — which is exactly what Vercel does
when the root directory is set to the app rather than the repo.

1. Vercel → Add New → Project → import `theamstudiodev/arcoin`.
2. **Root Directory: `apps/web`.** Framework preset should detect Next.js; leave the build and install
   commands on their defaults so Vercel runs the workspace install at the repo root.
3. **Production Branch: `week-1/sign-in-people`**, so PR #1 need not be merged yet.
4. Add the two environment variables from section 5, for every environment.
5. **Settings → Deployment Protection → turn Vercel Authentication off.** On by default, it puts a Vercel
   login in front of the site, so nobody without access to your Vercel account could open the staging URL.
   Harmless now, but it would silently block the team later, and it is easier to notice today.
6. Deploy. Note the `https://<name>.vercel.app` URL.
7. **First smoke test — the proxy.** Visit `/people` while signed out. Pass: redirected to `/login`. Native
   support makes failure unlikely, but this proves the session refresh actually runs on the host, and nothing
   else about the deployment can be trusted until it does.
8. In Supabase → Authentication → URL configuration, set **Site URL** to the Vercel URL. Staging's is
   currently `http://localhost:3000`. Code-based sign-in does not depend on it, but leaving it wrong puts
   localhost links in any email Supabase sends by default.

A custom domain can be attached later on the same project, with free managed HTTPS; only the Site URL in
step 8 changes. Nothing in the app hard-codes the host.

## 7. Signed-out application testing

All over HTTPS, on the deployed URL:

- [ ] `/people` signed out → `/login`
- [ ] `/` → redirects into the app, no error page
- [ ] `/login` renders: blueprint background, Arcoin wordmark, email and password fields
- [ ] The tab title is `Arcoin`
- [ ] `http://` redirects to `https://`, with no mixed-content warnings
- [ ] View source and search the served JavaScript for `sb_secret_`. Pass: nothing.
- [ ] A stranger's address → *"This email isn't on the AM Studio team list. Ask Athiq to add you."*
- [ ] A signed-out REST read of `people` with the publishable key → `42501`
- [ ] At 390px wide: no horizontal scroll, controls at least 44px
- [ ] After signing in as the owner account: the cookie has `Secure`, `HttpOnly`, `SameSite=Lax` and an
      expiry roughly 90 days out

## 8. Database authorisation testing with test accounts

The test accounts on `arcoin.invalid` can never receive email, so their passwords are minted directly with
the secret key — a local script, never the app, never the host:

```
admin.createUser({email, password, email_confirm: true})
```

`email_confirm: true` matters twice over. A confirmed account keeps its password, while an unverified one has
it cleared by the section 2 trigger — that asymmetry is the fix working as intended. It also sends no email,
which is the only reason these accounts can exist at all: a signup for an address the mailer cannot reach is
rolled back, as section 2 proved.

> **Unverified:** whether GoTrue accepts `@arcoin.invalid` through `admin.createUser` has not been tested.
> It skips the mailer, so it should pass, but if it refuses the address, re-seed the three test people on a
> domain the mailer accepts — `staging.invalid` is confirmed accepted — and delete the old rows. Nothing
> else in the plan changes.

Then, with `@supabase/supabase-js` and the **publishable** key, sign in as each and assert:

| Account | Must be able to | Must be refused |
|---|---|---|
| Test Admin (`director`) | read the team; add and edit people | removing their own admin access |
| Test Lead (`lead`) | read the team and projects | adding a person (`42501`) |
| Test Junior (`junior`) | read the team | adding a person; promoting themselves to `director`; writing `task_schedule`; reading `audit_log` — all `42501` |
| Test Junior, then `active = false` | nothing | reading people, projects or settings → all empty |
| No session at all | nothing | every table → `42501` |

Also, with the owner account, walk the real onboarding path once: ask for a code, read the email, set a
password, reach `/people`. **Expect the email to contain a link, not a six-digit code** — that is the
unresolved template blocker, not a bug. The flow cannot be completed from that email. See section 10.

## 9. Rollback

**The application.** Every Vercel deployment is kept and immutable: open the previous one and *Promote to
Production* to roll back in seconds, or delete the project to take staging offline entirely. Nothing in the
database changes either way.

**The host.** If Vercel raises the fair-use point, the switch is Netlify free — a root `netlify.toml` with
`command = "npm run build -w apps/web"`, `publish = "apps/web/.next"` and `@netlify/plugin-nextjs`, plus the
same two environment variables. Only section 6 and the Site URL change; every other section of this plan is
host-independent.

**The security trigger**, if it ever interferes with Supabase's own auth:

```sql
drop trigger studesk_no_password_before_verified on auth.users;
drop function app.no_password_before_verified();
```

No downtime. It is not an undo — cleared passwords are not restored — and dropping it re-opens the account
takeover, so pair it with pausing onboarding. `docs/STAGING-VALIDATION.md` §N has the full caveats.

**The schema.** Migrations are forward-only and there is no hosted `db reset`. Staging holds nothing
irreplaceable at this point, so the rollback is to delete the project and re-run section 1 against a fresh
one. Take a backup first once staging holds anything you would miss:

```bash
SUPABASE_DB_URL=<session-pooler-url> ./scripts/backup.sh
```

**The test data**, before the real team is onboarded:

```sql
delete from auth.users where id in (
  select auth_user_id from public.people where sort_order >= 100 and auth_user_id is not null);
delete from public.people where sort_order >= 100;
```

Check `select count(*) from public.people` is 0 afterwards, then follow `docs/SETUP.md` Part C.

---

## 10. Blockers and risks

**Blocker — staff cannot receive a sign-in code.** Supabase's built-in email sends 2 messages an hour, only
to addresses on your Supabase team. Sections 7 and 8 therefore test the *rules* fully but the *onboarding
experience* only through your own mailbox. A staging trial with Asif, Athiq and the others is impossible
until custom SMTP exists. Resend's free tier is 3,000 emails a month and needs a domain you can verify.

**Blocker — the six-digit emails cannot be deployed.** Editing authentication templates requires custom
SMTP, so staging sends Supabase's defaults, which carry a link. The app's code step expects six typed digits
and `/login` has no token handler, so that link is a dead end. The app is **not** being changed to accept
it. Both blockers have the same single fix.

**Accepted — Hobby's licence terms.** Covered in full under *The licence position* above: there is no
staging exception, the exposure is a paused deployment at worst, no data is at risk, and Netlify is a
same-day switch. Recorded rather than treated as resolved.

**Risk — the monorepo build is unverified.** Root Directory `apps/web` with Vercel's workspace detection is
the documented path for npm workspaces, but it has not been run against this repo. Expect at most a failed
build or two. Nothing reaches the database, so a failed build costs only time.

**Mostly removed — adapter risk.** Choosing Vercel drops the OpenNext adapter entirely, so Next 16.4.2's
renamed `proxy.ts` is handled by the framework's own host. The section 6 step 7 smoke test stays anyway: it
is cheap, and it is the one check that proves the signed-out redirect works in production.

**Risk — the free Supabase project pauses.** A free project pauses after about a week without activity, and
unpausing is a click. The nightly backup counts as activity; set it up (`docs/SETUP.md` Part D) if staging
needs to stay warm.

**Note — staging's Site URL is `http://localhost:3000`.** Harmless for code-based sign-in, fixed in
section 6 step 6.

**Note — the secret key.** Needed only by the section 8 script. Keep it in `apps/web/.env.local` on your
machine. It must never be added to Vercel's environment variables, and the app does not read it.
