# Studesk — Phase 2 scope

**Goal:** turn the forecast into a commitment. Phase 1 says when a drawing *will* finish; Phase 2
asks someone to promise a week's worth of them, then records what actually happened.

**Estimated effort:** 90–120 focused hours. 4 weeks at 25 hours a week.
(Smaller than Phase 1 because the schema, the engine, the access rules and the installed PWA are
already there. Most of this phase is new surface over existing foundations.)

**Acceptance test — the one sentence this phase is judged on:**

> On Monday morning Athiq commits the week's drawings to a sprint; every person gets their own
> plan by email and a push on the phone they installed in Phase 1; on Saturday evening the studio
> sees a burndown of what actually moved against what was promised.

If that works, Phase 2 is done.

---

## Why these three things, and not others

Phase 1 made capacity visible. The gap it left is accountability: the timeline is a *prediction*,
and nobody ever agreed to it. A forecast nobody signed is a forecast nobody owes you.

The three items below are the ones deferred to Phase 2 in `PHASE-1-SCOPE.md:99-108`. They are one
feature wearing three hats — a sprint is the promise, email is how it reaches people who are not
looking at the app, push is how it reaches the two who are never at a laptop.

---

## In scope

### 1. Sprints — the weekly commitment

The studio's working week is already Monday–Saturday (`settings.workdays`). A sprint is that week,
with a list of drawings somebody has said out loud will be done by Saturday.

**Three states, one direction:** `planning` → `committed` → `closed`. No reopening. A closed sprint
is a record, not a working document.

- **Plan.** Admins and leads pull open tasks into next week's sprint. The engine's forecast is the
  default suggestion — everything it already places inside the window — but a human can add or
  remove any task. The suggestion is advice, not a gate.
- **Commit.** Freezes the list and **snapshots each task's hours at that moment** into
  `sprint_tasks.committed_hours`. This is the whole point: if someone edits a task from 8 hours to
  20 on Wednesday, the promise was still 8, and the burndown must say so.
- **Close.** Saturday. Records what reached `checked`/`issued`, and what did not. Unfinished work
  is **carried over** into the next sprint's plan, flagged as carry-over — not silently dropped,
  and not silently re-promised either.

**Burndown.** Lives in the engine, pure, tests first, same as everything else:

```ts
// packages/engine/src/burndown.ts
export function burndown(input: BurndownInput): BurndownResult
```

Ideal line: committed hours falling to zero across the sprint's working days (holidays skipped —
the engine already knows them). Actual line: committed hours minus hours completed per day, from
`tasks.done_at`, which the database already server-stamps. **No new timestamp is needed and no
nightly snapshot table** — the history is already being written.

**Who may commit and close:** admins and the project's lead. Enforced in RLS, like everything else.

**A seventh clash check.** Phase 1 ships six (`slot_limit`, `lead_slot_limit`, `dev_limit`,
`ready_limit`, `late`, `unschedulable`). Phase 2 adds `sprint_overrun`: a committed task the engine
forecasts to finish *after* the sprint ends. That is a promise the maths already disagrees with, and
it should be visible on Monday rather than discovered on Saturday.

**Committing does not freeze the engine.** Priorities still change, the timeline still redraws. The
sprint records what was promised, the engine records what is true, and the distance between them is
the burndown. Freezing the schedule to protect a commitment would make the forecast lie — and the
forecast is the product.

**New tables** (one migration, per golden rule 3):

| Table | Holds |
|---|---|
| `sprints` | `org_id`, `starts_on`, `ends_on`, `state`, `committed_at`, `closed_at`, `closed_by` |
| `sprint_tasks` | `sprint_id`, `task_id`, `committed_hours`, `carried_from`, `sort_order` |

Both carry `org_id` from day one. Both land in `audit_log`. Both get an access test in
`supabase/tests/access_test.sql` **before** the policy is written.

---

### 2. Email — Monday plan, Saturday digest

Two emails. No more. An internal tool that emails often is an internal tool people filter.

- **Monday plan**, 07:00 IST, one per person: your committed drawings this week, their due dates,
  anything carried over from last week, and the one thing most at risk. Admins get the studio-wide
  version.
- **Saturday digest**, 18:00 IST, admins only: what closed, what carried, the burndown, the clash
  list as it stands going into next week.

> **Correction to the Phase 1 note.** `PHASE-1-SCOPE.md:100` says "Friday digest". The working week
> was later confirmed as Monday–**Saturday**, so a Friday digest would report a week that still has
> a day left in it. Saturday evening is the right slot. Flagging rather than silently changing it —
> confirm when signing this scope.

**What this needs that Phase 1 does not have:**

- **A real transactional sender.** Today the only email the app sends is the Supabase Auth sign-in
  code (`supabase/templates/sign-in-code.html`), and hosted Supabase's built-in SMTP is rate-limited
  and explicitly not for application mail. Phase 2 needs a provider (Resend, SES or SendGrid) on a
  verified AM Studio domain with SPF and DKIM. **On AM Studio's account and card**, same rule as
  hosting.
- **An `email_log` table.** Idempotency, not analytics: one row per person per email per sprint,
  with a unique constraint. A retry after a timeout must never send the plan twice.
- **A per-person switch.** `people.email_opt_in`, default on. One toggle, not a preference centre.

