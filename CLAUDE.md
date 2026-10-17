# Studesk

Internal studio-management app for **AM Studio**, an architecture practice in Mangalore, India.
7 staff today. Built and maintained by one developer. Phase 1 of 6.

The problem it solves: ~50 projects have finished presentation and are waiting to move into
development, with only 5 production staff. Priorities live in one person's head, drawings slip,
and nothing is written down. Studesk makes capacity visible and forecasts dates from it.

---

## Repository layout — one folder, front end and back end together

```
apps/web/          Next.js — every screen, plus the server side (server actions, route handlers)
packages/engine/   @studesk/engine — the scheduler. Pure TypeScript, imported by apps/web
supabase/          the database: migrations (source of truth), seed, access tests, email template
scripts/           bootstrap, test-db, backup, restore
docs/              setup guide, Phase 1 scope, Stitch prompts
```

npm workspaces: one `npm install` at the root installs everything.

## Golden rules

1. **The engine computes dates. Nothing else does.** `packages/engine` is a pure TypeScript
   package with no I/O, no database, no `Date.now()` passed implicitly. Every date a user sees
   comes from it. Never compute a forecast in a component or a route handler.
2. **Vertical slices, not layers.** Finish migration → query → route → screen for one entity
   before starting the next. Never leave a half-wired entity.
3. **Migrations only.** Never hand-edit a database. Every schema change is a migration file
   committed to the repo.
4. **Multi-tenant columns from day one.** Every domain table carries `org_id`. There is exactly
   one org today, but AM Studio plans Mysore and Bangalore branches and may later sell this to
   other studios. Adding the column later is a painful migration; carrying it now is free.
5. **Server-stamped time.** Any timestamp that matters (task completion, punch in/out later)
   comes from the database, never the client clock.
6. **No feature from a later phase.** If it is not in `PHASE-1-SCOPE.md`, it does not get built,
   even if it is five minutes of work. Leave a `// phase N` comment and move on.
7. **Mobile-first, always.** Every component's base styles are the phone layout; `md:` and up add
   the desktop. Athiq and Asif run the studio from their phones. Never write a desktop layout and
   add breakpoints afterwards.
8. **Every mutation is a named service function** in `apps/web/src/lib/actions/`, with a Zod input schema, that
   returns a typed result. The UI calls these. In Phase 4 the AI agents will call the *same
   functions* as tool definitions — so a mutation written inline in a route handler or component
   is a mutation that has to be rewritten later.

---

## Domain language — use these exact terms in code, UI and tables

### Project tiers
`development` · `ready_to_release` · `response_awaited` · `dormant`

- **Development** — has a dated package schedule and a named Project Architect. Only these are
  scheduled. Limit 15.
- **Ready to Release** — all inputs in hand, next to enter Development. Limit 10.
- **Response Awaited** — blocked on a client decision, payment or document.
- **Dormant** — no client response for 60+ days.

### Packages — a project's work is delivered in these, over months, not all at once
| Code | Name |
|---|---|
| `P01` | Site and Study |
| `P02` | Design (Concepts) |
| `P03` | Proposal and Presentation |
| `P04` | Design and Tender |
| `P05` | Co-ordinated Consultant and Vendor Drawings |
| `CS` | Civil / Structure |
| `SV` | Services |
| `TD` | Technical Details |
| `ADD` | Additional tasks — one-off work outside the drawing list |

`ADD` is required, not an afterthought: revised options, client meeting decks, site
measurements, authority queries. It is planned and timed exactly like a drawing.

### Task status
`todo` · `in_progress` · `for_check` · `checked` · `issued`

A task counts as **done** at `checked` or `issued`.

### Roles
`principal` (Ar. Asif) · `director` (Ar. Athiq) · `lead` (Project Architect) ·
`junior` · `technical`

`principal` and `director` are **admins**. Everyone else is **staff**.

### Studio limits — these are business rules, enforced and tested
- 5 packages in production studio-wide
- 2 packages in production per Project Architect
- 15 projects in Development, 10 Ready to Release
- Working week: Monday–Saturday. 6 production hours per person per day.
- A person's `capacity` is a fraction: Asif 0.25, Athiq 0.5, everyone else 1.0.

---

## The scheduler engine

```ts
// packages/engine/src/schedule.ts
export function schedule(input: ScheduleInput): ScheduleResult
```

**Input:** open tasks, projects (with priority), people, a capacity lookup, settings, `today`.
**Output:** `{ start, end }` per task, plus a list of clashes.

**Algorithm:**
1. Take every open task on a `development` project.
2. Sort by project priority (1 = most urgent), then package order, then task order.
3. Fill each assignee's days back to back, skipping days with zero capacity.
4. A task's remaining hours are discounted by status:
   `todo` 1.0 · `in_progress` 0.5 · `for_check` 0.2 · `checked` 0.1 · `issued` 0.

**Capacity is an interface, not a table lookup:**

```ts
type CapacityFn = (personId: string, date: IsoDate) => number // hours available
```

Phase 1 implements it as `working day ? hoursPerDay * person.capacity : 0`.
Phase 3 swaps in the `capacity_calendar` table so approved leave reduces it.
**Do not let the engine know what leave is.**

