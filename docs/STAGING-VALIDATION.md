# Staging validation — run this before any real person signs in

Work top to bottom. Every box has a pass line; if one fails, **stop there** and fix it before going on.
Nothing below is optional, because staging is the first place real email, real rate limits and HTTPS exist.

Local gives no signal on: email actually arriving, Supabase's hosted sending limits, the 60-second gap
between codes, cookies over HTTPS, or whether the whole studio shares one rate limit through the server's
IP address. That is what this list is for.

Target: `studesk-staging` (South Asia, Mumbai). Nothing here touches production.

---

## A. Before you push anything

- [ ] **The PR is merged, or you are on the merged commit.** `git log --oneline -1`
- [ ] **Local is green on that exact commit:** `./scripts/test-db.sh` · `npm test` · `npm run test:e2e` ·
      `npm run build -w apps/web` · `npm run typecheck`
- [ ] **A backup exists if staging already holds data you care about.** `./scripts/backup.sh`, and check the
      file is in Drive. Skip only on a brand-new empty project.
- [ ] **You know how to undo the security migration.** `docs/SETUP.md` and the migration header carry it:
      ```sql
      drop trigger studesk_no_password_before_verified on auth.users;
      drop function app.no_password_before_verified();
      ```

## B. SMTP — do this before the first sign-in, not after

Supabase's built-in email sends **2 messages an hour, only to people on your Supabase team**. Staff cannot
sign in with it. Resend must be working first.

- [ ] **Sending domain verified in Resend.** Domains → the domain shows *Verified*, with SPF and DKIM green.
      A domain still pending means codes land in spam or nowhere.
- [ ] **DMARC record exists** for the domain. Without it, Gmail and Outlook may quietly bin the codes.
- [ ] **Custom SMTP enabled:** Authentication → Emails → SMTP. Host `smtp.resend.com`, port `465`, username
      `resend`, password = a Resend key with *Sending access*.
- [ ] **Sender is `arcoin@<verified-domain>`, sender name `Arcoin`.** This is what staff see in their inbox;
      an unfamiliar sender gets deleted.
