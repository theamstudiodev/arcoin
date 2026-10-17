# Studesk — Phase 1 scope

**Goal:** replace the spreadsheet-and-memory system with one shared plan that forecasts dates
from real capacity.

**Estimated effort:** 140–180 focused hours. 6 weeks at 25 hours a week.
(Includes the mobile surface — see item 9. Built mobile-first it adds ~20 hours; retrofitted later
it costs three times that.)

**Acceptance test — the one sentence this phase is judged on:**

> Athiq opens Studesk on Monday morning, sees all 50 projects sorted into four tiers, changes
> one project's priority, and the timeline redraws with correct dates for every affected person.

If that works, Phase 1 is done. If it doesn't, nothing else matters.

---

## In scope

### 1. Auth and roles
- Email and password sign-in (Supabase Auth). A 6-digit emailed code sets the first password and resets a
  forgotten one.
- Two effective roles: **admin** (`principal`, `director`) and **staff** (everyone else).
- RLS policies on every table from the first migration, not retrofitted.

### 2. People
- 7 records: name, role, capacity fraction, active flag.
- Admin-editable. No invitations flow yet — admins create the rows, people sign in with the
  matching email.

### 3. Projects and the portfolio board
- Fields: code, name, client, type, **tier**, **priority**, lead, target date, `org_id`.
- Four tier columns with their limits shown, over-limit marked.
- Sorted by priority within each tier. Change tier and priority from the card.

### 4. Packages and the drawing register
- The 9 package codes per project, created on demand rather than all upfront.
- Tasks under each: title, assignee, hours, due date, status, `is_extra`, order.
- **Add a task to any package at any time** — including `ADD` for work outside the drawing
  list. This is a first-class requirement, not an edge case.
- Inline editing. This is the screen people live in; it must be fast to type into.

### 5. The scheduler engine
- `packages/engine`, pure, with Vitest tests written first.
- Capacity as an injected function (see `CLAUDE.md`).
- Runs client-side for preview and server-side for the stored `task_schedule` rows.

### 6. Timeline
- 12 weeks ahead. Two views: **by person** and **by project and package**.
- Bars from the engine's dates, due-date markers, late tasks outlined.
- Horizontal scroll, sticky labels. No charting library.

### 7. Settings
- Working days, production hours per day, the four studio limits, holidays list.
- Seeded with the agreed defaults so it works before anyone touches it.

### 8. Basic clash list
- Only four checks in Phase 1: over the production-slot limit, over the per-lead limit, a task
  forecast to miss its due date, a task that cannot be scheduled (no assignee or no hours).
- A plain list. No AI, no suggested fixes.

### 9. Mobile — an installable PWA, not a native app
Athiq and Asif are rarely at a laptop. The phone surface is **not the desktop app shrunk** — the
timeline and the drawing register are unusable at 390px and should not be attempted. Build three
mobile-first screens instead:

- **Today** — what is due today, what slipped, what needs a decision, the one project most at
  risk. Each line taps through. This becomes the daily-brief agent's surface in Phase 3.
- **Portfolio** — the four tiers as a scrollable list, not columns. Tap a project to open it.
  Change tier and priority from here.
- **Project** — read-mostly: packages, next deliverables, who is on it, forecast finish date.

Staff get their own task list and the five status buttons on the same PWA. That is all they need
on a phone in Phase 1.

**Technical requirements:**
- Tailwind written mobile-first from the first component (base styles are phone, `md:` and up add
  the desktop layout). This is the whole reason it is cheap — retrofitting is not.
- `manifest.json` with `display: standalone`, 192 and 512 icons, theme colour.
- A service worker that caches the app shell. Do not rely on Background Sync — it does not exist
  on iOS. Retry pending writes on `visibilitychange` instead.
