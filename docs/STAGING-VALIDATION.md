# Staging validation — run this before any real person signs in

Work top to bottom. Every box has a pass line; if one fails, **stop there** and fix it before going on.
Nothing below is optional, because staging is the first place real email, real rate limits and HTTPS exist.

Local gives no signal on: email actually arriving, Supabase's hosted sending limits, the 60-second gap
between codes, cookies over HTTPS, token refresh after an hour, or whether the whole studio shares one rate
limit through the server's IP address. That is what this list is for.

Target: `arcoin-staging` (South Asia, Mumbai). Nothing here touches production.

---

## A. Before you push anything

- [ ] **Confirm the project ref really is staging.** `supabase projects list` and match the ref against the
      name. Do not trust a ref copied from a config file — `.mcp.json` carries one that may be stale.
      Pass: the ref you are about to link appears in the list, named `arcoin-staging`, region `ap-south-1`.
- [ ] **The PR is merged, or you are on the merged commit.** `git log --oneline -1`
- [ ] **Local is green on that exact commit:** `./scripts/test-db.sh` · `./scripts/test-guards.sh` ·
      `npm test` · `npm run test:e2e` · `npm run build -w apps/web` · `npm run typecheck` · `npm run lint`
- [ ] **A backup exists if staging already holds data you care about.** `./scripts/backup.sh`, and check the
      file is in Drive. Skip only on a brand-new empty project.
- [ ] **You know how to undo the security migration** — section N.

## B. SMTP — do this before the first sign-in, not after

Supabase's built-in email sends **2 messages an hour, only to people on your Supabase team**. Staff cannot
sign in with it. Resend must be working first. This section is the one thing `supabase config push` cannot
do for you, because the Resend key is a secret.

- [ ] **Sending domain verified in Resend.** Domains → shows *Verified*, with SPF and DKIM green.
      A domain still pending means codes land in spam or nowhere.
- [ ] **DMARC record exists** for the domain. Without it, Gmail and Outlook may quietly bin the codes.
- [ ] **Custom SMTP enabled:** Authentication → Emails → SMTP.

      | Setting | Value |
      |---|---|
      | Host | `smtp.resend.com` |
      | Port | `465` |
      | Username | `resend` |
      | Password | a Resend API key with *Sending access* |
      | Sender email | `arcoin@<verified-domain>` |
      | Sender name | `Arcoin` |

