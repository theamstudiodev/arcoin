# Studesk — Google Stitch prompts (Phase 1)

13 screens: 8 desktop, 5 mobile.

---

## How to use this

**Do not paste the whole file at once.** Stitch produces its best work when the design system is
established first and screens come in small batches.

1. Paste **Part 1** (design system) as your first message. Let it generate the style.
2. Then paste screen prompts **two at a time**, in the order given. Desktop before mobile.
3. If a screen comes back too airy, reply: *"Increase information density. Table rows 36px, body
   text 14px, section padding 16px. This is a professional tool used daily, not a marketing page."*
   Stitch defaults to spacious consumer layouts; this app is closer to a flight dashboard.
4. Light mode only for now. Ask for dark mode once you are happy with the light screens.

**A note on the sample data:** the prompts use AM Studio's real project and client names so the
layouts are sized against realistic content. If you would rather not put client names into a
third-party tool, swap them for "Project A / Client A" — but keep the *lengths* similar, because
that is what makes the column widths come out right.

---

# PART 1 — Design system (paste this first)

```
You are designing Studesk, an internal project-management web app for AM Studio, an
architecture practice in Mangalore, India. Seven people use it daily: two partners, two
project architects, three junior architects. It is a professional tool used for hours a
day, not a consumer app. Think "technical drawing office" — precise, dense, calm. Closer
to Linear or a flight operations dashboard than to a marketing site.

Create a design system with these exact values.

COLOURS
Primary (deep navy) — structure, navigation, primary buttons, headings:
  navy-900 #081C33   navy-800 #0B2545   navy-700 #13395E
  navy-600 #16406B   navy-400 #4A7BA7
Secondary (lime) — accent, active state, completion, the "today" marker:
  lime-500 #A3E635   lime-600 #84CC16   lime-100 #ECFCCB
Neutrals:
  bg #F6F7F8   surface #FFFFFF   border #E2E6E9   border-strong #C7CDD1
  text #141A21   text-muted #5B6670   text-faint #8A949C
Status:
  late/over-limit #DC2626 with tint #FEF2F2
  at-risk #F59E0B with tint #FFFBEB
  info #2563EB with tint #EFF6FF

COLOUR RULES — follow strictly:
- Navy is for interaction: buttons, links, nav, active tabs, focus rings.
- Lime means done, on-track, or "now". Use it for the Issued status, completed progress
  fills, and the today line on the timeline. Use it as a solid fill with navy-900 text on
  it — never as text on a white background, where it fails contrast.
- There is no second green. Lime is the only green in the system.
- Red and amber are reserved for lateness and warnings. Never decorative.
- Each project gets a colour from an 8-colour categorical palette for its timeline bars.
  These are project identity, separate from status colours.

TYPOGRAPHY
- Headings and the Studesk wordmark: Montserrat, 600 and 700 weight.
- All interface text, table content, forms, labels: Inter, 400 / 500 / 600.
- Codes, dates, hours, any aligned number: IBM Plex Mono, 400 / 500, with tabular figures.
- Scale: page title 26px/600 Montserrat · section heading 18px/600 Montserrat ·
  card title 15px/600 Inter · body and table 14px/400 Inter · secondary 13px ·
  labels 11px/500 uppercase with 0.08em letter-spacing, in text-muted · mono data 13px.

DENSITY AND FORM
- 8px spacing grid. Border radius 6px on inputs and buttons, 8px on cards.
- Table rows 36px tall. Table headers 11px uppercase mono-ish labels in text-muted.
- Borders are 1px hairlines, not shadows. Use at most one subtle shadow, on overlays only.
- Cards: white surface, 1px border, no drop shadow. Do not put a shadow and a border on
  the same element.
- Status appears as a small pill: 11px, 2px/8px padding, 10px radius, tinted background
  with the darker tone as text.
- Every interactive element has a visible keyboard focus ring: 2px navy-600, 2px offset.

VOICE
Plain, specific, never chirpy. Buttons say what happens: "Commit sprint", "Move to
Development". Errors say what to do: "This task needs an assignee before it can be
scheduled." No emoji anywhere.

Generate: the colour palette, type scale, and a component sheet showing buttons (primary,
secondary, ghost, destructive), inputs, select, date field, checkbox, status pills for the
five task statuses (Not started, In progress, For check, Checked, Issued), a tier chip, an
avatar with initials, a table row, and a card. Light mode, desktop.
```

---

# PART 2 — Desktop screens (1440px)

Prefix every screen prompt with this line so the style carries:

> *Studesk, same design system: navy #0B2545 + lime #A3E635, Montserrat headings, Inter UI,
> IBM Plex Mono for data, 36px table rows, hairline borders, no shadows. Desktop 1440px.*

---

### Screen 1 — Sign in