- iOS has no install prompt. Show a one-time card telling iOS users: Share → Add to Home Screen.
- **Auth gotcha, solve it in week 1:** a magic link opens in Safari, but an installed PWA on iOS
  has its own storage container, so the session can land in the wrong place. Sign-in is **email and
  password** typed inside the app; setting or resetting the password uses a **6-digit code** typed
  inside the app — never a link. Set a long session (60–90 days) so they rarely re-authenticate.
- Push notifications are **Phase 2**, not Phase 1 — but ship the manifest and service worker now
  so the install works and push can be switched on later without another install.

---

## Explicitly out of scope

Leave a `// phase N` comment and move on. Do not build these "while you're in there".

| Deferred | Phase |
|---|---|
| Sprints, commit/close, burndown | 2 |
| Email notifications, Monday plan, Friday digest | 2 |
| Punch clock, leave requests, capacity calendar | 3 |
| Attendance register, performance screens, review notes | 3 |
| All AI features | 4 |
| Fees, invoicing, design-freeze forms, change requests | 5 |
| Transmittals, consultant input tracking, file uploads | 5 |
| Multi-branch UI | 6 |
| Realtime subscriptions | later — refetch on window focus is enough for 7 people |
| Push notifications | 2 — manifest and service worker ship in 1, push switches on in 2 |
| Native iOS/Android app | not planned — revisit only if Studesk is sold to other studios |
| Timeline and drawing register on a phone | not planned — wrong tool for the screen |

---

## What the client must supply before coding starts

Chase these now. Each one blocks real work, and all of them are things only AM Studio has.

- [ ] The standard drawing list PDF (P01–P05 and the rest), as the master template
- [ ] Hour estimates per drawing type — rough is fine; they get corrected from real data
- [ ] The 50 projects: code, name, client, current stage, lead, target date
- [ ] Holiday calendar for the next 12 months
- [ ] Written confirmation of the limits: 5 packages in production, 2 per lead, 15 in Development
- [ ] Email addresses for the 7 people, and confirmation that Asif and Athiq are the admins

> **Do not start the drawing-register UI until the real drawing list is in hand.** Building it
> against invented data is the fastest way to build the wrong thing twice.

---

## Build order — vertical slices

| Week | Slice | Done when |
|---|---|---|
| 1 | Repo, migrations, auth, people, RLS, a deployed staging URL | You can sign in as Athiq on a real URL and see 7 people |
| 2 | Projects + portfolio board | Tiers and priorities can be changed and persist |
| 3 | Packages + drawing register | A task can be added to any package, including `ADD` |
| 4 | Engine + tests | Tests pass for every studio limit; dates are stored |
| 5 | Timeline + settings + clash list | The acceptance test above passes |
| 6 | Mobile: Today, Portfolio, Project + PWA install | Athiq runs Monday morning from his phone |
| 7 | Load the real 50 projects. Use it daily. Fix what breaks | Athiq used it for a week without asking for the spreadsheet |

Week 1 deploys to a real URL even though it is ugly. Proving the whole pipeline end to end in
week 1 removes the biggest risk in the project.

Week 6 is not optional. It is where the data model gets corrected while correcting it is still
cheap.

---

## Commercial notes

This is client work, so protect the boundary:

- **Get Phase 1 scope signed off in writing**, with the acceptance test as the definition of
  done. "Can you also just add attendance?" mid-build is how fixed-price internal tools lose money.
- **Bill phases separately.** Each is independently useful; if AM Studio stops after Phase 2
  they still have something better than today.
- **Hosting is the client's account, not yours.** Set up Supabase, the domain and any VPS or
  Vercel billing under AM Studio's own email and card from day one. Migrating accounts later is
  tedious and makes you look like a hostage-taker even when you aren't.
- Budget confirmed at ₹5,000/month covers every deployment route discussed — so defer the
  hosting decision until Phase 1 runs. Decide it with real numbers in week 5.
- **Agree who owns the code** before you start, especially given the SaaS ambition. If Studesk
  might later be sold to other studios, that conversation is far easier now than after it works.