**Scheduling: `pg_cron` in Supabase, not the host's cron.** `CLAUDE.md` requires portability — "no
platform-specific APIs, nothing that assumes a serverless runtime" — and `STAGING-DEPLOY.md` already
names Netlify as the fallback if Vercel objects on fair use. A cron tied to the host is a cron that
has to be rewritten the day the host changes. `pg_cron` + `pg_net` calling a route handler with the
secret key keeps the trigger next to the data and survives the move.

---

### 3. Push notifications — switching on what Phase 1 installed

The manifest and the service worker shipped in Phase 1 **specifically so this phase costs the studio
nothing** (`apps/web/public/sw.js:22`). Nobody re-installs anything; a `push` listener added to the
existing worker reaches the phones already carrying it.

**Three events get a buzz. Nothing else.**

1. Your sprint was committed — here is your week.
2. A drawing was assigned to you.
3. A drawing you own went late.

A status change, a priority change or a new project does **not** push. The fastest way to get push
turned off is to send one too many.

**What it needs:**

- `push_subscriptions` table: `person_id`, `endpoint`, `p256dh`, `auth`, `last_seen_at`. Own-row
  access only — a subscription is a device, and nobody reads anybody else's.
- VAPID keys in the environment, the `web-push` library on the server.
- `push` and `notificationclick` handlers in the existing `sw.js`, deep-linking to Today or the
  drawing register. The worker stays hand-written and short; no build step, same as now.
- Stale endpoints pruned on a 410 from the push service.

> **iOS constraint, not a bug.** Safari only delivers Web Push to a site **installed to the home
> screen**, and permission must be requested from a user gesture. So push works for whoever
> installed the PWA and nobody else. Phase 1 already ships the install card for exactly this reason
> — but it means the rollout step is "everyone installs it", and that is a studio conversation, not
> a code change.

---

## Explicitly out of scope

Leave a `// phase N` comment and move on.

| Deferred | Phase |
|---|---|
| Punch clock, leave requests, capacity calendar | 3 |
| Attendance register, performance screens, review notes | 3 |
| All AI features — including a sprint the agent plans for you | 4 |
| Fees, invoicing, design-freeze forms, change requests | 5 |
| Transmittals, consultant input tracking, file uploads | 5 |
| Multi-branch UI | 6 |
| Velocity trends across many sprints, team dashboards | later — needs a year of sprints to mean anything |
| Per-event notification preferences, digest frequency settings | later — one opt-in switch until someone asks |
| Sprints on a timescale other than the working week | not planned — the studio's week is the unit |
| Realtime subscriptions | later — refetch on focus is still enough for 7 people |

---

## What AM Studio must supply before coding starts

- [ ] A domain for transactional email, with DNS access to add SPF and DKIM records
- [ ] The email provider account, on AM Studio's own email and card
- [ ] Written confirmation: **Saturday** digest, not Friday — and the two send times
- [ ] Confirmation of who may commit and close a sprint (proposed: admins and the project's lead)
- [ ] Confirmation that carry-over is the right behaviour for unfinished work
- [ ] All 7 phones with Arcoin installed to the home screen — push reaches nobody else

---

## Build order — vertical slices

| Week | Slice | Done when |
|---|---|---|
| 1 | `sprints` + `sprint_tasks` migration, access tests, `burndown()` in the engine with tests first | Access tests pass; burndown returns a known curve for a fixed sprint |
| 2 | Sprint screen: plan, commit, close, carry-over, burndown, the `sprint_overrun` clash | Athiq can commit a week and close it, on desktop and on a phone |
| 3 | Email provider, `email_log`, `pg_cron` trigger, Monday plan | A real Monday plan lands in 7 inboxes, once, with correct drawings |
| 4 | Saturday digest, push subscriptions, `sw.js` handlers, the three events | Athiq's phone buzzes when his sprint is committed |

Week 1 touches the database and the engine only. If the sprint model is wrong, it is wrong before
any UI has been built on top of it — which is the cheapest moment to find out.

---

## Phase 1 contracts this phase must not break

These were paid for once. Breaking one is a regression, not a trade-off.

- **The engine computes every date.** Sprint windows come from `startOfWeek` and `addDays`, and the
  burndown is a pure function with injected `today`. Nothing computes a date in a component.
- **Every mutation is a named service function** in `apps/web/src/lib/actions/`, with a Zod schema.
  `commitSprint` and `closeSprint` become Phase 4 agent tools unchanged — that is the whole reason
  for the rule.
- **Migrations only.** Never hand-edit a database.
- **RLS is the enforcement.** New tables get policies and tests, not React checks.
- **Email confirmation stays on.** `apps/web/e2e/account-security.spec.ts` proves it.
- **Mobile-first.** The sprint screen's base styles are the phone. Athiq commits from his phone.
- **No ORM on a connection string**, no charting library — the burndown is a custom layout over the
  same date scale the timeline already uses.

---

## Commercial notes

- **Sign this scope separately**, with the acceptance test as the definition of done. Phase 1's
  boundary held because it was written down; this one needs the same.
- **The email provider and any push service are the client's accounts**, set up under AM Studio's
  email and card from day one — same rule as Supabase and the domain.
- Running cost rises for the first time in Phase 2: a transactional email plan. At 7 people and two
  emails a week it sits in every provider's free tier, but it is a real account somebody must own.
- **Phase 2 is independently useful.** If AM Studio stops here, they have a studio that plans a
  week, promises it, and reports on it — which is more than most practices this size have.