- [ ] **Send a test to a non-team address** (a personal Gmail, not your Supabase account's). It must arrive.
      Pass: it is in the inbox, **not** the spam folder. If it is in spam, fix DNS before continuing.

## C. Templates — all three carry the code, never a link

A link opens Safari's own cookie jar and will not sign anyone into the installed app. Paste
`supabase/templates/sign-in-code.html` into each; subject `Set your Arcoin password`.

- [ ] **Magic link** — the code a returning person gets
- [ ] **Confirm signup** — *the one a brand-new person gets first*
- [ ] **Reset password** — *what anyone asking Supabase directly receives*
- [ ] Pass: each preview shows a 6-digit code and **no `{{ .ConfirmationURL }}`**

## D. Auth settings — every value that matters

| Setting | Required value | Why |
|---|---|---|
| **Confirm email** | **ON** | With it off, anyone who knows a teammate's address can sign up as them and skip the code. The whole security model rests on this. |
| Allow new users to sign up | ON | The first code is what creates the account. |
| **Minimum password length** | **8** | Matches the app's own rule; a mismatch shows staff a refusal they cannot act on. |
| **OTP expiry** | **600** seconds | Hosted default is an hour. Ten minutes is the intent. |
| **OTP length** | **6** | If this is 8, the six code boxes cannot accept the code and **nobody can onboard at all**. |
| **Secure email change** | **ON** | If off, anyone holding a session can change the account's email to one they control. The People row keeps the old address, so `auth_user_id` stays linked while the sign-in address becomes theirs — a full takeover. |
| **Anonymous sign-ins** | **OFF** | If on, anyone gets a session for free. They would read nothing, but it should not be available. |
| **Manual linking** | **OFF** | If on, an account can attach another identity to itself. |
| Leaked password protection | ON if offered | Rejects passwords found in known breaches. Free to enable. |
| Site URL | the staging URL, **https** | |
| Redirect allow-list | matches the site URL | |

- [ ] Every row above checked.
- [ ] **Legacy keys not in use.** The app must use the `sb_publishable_…` and `sb_secret_…` keys, not the
      older `anon` / `service_role` ones. Supabase retires those by the end of 2026.

## E. What is automatic, and what needs the dashboard

`supabase config push` sends the properties `supabase/config.toml` declares to the linked project, prompting
per change. `supabase config diff` previews it without writing. So most of section D need not be typed into
the dashboard at all:

| | How |
|---|---|
| Confirm email, sign-ups allowed, OTP length, OTP expiry, minimum password length, secure email change, anonymous sign-ins, manual linking, site URL, redirect allow-list, all three email templates | **`supabase config diff` then `supabase config push`** — these are declared in `config.toml` |
| SMTP host, port, user, password, sender | **dashboard only** — the Resend key is a secret and is not in `config.toml` |
| Leaked password protection | **dashboard only** |
| Resend domain, SPF, DKIM, DMARC | **Resend and your DNS** |
| Keys, connection strings, GitHub secrets, hosting env vars | **dashboard, then copied by hand** |

- [ ] **`supabase config diff` run and read before `config push`.** Pass: the only differences are the ones
      you intend. Anything unexpected means the dashboard was changed by hand at some point.
- [ ] After pushing, **re-read section D in the dashboard anyway.** `config push` leaves undeclared
      properties alone, so a setting nobody declared can still be wrong.

## F. Push the schema and check the rules landed

```bash
supabase link --project-ref <arcoin-staging-ref>
supabase db push          # the seed is NOT pushed
```

- [ ] **All six migrations applied:** `supabase migration list`
- [ ] **Both auth triggers exist.** In the SQL editor:
      ```sql
      select tgname from pg_trigger
       where tgrelid = 'auth.users'::regclass and not tgisinternal order by tgname;
      ```
      Pass: `studesk_link_auth_user` **and** `studesk_no_password_before_verified`. If the second is missing,
      the password hole is open — stop.
- [ ] **No account is holding a password it should not:**
      ```sql
      select count(*) from auth.users where email_confirmed_at is null and encrypted_password is not null;
      ```
      Pass: `0`.

## G. The real team, and the admins first

- [ ] **Org, settings and the seven people inserted** with their real addresses — `docs/SETUP.md` Part C.
      Check every address character by character; a typo means that person can never sign in, because the
      allowlist will refuse them.
- [ ] **Asif and Athiq set their passwords first.** No longer a security requirement — an unverified account
      holds no password — but until one admin is in, nobody can add or fix anyone through the app.
- [ ] Pass: both reach `/people` and see the Add person button.

## H. Authentication, on a real phone

Use an actual iPhone and an actual Android phone on mobile data, not the desktop emulator. Safari is where
cookie behaviour differs.

- [ ] **A new joiner's first password:** email → code arrives → set password → lands on People.
      Pass: the email takes under about 30 seconds.
- [ ] **Sign out, then sign in with the password.** Pass: reaches People.
- [ ] **A wrong password** gives *"That email and password don't match…"*, not a blank screen.
- [ ] **A stranger's address** gives *"This email isn't on the AM Studio team list. Ask Athiq to add you."*
- [ ] **Two codes inside a minute.** Hosted sends one email per address per **60 seconds** (locally it is 1
      second, so this path is effectively untested until now). Ask for a code, then ask again immediately.
      Pass: the code step still opens, showing *"A code was sent to this email less than a minute ago. Use
      the newest one."* — not an error.
- [ ] **Shared rate limit.** Every auth call reaches Supabase from the server's single IP address. Have
      three or four people sign in within a minute or two. Pass: nobody is rate-limited. This will not show
      up with one tester; if it bites, raise the hosted auth rate limits before go-live.

## I. Sessions

- [ ] **The cookie is right.** Pass: `Secure`, `HttpOnly`, `SameSite=Lax`, and an expiry about **90 days**
      out. `Secure` only works over HTTPS, which is why section L matters.
- [ ] **The session survives a closed browser.** Reopen the next day. Pass: still signed in.
- [ ] **The session survives token refresh.** Leave a tab idle for over an hour (`jwt_expiry` is 3600), then
      act. Pass: it works without a trip to the login screen.
- [ ] **Signing out is this device only.** Sign in on the phone and the laptop, sign out on the phone.
      Pass: the laptop is still signed in. This is deliberate.
- [ ] **Setting a new password ends other devices' sessions.** Sign in on both, then reset the password on
      one. Pass: the other device is signed out on its next action.
- [ ] **A deactivated person loses data access at once.** Set `active = false` while they are signed in.
      Pass: their next page load lands on `/login`, and they read no people, projects or settings — even
      though their access token stays technically valid for up to an hour. Row-level security, not the
      token, is what stops them.

## J. Access rules and privilege escalation

Enforced in Postgres, so prove them on the real thing rather than inferring from local.

- [ ] **A junior sees the team read-only.** Pass: no Add person button, no edit buttons.
- [ ] **A junior cannot add anyone directly.** With the publishable key and a junior's session:
      `insert into people …`. Pass: error `42501`.
- [ ] **A junior cannot promote themselves.** Have them update their own row to `role = 'director'`, and
      separately to `active = false` on someone else. Pass: `42501` both times, and the role is unchanged.
- [ ] **An admin cannot remove their own admin access.** Pass: the self-lockout message appears.
- [ ] **Nobody can write forecast dates.** A signed-in user inserting into `task_schedule`. Pass: `42501` —
      only the server writes it.
- [ ] **The audit log is append-only and admin-read-only.** A junior selecting from `audit_log` gets
      nothing; nobody can delete from it. Pass: no rows for staff, delete refused.

## K. Account takeover

**The automated regression tests for this are local-only, by design** — the e2e suite refuses any non-local
Supabase URL and any non-local database URL, so it can never touch staging. On staging this is manual, and
it is the most important section in the document.

- [ ] **A pre-registered address cannot be claimed.** Register a team address that has never signed in,
      using a password of your own. Then have that person onboard normally with their code. Pass: your
      password is refused (`invalid_credentials`) at **every** point — before their onboarding, in the gap
      right after their code is accepted, and after they finish.
- [ ] **A failed save leaves nothing usable.** Verify a code, then deliberately submit a 5-character
      password. Pass: refused; the pre-registered password still does not work; and the person can start
      again and get in.
- [ ] **An unverified sign-up reads nothing.** Register a team address without using the code, then query
      `people`. Pass: `42501`, no rows.
- [ ] **An inactive person cannot start setting a password.** Pass: the team-list refusal.

**If any box in this section fails, stop everything. Do not let real staff onboard.**

## L. The deployed site

- [ ] **The secret key is not in the browser.** Open the site, view source and search the served JavaScript
      for `sb_secret_`. Pass: nothing. The app needs only the publishable key; the secret key is unused
      today and is reserved for writing `task_schedule` in a later week.
- [ ] **HTTPS is enforced.** Visit `http://` and confirm it redirects to `https://`. Pass: no plain-HTTP
      page is ever served, and no mixed-content warnings.
- [ ] **A signed-out visitor reads nothing.** Query `people` with the publishable key and no session.
      Pass: `42501`.
- [ ] **A signed-out visitor is sent to the login screen.** Visit `/people`. Pass: lands on `/login`.

## M. Backups

- [ ] **Nightly backup run by hand once.** GitHub → Actions → Nightly backup → Run workflow. Pass: two
      `.dump` files appear in `Studesk/backups/daily` in Drive.
- [ ] **A restore practised** into a local database — `docs/SETUP.md` Part D. Do this once before go-live,
      not during an incident.

---

## If something fails

| Failure | Do this |
|---|---|
| The project ref is not named `arcoin-staging` | Stop. You are pointed at the wrong project. |
| Codes not arriving | Stop. Resend domain and DNS first — nobody can sign in without it. |
| OTP length is not 6 | Stop. Nobody can onboard; the code boxes cannot take the code. |
| `studesk_no_password_before_verified` missing | Stop. Re-run `supabase db push` and re-check section F. |
| A pre-registered password works (section K) | Stop. Do not let real staff onboard. |
| Secure email change found OFF | Turn it on, then re-run section K. |
| Confirm email found OFF | Turn it on, then re-run all of section K. |
| Staff rate-limited (section H) | Raise the hosted auth rate limits before go-live. |

## N. Rolling back the security migration

```sql
drop trigger studesk_no_password_before_verified on auth.users;
drop function app.no_password_before_verified();
```

Safe to run, with three caveats:

- **It is not an undo.** Passwords the migration's backfill cleared are not restored. On staging, where
  nobody has a real password yet, that costs nothing. Later, anyone affected re-sets theirs with a code.
- **`drop trigger` briefly takes an exclusive lock on `auth.users`**, so sign-ins pause for well under a
  second on a table this size. Not zero.
- **Dropping it re-opens the takeover in section K.** Only roll back if the trigger breaks Supabase's own
  auth, and pair it with pausing onboarding.

Everything else is app code: redeploy the previous build.
