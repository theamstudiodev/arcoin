import {addDays, type IsoDate, isoWeekday, startOfWeek, type TaskForecast} from '@studesk/engine';
import {blockingCount, bySeverity, CLASH_LABELS} from '@/lib/clash-rules';
import {
  type PackageForSchedule,
  type ProjectForSchedule,
  STUDIO_TIME_ZONE,
  type StudioForecast,
  studioToday,
  type TaskForSchedule,
} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';
import {byPackageOrder} from '@/lib/package-rules';
import {isAdmin, type PersonRole} from '@/lib/roles';
import {isTaskDone, type TaskStatus} from '@/lib/task-rules';

/**
 * Today — what the screen says, worked out away from the screen.
 *
 * It answers one question: what needs me today. Everything here is something to act on, so a card with
 * nothing in it is not rendered at all — an empty DECIDE card is noise at half past eight, not
 * reassurance. When all four come back empty the screen says so in one line instead.
 *
 * Pure, and tested on its own: the dates and the clashes arrive from `loadStudioForecast()`, which the
 * Timeline and the clash list read too, so Today can never disagree with them about a date.
 */

/** The four cards, in the order the mock stacks them. */
export type TodayCardKind = 'decide' | 'slipped' | 'due' | 'issued';

/**
 * A task as Today reads it. `done_at` is the moment the database stamped a drawing `checked` or
 * `issued`. `lib/forecast.ts` does not select that column yet, so ISSUED YESTERDAY finds nothing and
 * is therefore not shown — optional rather than invented, because nothing here should guess when a
 * drawing went out.
 */
export type TodayTask = TaskForSchedule & {done_at?: string | null};

/** One tappable line: a drawing, or a clash under DECIDE. Every line on this screen goes somewhere. */
export interface TodayRow {
  key: string;
  /** The project code, set in mono, when the line names a drawing. */
  code: string | null;
  text: string;
  /** Whose drawing it is, first name only, the way the studio says it. */
  who: string | null;
  status: TaskStatus | null;
  /** A small marker at the end of the line: 'CAPACITY' on a clash, '2 days late' on a slip. */
  note: string | null;
  href: string;
}

export interface TodayCard {
  kind: TodayCardKind;
  /** 11px uppercase: DECIDE, SLIPPED, DUE TODAY, ISSUED YESTERDAY. */
  label: string;
  headline: string;
  /** The quiet line under the headline — 'Open clashes' on DECIDE. */
  sub: string | null;
  href: string;
  rows: readonly TodayRow[];
}

export interface TodayBrief {
  /** 'Tuesday 17 Nov' */
  date: string;
  /** 'Good morning, Athiq' */
  greeting: string;
  /** '3 things need you', or 'Nothing needs you' when the stack is empty. */
  summary: string;
  needsYou: number;
  cards: readonly TodayCard[];
  /** Open drawings due between tomorrow and Saturday: the real number in the empty state. */
  laterThisWeek: number;
}

export interface TodayViewer {
  id: string;
  name: string;
  role: PersonRole;
}

export interface TodayInput extends Pick<StudioForecast, 'today' | 'projects' | 'packages' | 'people' | 'clashes'> {
  tasks: readonly TodayTask[];
  forecasts: ReadonlyMap<string, TaskForecast>;
  /** The hour in Mangalore, 0–23. Passed in so nothing in here reads a clock. */
  hour: number;
  viewer: TodayViewer;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CLASHES_HREF = '/clashes';

/**
 * Where a drawing or a slipped package sends you. Screen 3 — the project's own page with its drawing
 * register — is not built yet, and the studio's rule is that nothing links nowhere, so every one of
 * these lines lands on the board that holds the project. The day `/projects/<id>` exists, this is the
 * only line that changes.
 */
const PROJECT_HREF = '/projects';

/** Where a list card sends you: Bushra to her own week, the partners to the studio's. */
function workHref(admin: boolean): string {
  return admin ? '/timeline' : '/my-work';
}

/** 'Tuesday 17 Nov' — the date line in the phone's navy header. */
export function formatHeaderDate(date: IsoDate): string {
  // Built from the studio's one short-date formatter rather than a second table of month names.
  const short = formatShortDate(date);
  const weekday = WEEKDAYS[isoWeekday(date) - 1];
  const [dayOfMonth, month] = short.split(' ');
  if (!weekday || !month) return short;
  return `${weekday} ${dayOfMonth} ${month}`;
}

/** The hour in Mangalore, 0–23. The greeting reads the studio's clock, never the server's. */
export function studioHour(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  });
  return Number(formatter.format(now));
}

/** A name without its honorific: 'Ar. Bushra' is Bushra, which is what the studio calls her. */
export function firstName(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => !word.endsWith('.'));
  return words.length > 0 ? words[0] : name.trim();
}

