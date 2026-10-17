# Studesk — infrastructure setup

Do these in order. Part A is a one-time job of about an hour, mostly creating accounts.
Part B gets your laptop running in about 20 minutes. Part C is staging, and Part D is backups.

Nothing here costs money. Every service below is on its free tier until Phase 1 goes live.

---

## Part A — Accounts, owned by AM Studio

**Every account is created with AM Studio's email and AM Studio is the owner. You are added as a
member or admin.** This is the single most important rule in this document: when the engagement
ends, or if you are unavailable, the studio still owns its code, its data and its backups.

Use one shared operations address for all of them — for example a Google account such as
`studesk.amstudio@gmail.com`, or an alias on the studio's own domain if it has one. The partners
keep the password; you get invited.

| # | Account | Create | Owner | You |
|---|---|---|---|---|
| 1 | **Google** (ops email + Drive) | The ops address above. In its Drive, create a folder `Studesk/backups` | AM Studio | Editor on the folder |
| 2 | **GitHub organisation** | github.com → New organisation (free) → `am-studio`. Private repo `studesk` | AM Studio | Owner or Maintainer |
| 3 | **Supabase organisation** | supabase.com → sign in with the ops Google account → New organisation `AM Studio` (Free plan) | AM Studio | Developer → Owner while building |
| 4 | **Resend** (sign-in emails) | resend.com, free plan — 3,000 emails a month | AM Studio | Member |
| 5 | Domain or subdomain | Later, at deploy time — e.g. `studesk.<studio-domain>` | AM Studio | — |
| 6 | Anthropic console | Phase 4. Not now | AM Studio | — |

### Supabase projects

Create **one** project now: `studesk-staging`.

- **Region: South Asia (Mumbai).** This is the setting most often missed, and it can't be changed
  afterwards. Mumbai keeps queries at roughly 30–50 ms from Mangalore rather than 250 ms+ from the US.
- **Database password:** generate a strong one and store it in the studio's password manager.
  It is not recoverable from the dashboard.

Production is created at deploy time (week 5–6) as a second free project, `studesk-prod`, in the same
region. The free plan allows two active projects.

### Sign-in emails — set up custom SMTP before anyone else signs in

Supabase's built-in email sends **only 2 emails an hour, and only to people on the Supabase team**.
Staff could not sign in with it at all. Configure Resend as the sender:

1. Resend → Domains → add and verify a sending domain (the studio's domain, or a subdomain of it).
   If the studio has no domain yet, use Resend's test sender while only you are signing in.
2. Resend → API Keys → create one with *Sending access*.
3. Supabase → `studesk-staging` → Authentication → Emails → SMTP settings → Enable custom SMTP:
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password: the Resend API key
   - Sender email `studesk@<verified-domain>` · Sender name `Studesk`
4. Authentication → Emails → Templates → **Magic link**: subject `Set your Arcoin password`,
   body: paste `supabase/templates/sign-in-code.html`. It contains `{{ .Token }}`, which turns the
   magic link into a **6-digit code**. People sign in with email and password; the code only sets a
   first password or resets a forgotten one, typed inside the app — so it works in the installed iPhone app.
5. Authentication → Providers → Email: keep it enabled; set the OTP expiry to `600` seconds and the
   minimum password length to `8`.
6. Authentication → URL configuration: site URL `http://localhost:3000` for now.

---

## Part B — Your laptop

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 22 LTS | `node -v` |
| Docker Desktop | running | `docker ps` |
| Supabase CLI | latest | `supabase -v` — install with `brew install supabase/tap/supabase`, or use `npx supabase` |
| Git | any | `git -v` |
| psql | 15 or later | `psql --version` (comes with Postgres; on macOS `brew install libpq`) |

### Steps

```bash
unzip studesk.zip -d ~/Projects && cd ~/Projects/studesk
./scripts/bootstrap.sh
```

The script runs 22 steps in order and **verifies each one before moving on**: prerequisites, git,
the Next.js app in `apps/web`, one workspace install, engine tests, shadcn, `supabase init` and its
configuration, the local stack, the 26 access checks, `.env.local`, generated database types, a
production build, the first commit — then the ten Claude Code plugins and MCP servers, one at a
time. If anything fails it stops, says what to fix, and resumes from that point when you re-run it.

The Supabase MCP needs the staging project's reference, so after Part C run it once more:
`STAGING_REF=<ref> ./scripts/bootstrap.sh`

You now have:

| | |
|---|---|
| Supabase Studio | http://127.0.0.1:54323 — browse tables, run SQL |
| API | http://127.0.0.1:54321 |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit | http://127.0.0.1:54324 — every sign-in code sent locally lands here |

Sign-in test: once the app exists, sign in as `athiq@amstudio.test` and read the code from Mailpit.
Any email not in the seeded team list is refused — that's the allowlist working.

### Everyday commands

```bash
supabase start / supabase stop
supabase db reset                      # rebuild local DB from migrations + seed
supabase migration new <name>          # new empty migration file — never edit an applied one
./scripts/test-db.sh                   # access tests (also run in CI on every push)
supabase gen types typescript --local > src/lib/database.types.ts   # after any schema change
```

---

## Part C — Staging

```bash
supabase login
supabase link --project-ref <staging-ref>    # Supabase → Project settings → General → Reference ID
supabase db push                             # applies migrations. The seed is NOT pushed.
```

Then, in the staging SQL editor, create the real org, settings and team — with the team's real
email addresses:

```sql
insert into public.orgs (name) values ('AM Studio') returning id;   -- copy the id
insert into public.settings (org_id) values ('<org-id>');
insert into public.people (org_id, email, name, role, capacity, sort_order) values
  ('<org-id>', '<asif-email>',    'Ar. Asif',    'principal', 0.25, 1),
  ('<org-id>', '<athiq-email>',   'Ar. Athiq',   'director',  0.50, 2),
  ('<org-id>', '<lilia-email>',   'Ar. Lilia',   'lead',      1,    3),
  ('<org-id>', '<disha-email>',   'Ar. Disha',   'lead',      1,    4),
  ('<org-id>', '<bushra-email>',  'Ar. Bushra',  'junior',    1,    5),
  ('<org-id>', '<nashwa-email>',  'Ar. Nashwa',  'junior',    1,    6),
  ('<org-id>', '<prapthi-email>', 'Ar. Prapthi', 'junior',    1,    7);
```

From then on, people are added through the app's People screen. Projects come in through the import
script you'll write in week 6 from the studio's list of 50.

### Keys

Use the **publishable** (`sb_publishable_…`) and **secret** (`sb_secret_…`) keys from
Project settings → API Keys. The older `anon` and `service_role` keys still work, but Supabase is
retiring them by the end of 2026 — start on the new ones and you'll never migrate.

The secret key bypasses every access rule. It lives only in server environment variables, and the
app uses it for exactly one thing: writing `task_schedule` after the engine runs.

---

## Part D — Nightly backups to Google Drive

The free plan has no downloadable backups, so this replaces them. It runs as a GitHub Action at
03:00 IST, keeps 30 days of daily backups plus the 1st of every month indefinitely, and emails the
repo admins if it ever fails.

1. **Connect rclone to the ops Google Drive** — once, on your laptop:
   ```bash
   brew install rclone            # or https://rclone.org/install/
   rclone config                  # n → name: gdrive → storage: drive → scope 1 (full) → sign in AS THE OPS ACCOUNT
   rclone lsd gdrive:Studesk      # should list "backups"
   cat ~/.config/rclone/rclone.conf
   ```
2. **Get the database URL:** Supabase → staging → Connect → **Session pooler** (port 5432, IPv4).
   Not the "Direct connection", which is IPv6-only and fails from GitHub's runners.
3. **GitHub → repo → Settings → Secrets and variables → Actions:**
   - Secret `SUPABASE_DB_URL` — the session pooler string, with the password filled in
   - Secret `RCLONE_CONFIG` — the full contents of `rclone.conf`
4. Actions → **Nightly backup** → *Run workflow*. Check that two `.dump` files appear in
   `Studesk/backups/daily` in Drive.

A daily backup also keeps a free project from pausing for inactivity during a long studio holiday,
as far as Supabase counts a nightly connection as activity. Don't rely on it — unpausing is one
click from the dashboard.

### Restoring — practise this once before go-live

```bash
# into a fresh, migrated, EMPTY database — never on top of live data
supabase db reset --no-seed            # or a brand-new Supabase project + `supabase db push`
TARGET_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  ./scripts/restore.sh ~/Downloads/studesk-2026-11-03T2130Z.dump --confirm
```

The schema always comes from the migrations; the backup supplies only data. That keeps one source
of truth and means a restore can never resurrect an old version of a rule.

---

## Checklist

- [ ] Ops Google account and `Studesk/backups` Drive folder — owned by AM Studio
- [ ] GitHub org `am-studio`, private repo `studesk`, you added
- [ ] Supabase org owned by AM Studio, `studesk-staging` **in Mumbai**
- [ ] Resend domain verified, SMTP configured, 6-digit code template in place
- [ ] `supabase start` and `./scripts/test-db.sh` passing on your laptop
- [ ] `supabase db push` to staging; real team inserted with real emails
- [ ] CI green on the first push
- [ ] Nightly backup run by hand once, files visible in Drive
- [ ] A restore practised into a local database
