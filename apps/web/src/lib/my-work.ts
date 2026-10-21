import {
  addDays,
  type CapacityFn,
  type IsoDate,
  isoWeekday,
  PACKAGE_ORDER,
  REMAINING_SHARE,
  type TaskForecast,
} from '@studesk/engine';
import type {PackageForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';
import type {PackageCode} from '@/lib/package-rules';
import {isTaskDone, type TaskStatus} from '@/lib/task-rules';

/**
 * One person's own work, worked out from the studio forecast.
 *
 * Five of AM Studio's seven people are junior or technical, and on a phone this screen is the whole
 * of the app for them: what is in front of me, in the order I will do it, and how full my week is.
 * So this module answers only those two questions.
 *
 * Pure, like the engine it reads from: rows and a capacity function in, groups out. No clock, no
 * database — which is what lets the week's arithmetic be tested rather than eyeballed.
 */

/** Today and the six days after it. The capacity line talks about exactly this window. */
export const WEEK_LENGTH = 7;

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Repeated from lib/format.ts, which keeps its own list private and always prints the year. A heading
// over one day in a list of seven does not need "2026" on it, so this one leaves the year off.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BLOCKED_NOTE = 'Still yours. The scheduler cannot give these a date until the gap on each one is filled.';

export interface MyWorkTask {
  id: string;
  title: string;
  status: TaskStatus;
  /** The drawing's estimate. The week line counts what is left of it, which is not the same number. */
  hours: number;
  remainingHours: number;
  dueDate: string | null;
  lateDays: number;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  projectPriority: number | null;
  packageCode: PackageCode;
  /** Its place in the drawing register, which is the order the package is produced in. */
  sortOrder: number;
  /** The day the person will actually start it, from the engine. Null when it has no dates. */
  start: IsoDate | null;
  /** Why it has no dates, in the engine's words — or ours, when its project is not in Development. */
  blockedReason: string | null;
}

export type MyWorkGroupKind = 'day' | 'blocked' | 'done';

export interface MyWorkGroup {
  key: string;
  kind: MyWorkGroupKind;
  /** `Today`, `Tomorrow`, `Thu 19 Nov`, `Not scheduled`, `Finished`. */
  label: string;
  note: string | null;
  tasks: readonly MyWorkTask[];
}

export interface WeekLoad {
  bookedHours: number;
  capacityHours: number;
  workingDays: number;
  /** 0–100, for the bar's width. A full bar is the most it can say. */
  filledPercent: number;
  overHours: number;
  /** "28 of 36 hours booked". */
  label: string;
}

export interface MyWork {
  groups: readonly MyWorkGroup[];
  taskCount: number;
  week: WeekLoad;
}

export interface MyWorkInput {
  personId: string;
  today: IsoDate;
  projects: readonly ProjectForSchedule[];
  packages: readonly PackageForSchedule[];
  tasks: readonly TaskForSchedule[];
  forecasts: ReadonlyMap<string, TaskForecast>;
  /** The studio's one definition of a person's hours on a date. Phase 3 hands in leave the same way. */
  capacity: CapacityFn;
}

/** Hours as the studio writes them: `6`, `4.5`, never `4.50`. */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/** A day heading. The two days a person can plan for get their own words; the rest get a date. */
export function dayLabel(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';

  const [year, month, day] = date.split('-');
  const weekday = WEEKDAY_NAMES[isoWeekday(date) - 1];
  const name = MONTH_NAMES[Number(month) - 1];
  // The year only when it is not this one — "Thu 19 Nov" is ambiguous fourteen months out.
  return `${weekday} ${Number(day)} ${name}${year === today.slice(0, 4) ? '' : ` ${year}`}`;
}

/**
 * The person's tasks, grouped by the day the engine forecasts they will start them — not by due
 * date. The due date is a promise to the client; the forecast start is when Bushra will have the
 * drawing open in front of her, which is what a day heading on this screen has to mean.
 */
export function buildMyWork(input: MyWorkInput): MyWork {
  const {capacity, forecasts, personId, today} = input;
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const packageById = new Map(input.packages.map((pkg) => [pkg.id, pkg]));

  const mine = input.tasks
    .filter((task) => task.assignee_id === personId)
    .flatMap((task) => {
      const project = projectById.get(task.project_id);
      const pkg = packageById.get(task.package_id);
      // Everyone reads every project and package, so a miss here means the register moved under us
      // mid-request. Leaving the task out beats drawing a card with no project on it.
      if (!project || !pkg) return [];
      return [describe(task, project, pkg, forecasts.get(task.id))];
    })
    .sort(byStudioOrder);

  const byDay = new Map<string, MyWorkTask[]>();
  const blocked: MyWorkTask[] = [];
  const done: MyWorkTask[] = [];

  for (const task of mine) {
    if (task.start) {
      const day = byDay.get(task.start) ?? [];
      day.push(task);
      byDay.set(task.start, day);
    } else if (isTaskDone(task.status)) {
      // Issued work carries no hours, so the engine never places it. It is not missing, it is over.
      done.push(task);
    } else {
      blocked.push(task);
    }
  }

  const groups: MyWorkGroup[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, tasks]): MyWorkGroup => ({key: day, kind: 'day', label: dayLabel(day, today), note: null, tasks}));

  // A drawing nobody can schedule is still the person's work, so it gets a heading of its own rather
  // than disappearing off the bottom of the list.
  if (blocked.length > 0) {
    groups.push({key: 'blocked', kind: 'blocked', label: 'Not scheduled', note: BLOCKED_NOTE, tasks: blocked});
  }
  if (done.length > 0) {
    groups.push({key: 'done', kind: 'done', label: 'Finished', note: null, tasks: done});
  }

  return {groups, taskCount: mine.length, week: weekLoad(mine, personId, today, capacity)};
}