**Constraints:**
- Pure. No `new Date()` without an injected `today`. No randomness. Same input, same output.
- Runs in the browser for instant preview and on the server for the stored truth.
- **Write its tests before its implementation.** A fixed set of projects and people in, a known
  set of dates out. Every studio limit above becomes a test.

---

## Stack

- **Next.js** (current major) App Router, React 19, TypeScript strict — in `apps/web`
- **Tailwind 4** + shadcn/ui
- **Supabase**: Postgres 17, Auth (email and password; a 6-digit emailed code sets the first password
  and resets a forgotten one), row-level security. Mumbai region.
- **SQL migrations** in `supabase/migrations/` are the schema's single source of truth
- **supabase-js** with generated types (`apps/web/src/lib/database.types.ts`) for every query — so every
  user query runs under row-level security. **Do not add an ORM that connects to Postgres
  directly** (Drizzle, Prisma, Kysely on a connection string): it connects as the database owner
  and silently bypasses every access rule.
- **Zod** for every boundary — one schema per entity, shared by form, route and insert
- **TanStack Query** on the client
- **Vitest** for the engine

Deployment is deliberately undecided until Phase 1 works. Develop against local Supabase.
Keep everything portable: no platform-specific APIs, nothing that assumes a serverless runtime.

---

## Access rules — in Postgres, not in React

Implemented in `supabase/migrations/20261017000400_access.sql` and the triggers in `…0300_rules.sql`.
Proven by `supabase/tests/access_test.sql` (26 checks) — run `./scripts/test-db.sh`. **Any change to
a policy or trigger needs a test in that file first.**

RLS policies are the enforcement. The UI only decides what to *show*.

| Table | Staff | Admin |
|---|---|---|
| `projects` | read all | all |
| `packages`, `tasks` | read all; the project's lead manages them; an assignee may change **status only** | all |
| `task_schedule` | read | read — written only by the server with the secret key |
| `audit_log` | none | read — append-only for everyone |
| `people` | read all (the scheduler needs capacity in the browser) | all |
| `settings` | read | write |

Phase 3 adds `attendance`, `leave_requests`, `review_notes` — all admin-only or own-row-only.
Design the policies now so those slot in without rework.

---

## Conventions

- Dates are `YYYY-MM-DD` strings in the domain layer, never `Date` objects. Timestamps are
  `timestamptz`.
- Hours are `numeric(5,1)` in half-hour steps — the database rejects anything else.
- Table and column names `snake_case`, used as-is from the generated types. No mapping layer.
- No barrel files. Import from the exact module.
- Components that fetch are Server Components. Anything interactive is a Client Component with
  an explicit `"use client"`.
- Error messages name what went wrong and what to do: "Task needs an assignee before it can be
  scheduled", never "Invalid input".

## Design

- The product's visible name is **Arcoin** — login, top bar, tab title, sign-in email (`APP_NAME` in
  `apps/web/src/lib/brand.ts`). Code, packages, tables and docs keep `studesk`.
- `bg-blueprint` (`apps/web/src/app/globals.css`) is used ONLY on the login page, the PWA splash and empty states.
  Working screens — People, Projects, Timeline and every other data screen — stay on the light background `#F6F7F8`,
  because dense data reads better on light.
- Colours, type scale and density: `docs/STITCH-PROMPTS.md` Part 1.

## Do not

- Do not add a column, index or policy "while you're there" — every schema change is its own reviewed migration.
- Do not install a charting library. The timeline is a custom layout over a date scale; a chart
  library will be fought, not used.
- Do not use `localStorage` for anything that must survive or be shared.
- Do not turn off email confirmation (`enable_confirmations` in `supabase/config.toml`, *Confirm email* in the
  dashboard). With it off, anyone who knows the email of a teammate who hasn't signed in yet can sign up as them
  with a password and skip the emailed code. `apps/web/e2e/account-security.spec.ts` proves it stays closed.
- Do not build an abstraction for a second org, a second branch or a plugin system. Carry
  `org_id` and stop there.

## Database rules already enforced — do not re-implement in the app

- `tasks.project_id` and `org_id` are derived from the package by a trigger; never send them.
- `tasks.done_at` is stamped by the server clock when status reaches `checked` or `issued`.
- An assignee who is not the lead or an admin can change a task's **status only** — anything else
  raises error `42501` with a readable message. Show that message; don't pre-check it in React.
- `projects.tier_since` updates itself on every tier change.
- Sign-in is an allowlist: an email not in `people` cannot create an account (trigger on `auth.users`).
- Every change to people, projects, packages, tasks and settings lands in `audit_log`.

## Commands

```bash
supabase start                 # local stack: API :54321 · DB :54322 · Studio :54323 · Mailpit :54324
supabase db reset              # rebuild local DB from migrations + seed
supabase migration new <name>  # never edit a migration that has been applied anywhere
./scripts/test-db.sh           # access tests — must pass before any push
npm run db:types               # regenerate apps/web/src/lib/database.types.ts after any migration
npm run dev / npm test / npm run typecheck
```