```
A centred sign-in card on a navy-900 full-bleed background with a faint technical grid
pattern at 4% opacity.

Card, 400px wide, white, 8px radius: the Studesk wordmark in Montserrat 700 navy-800 with
a small lime square mark; beneath it "AM Studio" in 13px text-muted.

Two states side by side:
A) Email entry — one email field, primary navy button "Send code", and 12px helper text
   "We'll email you a 6-digit code."
B) Code entry — six separate single-character boxes in IBM Plex Mono 20px, a "Verify"
   button, a ghost "Use a different email" link, and a 13px countdown "Resend in 0:42".

Below the card, 12px text-faint: "Studesk — AM Studio internal tool".
```

### Screen 2 — Portfolio board (the home screen)

```
The main screen. Top bar: Studesk wordmark left; nav tabs Portfolio · Timeline · Clashes ·
People · Settings with Portfolio active (navy underline, 2px); right side shows a "New
project" primary button and an avatar with initials "AA".

Below the bar, a thin summary strip: three inline stats in IBM Plex Mono — "5 / 5 packages
in production" (the 5/5 in lime), "12 / 15 in Development", "3 clashes" (in red).

Main area: four columns of equal width, each a tier.
- Development — header "Development", count chip "12 / 15" in text-muted
- Ready to Release — "8 / 10"
- Response Awaited — "19"
- Dormant — "11"
One column's count must show over-limit styling in red tint to demonstrate that state.

Project cards inside columns, stacked with 8px gaps. Each card: a 4px left edge in the
project's own categorical colour; top row showing project code in IBM Plex Mono 12px
text-muted ("AMS-26-014") and a priority chip ("P2", navy-tinted); project name in Inter
15px/600 ("Kadri Residence"); a metadata line in 12.5px text-muted ("Lead Lilia · Next P04
· Finishes 24 Nov"); and on two cards a red line reading "2 tasks running late".

Use these real cards: Kadri Residence (AMS-26-014, P1, Lilia), Mangala Residence
(AMS-26-008, P2, Disha), Madikeri Campus Block (AMS-26-002, P3, Athiq), Bejai Apartments
(AMS-25-031, P4, Lilia), Munnar Resort Phase 1 (AMS-25-019, P5, Disha), Kavoor Clinic
(AMS-26-021, P6, Lilia).

Columns scroll independently. Keep cards compact — six should be visible without scrolling.
```

### Screen 3 — Project detail with drawing register

```
The densest and most-used screen. Get the table right.

Header card: project name "Kadri Residence" as a 26px Montserrat title with the code
"AMS-26-014" beside it in mono; an editable field row beneath showing Client (Mr. Rashid
Kadri), Tier (a select showing "Development"), Priority (2), Project Architect (Ar. Lilia),
Target completion (24 Dec 2026), Type (Residence).
On the right of the header, three statistics stacked: "24 Nov" forecast finish, "2" late
tasks in red, "186 h" hours remaining — each a large Montserrat number with an 11px
uppercase label under it.

Below, one section per package, each a card:
- Package header bar in a faint navy tint: the code in mono lime-dark ("P04"), the name
  "Design and Tender" in Montserrat 16px, and on the right a stat line "8 / 21 issued ·
  142 h · finishes 24 Nov" plus a lime "In production" pill.
- A table beneath with columns: Status (a select styled as a status pill), Drawing / task,
  Assigned (select with a small avatar), Hours (number, 70px), Due (date), Forecast, and a
  delete icon. Rows 36px. Forecast column in mono; one row shows "18 Nov → 24 Nov · 6d
  late" in red.
- Issued rows appear at 60% opacity.

Show two packages: P04 Design and Tender with 7 rows (Ground floor working plan, First
floor working plan, Section AA and BB, Toilet details T1–T3, Staircase details, Door and
window schedule, Terrace and parapet details), and ADD Additional tasks with 2 rows
(Revised facade option for client, Site measurement visit).

At the bottom, an "Add a task" row styled distinctly: a package select, a title field, an
assignee select, hours, due date, and a navy "Add" button — all inline on one row.
```

### Screen 4 — Timeline

```
A Gantt-style capacity view, 12 weeks wide, horizontally scrollable.

Controls above: a segmented toggle "By person | By project & package" with "By person"
active, and a date range label "20 Oct – 11 Jan" in mono.

Grid: a sticky 180px left column of rows; a scrolling lane area to the right with vertical
week gridlines in border colour, week dates in 10.5px mono text-faint along the top, and a
2px lime vertical line marking today with a small "Today" label.

Rows, one per person: Ar. Lilia, Ar. Disha, Ar. Bushra, Ar. Nashwa, Ar. Prapthi — name in
13.5px Inter with the role beneath in 11.5px text-faint.

Bars: 22px tall, 4px radius, filled with the project's categorical colour at 90% opacity,
label inside in white 11px showing project code and task name, truncated with ellipsis.
Bars sit back-to-back along each row. One bar has a 2px red outline and a small red dot,
for a task that will miss its date. Show small diamond markers in navy outline for due
dates.

Below the grid, a horizontal legend of project colours with their codes in mono.

Keep it calm — this is read at a glance, not decorated.
```