/** 'Good morning, Athiq'. Morning until noon, afternoon until five, evening after that. */
export function greetingFor(hour: number, name: string): string {
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${partOfDay}, ${firstName(name)}`;
}

export function summaryLine(needsYou: number): string {
  if (needsYou === 0) return 'Nothing needs you';
  return needsYou === 1 ? '1 thing needs you' : `${needsYou} things need you`;
}

/** The empty state's second line. The count is counted, not written in. */
export function laterThisWeekLine(count: number): string {
  if (count === 0) return 'Everything on schedule. Nothing else due before Saturday.';
  return `Everything on schedule. ${count} drawing${count === 1 ? '' : 's'} due later this week.`;
}

/**
 * A clash without its instruction. The engine writes '<what is wrong>. <what to do>.' — the phone has
 * room for the first half, and the clash list carries the whole sentence.
 */
function firstSentence(message: string): string {
  const end = message.indexOf('. ');
  return end === -1 ? message : message.slice(0, end);
}

/** An unranked project is worked after every ranked one, which is what the engine does with it too. */
function rankOf(project: ProjectForSchedule | undefined): number {
  return project?.priority ?? Number.MAX_SAFE_INTEGER;
}

export function buildToday(input: TodayInput): TodayBrief {
  const {forecasts, today, viewer} = input;
  const admin = isAdmin(viewer.role);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const packageById = new Map(input.packages.map((pkg) => [pkg.id, pkg]));
  const whoById = new Map(input.people.map((person) => [person.id, firstName(person.name)]));

  // Athiq and Asif run the studio, so they see all of it. Bushra sees her own drawings: a studio slot
  // limit is not hers to fix, and a card she cannot act on is noise first thing in the morning.
  const inScope = input.tasks.filter((task) => admin || task.assignee_id === viewer.id);
  const open = inScope.filter((task) => !isTaskDone(task.status));

  const lateDaysOf = (task: TodayTask) => forecasts.get(task.id)?.lateDays ?? 0;
  // The order the studio works in, and the order the engine schedules in: project priority, then
  // package, then the register's own order.
  const studioOrder = (a: TodayTask, b: TodayTask) => {
    const byPriority = rankOf(projectById.get(a.project_id)) - rankOf(projectById.get(b.project_id));
    if (byPriority !== 0) return byPriority;
    const packageA = packageById.get(a.package_id);
    const packageB = packageById.get(b.package_id);
    const byPackage = packageA && packageB ? byPackageOrder(packageA, packageB) : 0;
    return byPackage !== 0 ? byPackage : a.sort_order - b.sort_order;
  };

  const due = open.filter((task) => task.due_date === today).sort(studioOrder);
  // Slipped is the engine's own verdict, not a comparison of our own: a task it forecasts to finish
  // after its due date. Worst first — that is the one Athiq has to move.
  const slipped = open
    .filter((task) => lateDaysOf(task) > 0)
    .sort((a, b) => lateDaysOf(b) - lateDaysOf(a) || studioOrder(a, b));

  const yesterday = addDays(today, -1);
  const issued = inScope
    .filter((task) => task.status === 'issued' && wentOut(task, yesterday))
    .sort(studioOrder);

  const blocking = admin ? input.clashes.filter((clash) => clash.severity === 'block').sort(bySeverity) : [];

  const row = (task: TodayTask, note: string | null): TodayRow => ({
    key: task.id,
    code: projectById.get(task.project_id)?.code ?? null,
    text: task.title,
    who: task.assignee_id ? (whoById.get(task.assignee_id) ?? null) : null,
    status: task.status,
    note,
    href: PROJECT_HREF,
  });

  const cards: TodayCard[] = [];

  if (blocking.length > 0) {
    cards.push({
      kind: 'decide',
      label: 'DECIDE',
      headline: firstSentence(blocking[0].message),
      sub: 'Open clashes',
      href: CLASHES_HREF,
      rows: blocking.slice(1).map((clash, index) => ({
        key: `clash-${index}`,
        code: null,
        text: firstSentence(clash.message),
        who: null,
        status: null,
        note: CLASH_LABELS[clash.kind],
        href: CLASHES_HREF,
      })),
    });
  }

  if (slipped.length > 0) {
    const worst = slipped[0];
    const named = [projectById.get(worst.project_id)?.name, packageById.get(worst.package_id)?.code]
      .filter((part) => part)
      .join(' ');
    cards.push({
      kind: 'slipped',
      label: 'SLIPPED',
      headline: `${named || 'A drawing'} slipped ${days(lateDaysOf(worst))}`,
      sub: null,
      href: PROJECT_HREF,
      rows: slipped.map((task) => row(task, `${days(lateDaysOf(task))} late`)),
    });
  }

  if (due.length > 0) {
    cards.push({
      kind: 'due',
      label: 'DUE TODAY',
      headline: `${due.length} drawing${due.length === 1 ? '' : 's'} due`,
      sub: null,
      href: workHref(admin),
      rows: due.map((task) => row(task, null)),
    });
  }

  if (issued.length > 0) {
    cards.push({
      kind: 'issued',
      label: 'ISSUED YESTERDAY',
      headline: `${issued.length} drawing${issued.length === 1 ? '' : 's'} went out`,
      sub: null,
      href: workHref(admin),
      rows: issued.map((task) => row(task, null)),
    });
  }

  // What you can actually do something about. Blocking clashes come from the shared counter, so the
  // header and the clash list always agree; Bushra's number leaves them out, because so does her screen.
  const needsYou = (admin ? blockingCount(input.clashes) : 0) + slipped.length + due.length;

  const saturday = addDays(startOfWeek(today), 5);
  const laterThisWeek = open.filter(
    (task) => task.due_date !== null && task.due_date > today && task.due_date <= saturday,
  ).length;

  return {
    date: formatHeaderDate(today),
    greeting: greetingFor(input.hour, viewer.name),
    summary: summaryLine(needsYou),
    needsYou,
    cards,
    laterThisWeek,
  };
}

function days(count: number): string {
  return `${count} day${count === 1 ? '' : 's'}`;
}

/** Whether a drawing went out on `day`, as the studio reckoned that day — not as UTC did. */
function wentOut(task: TodayTask, day: IsoDate): boolean {
  if (!task.done_at) return false;
  const stamped = new Date(task.done_at);
  return !Number.isNaN(stamped.getTime()) && studioToday(stamped) === day;
}