/** The engine's queue order: project priority, then package production order, then the task's own. */
export function byStudioOrder(a: MyWorkTask, b: MyWorkTask): number {
  const byPriority = rank(a.projectPriority) - rank(b.projectPriority);
  if (byPriority !== 0) return byPriority;

  const byPackage = PACKAGE_ORDER.indexOf(a.packageCode) - PACKAGE_ORDER.indexOf(b.packageCode);
  if (byPackage !== 0) return byPackage;

  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function rank(priority: number | null): number {
  return priority ?? Number.MAX_SAFE_INTEGER;
}

function describe(
  task: TaskForSchedule,
  project: ProjectForSchedule,
  pkg: PackageForSchedule,
  forecast: TaskForecast | undefined,
): MyWorkTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    hours: task.hours,
    remainingHours: roundHours(task.hours * REMAINING_SHARE[task.status]),
    dueDate: task.due_date,
    lateDays: forecast?.lateDays ?? 0,
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    projectPriority: project.priority,
    packageCode: pkg.code,
    sortOrder: task.sort_order,
    start: forecast?.start ?? null,
    blockedReason: forecast?.start ? null : whyNoDates(project, forecast),
  };
}

function whyNoDates(project: ProjectForSchedule, forecast: TaskForecast | undefined): string | null {
  if (forecast?.reason) return forecast.reason;
  if (project.tier !== 'development') {
    return 'The project is not in Development yet, so nothing on it has dates.';
  }
  return null;
}

/**
 * How booked the next seven days are. Capacity comes from the same function the scheduler fills days
 * with, so the line can never disagree with the forecast under it — and Phase 3's approved leave will
 * shrink this week without a line changing here.
 *
 * Booked counts what is *left* of each drawing, by status, exactly as the engine does: a drawing that
 * is already with Lilia for checking is not nine more hours of Bushra's week.
 */
function weekLoad(
  tasks: readonly MyWorkTask[],
  personId: string,
  today: IsoDate,
  capacity: CapacityFn,
): WeekLoad {
  const lastDay = addDays(today, WEEK_LENGTH - 1);

  let capacityHours = 0;
  let workingDays = 0;
  for (let day = 0; day < WEEK_LENGTH; day += 1) {
    const hours = capacity(personId, addDays(today, day));
    if (hours > 0) workingDays += 1;
    capacityHours = roundHours(capacityHours + hours);
  }

  const bookedHours = roundHours(
    tasks
      .filter((task) => task.start !== null && task.start >= today && task.start <= lastDay)
      .reduce((sum, task) => sum + task.remainingHours, 0),
  );

  // An over-booked week is information, not an error: if Bushra is carrying 44 hours of work into a
  // 36-hour week, that is the number Athiq needs to see. Nothing here clamps it or calls it invalid —
  // only the bar stops at full, because a bar cannot draw more than itself.
  return {
    bookedHours,
    capacityHours,
    workingDays,
    filledPercent: percentFilled(bookedHours, capacityHours),
    overHours: roundHours(Math.max(0, bookedHours - capacityHours)),
    label: `${formatHours(bookedHours)} of ${formatHours(capacityHours)} hours booked`,
  };
}

function percentFilled(booked: number, available: number): number {
  if (available <= 0) return booked > 0 ? 100 : 0;
  return Math.min(100, Math.round((booked / available) * 100));
}

/** Hours are half-hour steps and capacities are fractions, so keep floating point from drifting. */
function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}