- [ ] **Send a test to a non-team address** (a personal Gmail, not your Supabase account's). It must arrive.
      Pass: it is in the inbox, **not** the spam folder. If it is in spam, fix DNS before continuing.

## C. Templates — all three carry the code, never a link

A link opens Safari's own cookie jar and will not sign anyone into the installed app. Paste
`supabase/templates/sign-in-code.html` into each.

- [ ] **Magic link** — subject `Set your Arcoin password`, body contains `{{ .Token }}`
- [ ] **Confirm signup** — same subject and body. *This is the one a brand-new person gets first.*
- [ ] **Reset password** — same subject and body. *This is what anyone asking Supabase directly receives.*
- [ ] Pass: each template preview shows a 6-digit code and **no `{{ .ConfirmationURL }}`**.

## D. Auth settings

- [ ] **Confirm email: ON.** Authentication → Providers → Email. With it off, anyone who knows a teammate's
      address can sign up as them and skip the code. The whole security model rests on this.
- [ ] **Allow new users to sign up: ON.** The first code is what creates the account.
- [ ] **Minimum password length: 8.** Matches the app's own rule; a mismatch shows staff a confusing refusal.
- [ ] **OTP expiry: 600 seconds.**
- [ ] **Site URL** set to the staging URL over **https**, and the redirect allow-list matches it.

## E. Push the schema and check the rules landed

```bash
supabase link --project-ref <staging-ref>
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

## F. The real team, and the admins first

- [ ] **Org, settings and the seven people inserted** with their real addresses — `docs/SETUP.md` Part C.
      Check every address character by character; a typo means that person can never sign in, and the
      allowlist will refuse them.
- [ ] **Asif and Athiq set their passwords first.** No longer a security requirement — an unverified account
      holds no password — but until one admin is in, nobody can add or fix anyone through the app.
- [ ] Pass: both reach `/people` and see the Add person button.

## G. Authentication, on a real phone

Use an actual iPhone and an actual Android phone on mobile data, not the desktop emulator. Safari is where
cookie behaviour differs.

- [ ] **A new joiner's first password:** email → code arrives → set password → lands on People.
      Time how long the email takes. Pass: under about 30 seconds.
- [ ] **Sign out, then sign in with the password.** Pass: reaches People.
- [ ] **A wrong password** gives *"That email and password don't match…"*, not a blank screen.
- [ ] **A stranger's address** gives *"This email isn't on the AM Studio team list. Ask Athiq to add you."*
- [ ] **The session survives.** Close the browser, reopen the next day. Pass: still signed in. Check the
      cookie has `Secure` and an expiry about 90 days out — this only works over HTTPS.
- [ ] **Two codes inside a minute.** Hosted Supabase sends one email per address per **60 seconds** (locally
      it is 1 second, so this path is effectively untested until now). Ask for a code, then ask again
      immediately. Pass: the code step still opens and shows *"A code was sent to this email less than a
      minute ago. Use the newest one."* — not an error.
- [ ] **Shared rate limit.** Every auth call reaches Supabase from the server's single IP address. Have
      three or four people sign in within a minute or two. Pass: nobody is rate-limited. If they are, raise
      the hosted auth rate limits before go-live — this will not show up with one tester.

## H. Access rules, against the hosted database

These are enforced in Postgres, so they must be proven on the real thing, not inferred from local.

- [ ] **A junior sees the team read-only.** Sign in as a junior. Pass: no Add person button, no edit buttons.
- [ ] **A junior cannot add anyone directly.** Browser console on the staging site:
      ```js
      await window.supabase?.from('people').insert({name:'x'})
      ```
      or use the publishable key from a REST client. Pass: error `42501`.
- [ ] **An unverified sign-up reads nothing.** Register an address that is on the team list but has never
      signed in, without using the code, then query `people`. Pass: `42501`, no rows.
- [ ] **Someone made inactive loses access.** Set `active = false` for a test person while they are signed
      in. Pass: their next page load lands on `/login`, and they read no people, projects or settings.
- [ ] **An admin cannot remove their own admin access.** Pass: the self-lockout message appears.

## I. Password recovery

- [ ] **Forgotten password through the app:** Set a password → email → code → new password → signs in.
      Pass: the **old** password is refused afterwards.
- [ ] **A reset requested straight from Supabase** (dashboard → send recovery, or `resetPasswordForEmail`).
      Pass: the email carries a **6-digit code**, not a link — this is the Reset password template.
- [ ] **A failed save does not lock anyone out.** Verify a code, then deliberately submit a 5-character
      password. Pass: it is refused, and the person can start again and get in.
- [ ] **A pre-registered address cannot be claimed.** Register a team address that has never signed in, with
      a password of your own. Then have that person onboard normally with their code. Pass: your password is
      refused (`invalid_credentials`) at every point — before, during and after their onboarding. **This is
      the fix in PR #1. If this one fails, stop everything.**

## J. Backups

- [ ] **Nightly backup run by hand once.** GitHub → Actions → Nightly backup → Run workflow. Pass: two
      `.dump` files appear in `Studesk/backups/daily` in Drive.
- [ ] **A restore practised** into a local database — `docs/SETUP.md` Part D. Do this once before go-live,
      not during an incident.

---

## If something fails

| Failure | Do this |
|---|---|
| Codes not arriving | Stop. Resend domain and DNS first. Nobody can sign in without it. |
| `studesk_no_password_before_verified` missing | Stop. Re-run `supabase db push` and re-check section E. |
| A pre-registered password works (section I) | Stop. Do not let real staff onboard. Report it. |
| Staff rate-limited (section G) | Raise the hosted auth rate limits before go-live. |
| Confirm email found OFF | Turn it on, then re-run all of section I. |

## Rolling back

The security migration drops cleanly with no downtime (see section A). The backfill cannot be undone — a
cleared password is gone — but anyone affected sets a new one with the emailed code, exactly as a new joiner
does. Everything else in PR #1 is app code: redeploy the previous build.
