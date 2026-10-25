import {REMAINING_SHARE, type TaskForecast} from '@studesk/engine';
import type {Tables} from '@/lib/database.types';
import {formatShortDate} from '@/lib/format';

/** A drawing or an additional task, as the register reads it. */
export type TaskRow = Pick<
  Tables<'tasks'>,
  'id' | 'package_id' | 'title' | 'assignee_id' | 'hours' | 'due_date' | 'start_after' | 'status' | 'sort_order'
>;

/**
 * One line of the register: the task, and what the engine forecast for it. `forecast` is null for
 * issued work, which the scheduler leaves out because it takes no time, and for every task on a
 * project that is not in Development — those are not scheduled at all.
 */
export interface RegisterRow {
  task: TaskRow;
  forecast: TaskForecast | null;
}

/** Someone a task can be given to. Inactive people stay on the list: the engine refuses to place work on them. */
export interface AssigneeChoice {
  id: string;
  name: string;
  active: boolean;
}

/** The order the drawings are issued in. `sort_order` is the studio's own; ties fall back to the title. */
export function byTaskOrder(a: TaskRow, b: TaskRow): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.title.localeCompare(b.title);
}

/**
 * Hours still to do, discounted by status exactly as the scheduler discounts them: a drawing that is
 * for check is a fifth of the work of one not started. The share comes from the engine rather than a
 * copy of the table in CLAUDE.md, so "Hours remaining" and the forecast dates beside it can never
 * tell Athiq two different stories.
 */
export function remainingHours(tasks: readonly TaskRow[]): number {
  return round(tasks.reduce((sum, task) => sum + task.hours * REMAINING_SHARE[task.status], 0));
}

/** What the package was estimated at, issued or not — its size, which is what the stat line reports. */
export function plannedHours(tasks: readonly TaskRow[]): number {
  return round(tasks.reduce((sum, task) => sum + task.hours, 0));
}

/** `12` and `1.5`, never `12.0`: hours go in half-hour steps, and a trailing zero is noise in a dense table. */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * `24 Nov` — the short date without its year. The forecast sits beside the due date on a 36px row and
 * is read against it; both carry the same year, and the Due field spells it out anyway.
 */
export function formatRegisterDate(date: string): string {
  return formatShortDate(date).replace(/ \d{4}$/, '');
}

/** `18 Nov → 24 Nov`, or null when the engine could not place the task. */
export function forecastRange(forecast: TaskForecast | null): string | null {
  if (!forecast?.start || !forecast.end) return null;
  return `${formatRegisterDate(forecast.start)} → ${formatRegisterDate(forecast.end)}`;
}

/** How late the engine says a task will be, in the register's shorthand. */
export function lateLabel(lateDays: number): string {
  return `${lateDays}d late`;
}

/**
 * The engine's reason, cut to its first clause: "No assignee", not "No assignee — the task cannot be
 * placed on anyone's calendar". The register has one line to say it in; the clash list says it in full.
 */
export function blockedLabel(reason: string): string {
  return reason.split(' — ')[0] ?? reason;
}

/** The last day the engine has any of these tasks running — the project's or package's forecast finish. */
export function finishesOn(rows: readonly RegisterRow[]): string | null {
  return rows.reduce<string | null>((latest, {forecast}) => {
    const end = forecast?.end ?? null;
    if (!end) return latest;
    return latest === null || end > latest ? end : latest;
  }, null);
}

/** How many of these tasks the engine forecasts past their due date. */
export function lateCount(rows: readonly RegisterRow[]): number {
  return rows.filter(({forecast}) => (forecast?.lateDays ?? 0) > 0).length;
}

/** Hours are half-hour steps against capacities of 0.25 and 0.5, so keep floating point from drifting. */
function round(hours: number): number {
  return Math.round(hours * 100) / 100;
}