### Screen 5 — Clashes

```
A single-column list, max 900px wide.

Page title "Clashes" with the subtitle "Updated 2 minutes ago · recalculated whenever
anything changes".

Each clash is a card with a 4px left edge coloured by severity: red for blocking, amber for
warning, navy for informational. Inside: an 11px uppercase mono kind label ("CAPACITY",
"LATE", "WORKLOAD", "FOLLOW UP"), then the message in 14.5px, then on the right an
outlined "Open project" button.

Show six:
- CAPACITY, red: "6 packages are in production at once — the studio limit is 5. Finish or
  pause one before starting another."
- CAPACITY, red: "Ar. Lilia has 3 packages in production (limit 2): AMS-26-014 P04,
  AMS-25-031 P05, AMS-26-021 P02."
- LATE, red: "Kadri Residence: 2 tasks will miss their due date. Worst: 'Toilet details
  T1–T3' finishes 24 Nov, due 18 Nov (6 days late)."
- LATE, red: "Madikeri Campus Block is forecast to finish 12 Feb 2027, after its target of
  31 Jan 2027."
- WORKLOAD, amber: "Ar. Bushra is fully booked for the next 4 weeks. New work for her will
  push dates out."
- FOLLOW UP, navy: "Bejai Apartments has waited 64 days for a client response. Send the
  formal letter, then move it to Dormant."

Also design the empty state: a centred panel with a lime check mark, "No clashes", and
"Every scheduled task finishes by its due date and the production limits hold."
```

### Screen 6 — People (admin)

```
A table of seven people with columns: Name (Inter 14px with role beneath in 11.5px
text-faint), Role (select), Time on production (select showing Full / 75% / Half / 25%),
then four narrow week columns "This wk, +1, +2, +3" each containing a thin 8px horizontal
capacity bar, and a remove icon.

Bars fill navy-600, turning red when fully booked. Show Ar. Bushra fully booked (red) in
all four weeks and Ar. Nashwa at roughly 60%.

Rows: Ar. Asif (Principal Architect, 25%), Ar. Athiq (Studio Director, Half), Ar. Lilia
(Project Architect, Full), Ar. Disha (Project Architect, Full), Ar. Bushra, Ar. Nashwa,
Ar. Prapthi (Junior Architect, Full).

Above the table: an "Add person" secondary button. Below it, 13px text-muted: "Bars show
booked hours per week against capacity. Red means fully booked."
```

### Screen 7 — Settings (admin)

```
Two cards side by side, max 1100px.

Left card "Studio rules": a two-column field grid — Production hours per person per day (6),
Packages in production, studio-wide (5), Packages in production per Project Architect (2),
Development limit (15), Ready to Release limit (10), Days before Dormant (60). Each field
is a labelled number input with the label above in 12px text-muted.

Right card "Calendar": a working-days row of seven day toggles (Mon–Sat selected in navy,
Sun unselected), and beneath it a holidays section — a text input plus a wrapped set of
removable date chips in mono showing "2026-11-14", "2026-12-25", "2027-01-26".

Each card has its heading in Montserrat 18px. Changes save on blur — show a small lime
"Saved" indicator that appears beside the section heading.
```

### Screen 8 — New project dialog

```
A modal over a dimmed navy backdrop. 640px wide, white, 10px radius, one soft shadow.

Title "New project" in Montserrat 20px. A two-column field grid: Name, Code (mono input,
placeholder "AMS-26-022"), Client, Type (select), Tier (select, defaulting to "Ready to
Release"), Priority (number, with helper text "1 = most urgent"), Project Architect
(select with avatars), Target completion (date).

Footer right-aligned: a ghost "Cancel" and a navy primary "Create project".

Also show the dialog's error state: the Name field with a red border and the message
"Give the project a name" beneath it in 12.5px red.
```

---

# PART 3 — Mobile screens (390px, installed PWA)

Prefix each with:

> *Studesk mobile, 390×844, installed PWA with no browser chrome. Same system: navy #0B2545
> + lime #A3E635, Montserrat headings, Inter UI, IBM Plex Mono for data. Thumb-reachable,
> generous tap targets of at least 44px. This is not the desktop app shrunk.*

---

### Screen 9 — Today (the mobile home screen)

