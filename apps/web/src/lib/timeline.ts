import {addDays, daysBetween, type IsoDate, maxDate, startOfWeek, type TaskForecast} from '@studesk/engine';
import type {PackageForSchedule, PersonForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';
import {byPackageOrder, PACKAGE_NAMES, type PackageCode} from '@/lib/package-rules';
import {type ProjectBarClass, projectColourClass} from '@/lib/project-colours';
import {ROLE_LABELS} from '@/lib/roles';
import {TASK_STATUS_LABELS, type TaskStatus} from '@/lib/task-rules';

/**
 * The timeline's geometry: a 12-week date scale and where a forecast sits on it.
 *
 * Every date here arrives from the engine through `loadStudioForecast`. This module only decides how
 * far along a row a date falls, which is the one calculation the screen cannot avoid doing itself —
 * and the one most likely to be wrong by a day. It is pure so it can be tested without a browser.
 */

/** Twelve weeks ahead: PHASE-1-SCOPE item 6. Past that the forecast is a guess nobody plans against. */
export const TIMELINE_WEEKS = 12;
const DAYS_PER_WEEK = 7;

/** The sticky label column, verbatim from STITCH-PROMPTS Screen 4. */
export const LABEL_WIDTH = 180;

/**
 * Pixels, not percentages. The lane area is deliberately wider than the window — that is what makes
 * the grid scroll — so a percentage would shrink a day to whatever the laptop happens to be, and a
 * one-day drawing would stop being visible. Sixteen pixels a day gives a 112px week, wide enough for
 * `19 Oct` in 10.5px mono and narrow enough that twelve weeks is one short scroll.
 */
export const DAY_WIDTH = 16;
export const WEEK_WIDTH = DAY_WIDTH * DAYS_PER_WEEK;

/** Bar 22px tall with a 4px radius, from the mock. The gap is what keeps two stacked lanes apart. */
export const BAR_HEIGHT = 22;
export const LANE_GAP = 4;
const ROW_PADDING = 6;

export interface TimelineWeek {
  /** The Monday the column opens on. */
  monday: IsoDate;
  /** `19 Oct`. */
  label: string;
  /** Pixels from the left edge of the lane area. */
  left: number;
}

export interface TimelineScale {
  /** The Monday the window opens on, which is the Monday of the week containing `today`. */
  start: IsoDate;
  /** The last day in the window, inclusive. */
  end: IsoDate;
  days: number;
  weeks: readonly TimelineWeek[];
  /** Width of the lane area in pixels. */
  width: number;
  /** Pixels to the start of today, or null when today is outside the window. */
  todayLeft: number | null;
  /** `19 Oct – 10 Jan`, for the mono range label above the grid. */
  label: string;
}

/**
 * `19 Oct`. The scale has no room for a year and nobody reading twelve weeks needs one. Built out of
 * `formatShortDate` so the app keeps exactly one table of month names.
 */
function dayAndMonth(date: IsoDate): string {
  const parts = formatShortDate(date).split(' ');
  return parts.length === 3 ? `${parts[0]} ${parts[1]}` : date;
}

/**
 * The window always opens on a Monday, so a week column is a week of the studio's calendar rather than
 * an arbitrary seven days — the engine exports `startOfWeek` for exactly this. The mock's `20 Oct – 11
 * Jan` starts mid-week because it was drawn on a Tuesday; aligning to Monday is what makes the vertical
 * gridlines mean something.
 */
export function timelineScale(today: IsoDate, weeks: number = TIMELINE_WEEKS): TimelineScale {
  const start = startOfWeek(today);
  const days = weeks * DAYS_PER_WEEK;
  const end = addDays(start, days - 1);

  return {
    start,
    end,
    days,
    weeks: Array.from({length: weeks}, (_, index) => {
      const monday = addDays(start, index * DAYS_PER_WEEK);
      return {monday, label: dayAndMonth(monday), left: index * WEEK_WIDTH};
    }),
    width: days * DAY_WIDTH,
    todayLeft: today >= start && today <= end ? dayLeft(start, today) : null,
    label: `${dayAndMonth(start)} – ${dayAndMonth(end)}`,
  };
}

/** Whether a date can be drawn at all. ISO dates compare as strings, which is half the reason we use them. */
export function isInWindow(scale: TimelineScale, date: IsoDate | null): boolean {
  return date !== null && date >= scale.start && date <= scale.end;
}

/** Pixels from the lane's left edge to the start of `date`. Negative for a date before the window. */
function dayLeft(start: IsoDate, date: IsoDate): number {
  return daysBetween(start, date) * DAY_WIDTH;
}

export interface BarGeometry {
  left: number;
  width: number;
  /** The task began before the window opened — the bar is cut off at the left edge. */
  clippedStart: boolean;
  /** The task runs past the twelfth week — the bar is cut off at the right edge. */
  clippedEnd: boolean;
}

/**
 * A forecast's `{start, end}` as a left offset and a width, clipped to the window. Both dates are
 * inclusive: a drawing that starts and finishes on the same Wednesday is one day wide, not nothing.
 * Null when the task falls entirely outside the twelve weeks, which is a bar not to draw.
 */
export function barGeometry(scale: TimelineScale, start: IsoDate, end: IsoDate): BarGeometry | null {
  if (end < scale.start || start > scale.end) return null;

  const from = maxDate(start, scale.start);
  const to = end < scale.end ? end : scale.end;
  return {
    // A day is the smallest thing the scale can show, so never less than one — a bar of zero width is
    // a task that has quietly vanished off the screen.
    left: dayLeft(scale.start, from),
    width: Math.max(DAY_WIDTH, (daysBetween(from, to) + 1) * DAY_WIDTH),
    clippedStart: start < scale.start,
    clippedEnd: end > scale.end,
  };
}

/** The centre of a due date's column, for the diamond marker. Null when the date is outside the window. */
export function markerLeft(scale: TimelineScale, date: IsoDate | null): number | null {
  if (!isInWindow(scale, date)) return null;
  return dayLeft(scale.start, date as IsoDate) + DAY_WIDTH / 2;
}

export interface TimelineBar {
  taskId: string;
  title: string;
  projectId: string;
  /** Null when the studio has not given the project a code yet — the column is nullable. */
  projectCode: string | null;
  projectName: string;
  packageCode: PackageCode;
  assigneeId: string | null;
  status: TaskStatus;
  start: IsoDate;
  end: IsoDate;
  dueDate: IsoDate | null;
  /** Calendar days past the due date. Above zero gets the red outline and the dot. */
  lateDays: number;
}

export interface BlockedTask {
  taskId: string;
  title: string;
  projectId: string;
  projectCode: string | null;
  /** The engine's own words: "No assignee — the task cannot be placed on anyone's calendar". */
  reason: string;
}

export interface TimelineInput {
  tasks: readonly TaskForSchedule[];
  packages: readonly PackageForSchedule[];
  projects: readonly ProjectForSchedule[];
  forecasts: ReadonlyMap<string, TaskForecast>;
}

/** The last tie-break anywhere in this module, so two equal bars never swap places between loads. */
function byTitle(a: {title: string}, b: {title: string}): number {
  return a.title.localeCompare(b.title);
}

/**
 * Tasks and their forecasts, joined and split into what can be drawn and what cannot.
 *
 * A task with no forecast at all is not on a Development project — only those are scheduled, so it
 * belongs on neither list. A task with a `reason` is on a Development project and still has no dates:
 * nobody is assigned, or nobody estimated it. Those are listed under the grid rather than dropped,
 * because an invisible task is exactly the kind of thing that used to slip.
 */
export function timelineBars(input: TimelineInput): {bars: readonly TimelineBar[]; blocked: readonly BlockedTask[]} {
  const packageById = new Map(input.packages.map((pkg) => [pkg.id, pkg]));
  const projectById = new Map(input.projects.map((project) => [project.id, project]));

  const bars: TimelineBar[] = [];
  const blocked: BlockedTask[] = [];

  for (const task of input.tasks) {
    const forecast = input.forecasts.get(task.id);
    if (!forecast) continue;

    const pkg = packageById.get(task.package_id);
    const project = projectById.get(task.project_id);
    if (!pkg || !project) continue;

    if (forecast.reason !== null || forecast.start === null || forecast.end === null) {
      blocked.push({
        taskId: task.id,
        title: task.title,
        projectId: project.id,
        projectCode: project.code,
        reason: forecast.reason ?? 'The scheduler could not place this task',
      });
      continue;
    }

    bars.push({
      taskId: task.id,
      title: task.title,
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      packageCode: pkg.code,
      assigneeId: task.assignee_id,
      status: task.status,
      start: forecast.start,
      end: forecast.end,
      dueDate: task.due_date,
      lateDays: forecast.lateDays,
    });
  }

  return {bars: sortBars(bars, projectById), blocked: [...blocked].sort(byTitle)};
}

/** The engine's own queue order, so rows, lanes and the legend never shuffle between loads. */
function sortBars(bars: readonly TimelineBar[], projectById: Map<string, ProjectForSchedule>): readonly TimelineBar[] {
  const rank = (bar: TimelineBar) => projectById.get(bar.projectId)?.priority ?? Number.MAX_SAFE_INTEGER;

  return [...bars].sort((a, b) => {
    const byPriority = rank(a) - rank(b);
    if (byPriority !== 0) return byPriority;
    const byPackage = byPackageOrder({code: a.packageCode}, {code: b.packageCode});
    if (byPackage !== 0) return byPackage;
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    return byTitle(a, b);
  });
}

/**
 * Bars sit back-to-back along a row, but the engine leaves the hours left in a day for the next task —
 * so Ar. Bushra really does finish one drawing and start the next on the same Wednesday. Drawing those
 * two on top of each other would hide one of them, so a bar drops to the next lane whenever the one
 * before it has not ended. A person row that stacks is a person booked twice over, which is the thing
 * this screen exists to make visible.
 */
export function packLanes(bars: readonly TimelineBar[]): readonly (readonly TimelineBar[])[] {
  const lanes: TimelineBar[][] = [];

  for (const bar of [...bars].sort((a, b) => (a.start === b.start ? 0 : a.start < b.start ? -1 : 1))) {
    const lane = lanes.find((candidate) => bar.start > candidate[candidate.length - 1].end);
    if (lane) lane.push(bar);
    else lanes.push([bar]);
  }

  return lanes;
}

/** Pixels from the top of a row to the top of its nth lane. */
export function laneTop(lane: number): number {
  return ROW_PADDING + lane * (BAR_HEIGHT + LANE_GAP);
}

/** A row is as tall as its deepest stack. An empty row still holds one lane, so the grid keeps its rhythm. */
export function rowHeight(row: TimelineRow): number {
  const lanes = Math.max(1, row.lanes.length);
  return laneTop(lanes - 1) + BAR_HEIGHT + ROW_PADDING;
}

export interface TimelineRow {
  key: string;
  label: string;
  /** The second line under the label: a role, or a package name. */
  meta: string | null;
  lanes: readonly (readonly TimelineBar[])[];
}

/**
 * One row per person on the team, in the studio's own order. Everybody appears, including Asif and
 * Athiq — an empty row is the answer to "who is free", and hiding it would make the question
 * unanswerable.
 */
export function rowsByPerson(
  bars: readonly TimelineBar[],
  people: readonly PersonForSchedule[],
): readonly TimelineRow[] {
  return people
    .filter((person) => person.active)
    .map((person) => ({
      key: person.id,
      label: person.name,
      meta: ROLE_LABELS[person.role],
      lanes: packLanes(bars.filter((bar) => bar.assigneeId === person.id)),
    }));
}

/**
 * One row per package in production, highest-priority project first. Only packages with scheduled work
 * get a row: the other eleven Development projects have no drawings broken down yet, and fifty empty
 * rows would bury the five that matter.
 */
export function rowsByPackage(bars: readonly TimelineBar[]): readonly TimelineRow[] {
  const grouped = new Map<string, TimelineBar[]>();

  // `bars` already arrives in studio order, so first appearance is the right row order.
  for (const bar of bars) {
    const key = `${bar.projectId}/${bar.packageCode}`;
    const group = grouped.get(key) ?? [];
    group.push(bar);
    grouped.set(key, group);
  }

  return [...grouped.entries()].map(([key, group]) => {
    const first = group[0];
    return {
      key,
      label: `${first.projectCode ?? first.projectName} · ${first.packageCode}`,
      meta: PACKAGE_NAMES[first.packageCode],
      lanes: packLanes(group),
    };
  });
}

export interface LegendEntry {
  code: string;
  name: string;
  colour: ProjectBarClass;
}

/**
 * A bar's colour. Keyed on the project's code, falling back to its id when it has none, so a project
 * without a code still gets a stable colour instead of sharing one with every other code-less project.
 * The grid and the legend both call this — keying them differently would colour the legend wrongly.
 */
export function barColour(bar: Pick<TimelineBar, 'projectCode' | 'projectId'>): ProjectBarClass {
  return projectColourClass(bar.projectCode ?? bar.projectId);
}

/** Only the projects actually on the grid. A legend of fifty codes explains nothing. */
export function legendFor(bars: readonly TimelineBar[]): readonly LegendEntry[] {
  const seen = new Map<string, LegendEntry>();
  for (const bar of bars) {
    if (seen.has(bar.projectId)) continue;
    seen.set(bar.projectId, {
      code: bar.projectCode ?? bar.projectName,
      name: bar.projectName,
      colour: barColour(bar),
    });
  }
  return [...seen.values()];
}

/**
 * What a bar says to a screen reader, and what its tooltip says to everyone else. The status is in
 * there because a `checked` drawing carries only a tenth of its hours, so its bar is short for a
 * reason that colour and length alone cannot explain.
 */
export function barLabel(bar: TimelineBar): string {
  const parts = [
    [bar.projectCode, bar.title].filter(Boolean).join(' '),
    TASK_STATUS_LABELS[bar.status],
    `${formatShortDate(bar.start)} to ${formatShortDate(bar.end)}`,
  ];
  if (bar.dueDate) parts.push(`due ${formatShortDate(bar.dueDate)}`);
  if (bar.lateDays > 0) parts.push(`${bar.lateDays} ${bar.lateDays === 1 ? 'day' : 'days'} late`);
  return parts.join(' · ');
}

export const TIMELINE_VIEWS = ['person', 'package'] as const;

export type TimelineView = (typeof TIMELINE_VIEWS)[number];

/** The toggle's two labels, exactly as the mock words them. */
export const TIMELINE_VIEW_LABELS: Record<TimelineView, string> = {
  person: 'By person',
  package: 'By project & package',
};

/**
 * By person is the default. Athiq's first question on a Monday is who is overloaded, not which package
 * is where. Anything unrecognised in the query string falls back to it rather than showing an error.
 */
export function parseView(value: string | string[] | undefined): TimelineView {
  const first = Array.isArray(value) ? value[0] : value;
  return first === 'package' ? 'package' : 'person';
}