```
The screen Athiq opens at 8:30am. It must answer "what needs me today" in one glance.

A navy-800 header block, 120px tall, with safe-area padding: "Tuesday 17 Nov" in 13px
lime-100, "Good morning, Athiq" in Montserrat 22px white, and beneath it one summary line
in 13px navy-100: "3 things need you".

Below, on the light background, a stack of four cards with 12px gaps, each with a left
edge colour and a chevron:
1. Red edge, label "DECIDE": "6 packages in production — one over the limit" with
   "Open clashes" beneath in 12.5px navy.
2. Amber edge, label "SLIPPED": "Kadri Residence P04 slipped 2 days — Bushra lost Monday
   to a site visit."
3. Navy edge, label "DUE TODAY": "2 drawings due" with two compact rows inside: "AMS-26-014
   · Toilet details T1–T3 · Bushra" and "AMS-25-031 · Section AA · Nashwa", each with a
   small status pill.
4. Lime edge, label "ISSUED YESTERDAY": "3 drawings went out" in a quieter treatment.

A fixed bottom navigation bar with four items: Today (active, lime icon and label),
Portfolio, Projects, Me. 56px tall plus safe-area inset.
```

### Screen 10 — Portfolio (mobile)

```
Not columns — a vertical list with a sticky filter row.

Sticky under the header: four horizontally scrollable tier chips — "Development 12",
"Ready 8", "Awaited 19", "Dormant 11" — with Development selected in navy, the others
outlined.

Below, a list of project rows. Each row: a 4px left colour edge; top line with the code in
11.5px mono text-muted and a priority chip right-aligned; the project name in 15px/600; a
metadata line in 12.5px text-muted ("Lilia · P04 · Finishes 24 Nov"); and, where relevant,
a 12px red line "2 late". A chevron on the right. Rows are 76px tall with hairline
separators, no card borders.

Show six rows using the same projects as the desktop board.

Include a floating action button in lime at the bottom right, above the nav bar, with a
navy plus icon.
```

### Screen 11 — Project (mobile)

```
Read-mostly. A back chevron and the project name in the header.

Top: the project name in Montserrat 20px, code in mono beneath, then a row of three
statistics in boxes — "24 Nov" finish, "2" late in red, "186 h" left.

Then a row of two controls: a Tier select and a Priority select, both full-width-ish pills
— these are the only two things editable on mobile, and they should look obviously tappable.

Then a packages list. Each package is a collapsible row: the code in mono lime-dark, the
name, and a right-aligned progress line "8 / 21". Expanding one (P04) reveals its tasks as
compact 56px rows: status pill, drawing name in 14px, and "Bushra · due 18 Nov" in 12px
text-muted, with late dates in red.

At the bottom, a quiet secondary button: "Open the full register on desktop".
```

### Screen 12 — My tasks (what staff see)

```
The junior architects' screen — Bushra's view.

Header: "My work" in Montserrat 22px with "This week" beneath in 13px text-muted, and a
small capacity line: "28 of 36 hours booked" with a thin navy progress bar.

A list grouped by day — "Today", "Tomorrow", "Thu 19 Nov" as 11px uppercase mono section
labels. Under each, task cards: project code in mono, drawing name in 15px, hours and due
date in 12.5px text-muted, and a prominent status control — a horizontal segmented row of
the five statuses with the current one filled navy, "Issued" filled lime.

Make the status control the visual focus of the card. Changing status is the only thing
staff do on their phone, so it should take one tap and be unmissable.

Bottom navigation with three items for staff: My work (active), Projects, Me.
```

### Screen 13 — Install prompt and empty states

```
Three small screens in one frame.

A) iOS install card: a bottom sheet over the app, with the Studesk mark, "Add Studesk to
   your home screen", and three numbered steps with small iOS icons — "Tap Share",
   "Choose Add to Home Screen", "Tap Add". A ghost "Not now" button.

B) Today, empty: the same navy header, then a centred panel with a lime check mark,
   "Nothing needs you" in Montserrat 18px, and "Everything on schedule. 4 drawings due
   later this week." in 13.5px text-muted.

C) Offline state: a thin amber strip beneath the header reading "Offline — showing the
   last update, 14 minutes ago" in 12.5px, with the content below at 70% opacity.
```

---

## After Stitch

Export the tokens and screens, then bring them into the build as:
- `globals.css` with the colour and type tokens as CSS custom properties
- shadcn/ui components restyled to match, rather than Stitch's generated markup
- Google Fonts: `Montserrat:wght@600;700`, `Inter:wght@400;500;600`,
  `IBM_Plex_Mono:wght@400;500`

Treat Stitch's output as the visual target, not as the code. Its HTML will not match the
component structure you need, and re-typing its colours by hand into Tailwind config takes
twenty minutes and saves you a week of fighting generated markup.
