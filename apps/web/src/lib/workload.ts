import {
  addDays,
  type CapacityFn,
  type IsoDate,
  REMAINING_SHARE,
  startOfWeek,
  type TaskForecast,
} from '@studesk/engine';
import type {PersonForSchedule, TaskForSchedule} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';

/**
 * How booked each person is, week by week, for the next month.
 *
 * This is the number Athiq cannot get from anywhere else: the Timeline shows him *what* everyone is
 * doing, and this shows him *who has room*. Before it existed, "is Nashwa free in November" was a
 * question you asked Nashwa.
 *
 * It buckets dates the engine already produced and never works one out itself — a task's remaining
 * hours land in the week containing its forecast start, which is the same rule `my-work.ts` applies to
 * the seven-day window. Golden rule 1 holds: no date is computed here.
 */

/** Four weeks is as far as a studio of seven plans by eye. Beyond that the Timeline is the better tool. */
export const WEEKS_SHOWN = 4;

/** Column headings, in the studio's own shorthand. */
export const WEEK_LABELS = ['This wk', '+1', '+2', '+3'] as const;

export interface WeekWindow {
  /** Monday, except for the current week — see `weekWindows`. */
  start: IsoDate;
  /** Saturday. The studio does not work Sundays, so the window ends where the work does. */
  end: IsoDate;
  label: string;
  /** 'week of 19 Oct', for the bar's accessible name. */
  title: string;
}

export interface WeekLoad {
  bookedHours: number;
  capacityHours: number;
  /** 0–100, clamped, because a bar cannot draw more than itself. */
  filledPercent: number;
  /** No capacity at all: someone inactive, or in Phase 3 someone on approved leave. */
  off: boolean;
  /** Booked up to or past capacity. The bar turns red here. */
  full: boolean;
  /** '18 of 36 hours booked, week of 19 Oct' — a bar with no text is unreadable without sight. */
  label: string;
}

export interface WorkloadInput {
  today: IsoDate;
  people: readonly PersonForSchedule[];
  tasks: readonly TaskForSchedule[];
  forecasts: ReadonlyMap<string, TaskForecast>;
  capacity: CapacityFn;
}

/** Hours are half-hour steps and capacities are fractions, so keep floating point from drifting. */
function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * The four windows. Weeks run Monday to Saturday so a column is a studio week rather than an arbitrary
 * seven days — the same boundary the Timeline draws its gridlines on.
 *
 * The first window starts *today*, not on Monday. The engine never books the past, so counting Monday
 * and Tuesday's hours on a Wednesday would draw every bar half empty and the label would be a lie.
 */
export function weekWindows(today: IsoDate, weeks: number = WEEKS_SHOWN): readonly WeekWindow[] {
  const windows: WeekWindow[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const monday = addDays(startOfWeek(today), index * 7);
    const start = index === 0 ? today : monday;
    windows.push({
      start,
      end: addDays(monday, 5),
      label: WEEK_LABELS[index] ?? `+${index}`,
      title: `week of ${formatShortDate(monday)}`,
    });
  }
  return windows;
}

/** What is left of a drawing, by status, exactly as the engine discounts it. */
function remainingHours(task: TaskForSchedule): number {
  return roundHours(task.hours * REMAINING_SHARE[task.status]);
}

function percentFilled(booked: number, available: number): number {
  if (available <= 0) return booked > 0 ? 100 : 0;
  return Math.min(100, Math.round((booked / available) * 100));
}

/** One person, one week. */
export function weekLoad(
  person: PersonForSchedule,
  window: WeekWindow,
  tasks: readonly TaskForSchedule[],
  forecasts: ReadonlyMap<string, TaskForecast>,
  capacity: CapacityFn,
): WeekLoad {
  let capacityHours = 0;
  for (let day = window.start; day <= window.end; day = addDays(day, 1)) {
    capacityHours = roundHours(capacityHours + capacity(person.id, day));
  }

  const bookedHours = roundHours(
    tasks
      .filter((task) => {
        if (task.assignee_id !== person.id) return false;
        // A blocked drawing has no start, so it belongs to no week. It is not quietly dropped: the
        // clash list and the Timeline's blocked panel both name it.
        const start = forecasts.get(task.id)?.start;
        return start != null && start >= window.start && start <= window.end;
      })
      .reduce((sum, task) => sum + remainingHours(task), 0),
  );

  const off = capacityHours <= 0;
  return {
    bookedHours,
    capacityHours,
    filledPercent: percentFilled(bookedHours, capacityHours),
    off,
    full: !off && bookedHours >= capacityHours,
    // An over-booked week is information, not an error. If Bushra is carrying 44 hours into a 36-hour
    // week, that is exactly the number Athiq needs; nothing here clamps it but the bar.
    label: off
      ? `Not on production, ${window.title}`
      : `${formatHours(bookedHours)} of ${formatHours(capacityHours)} hours booked, ${window.title}`,
  };
}

/** Every person's four weeks, keyed by person id, in the order `weekWindows` returns them. */
export function personWeekLoads(input: WorkloadInput): ReadonlyMap<string, readonly WeekLoad[]> {
  const windows = weekWindows(input.today);
  return new Map(
    input.people.map((person) => [
      person.id,
      windows.map((window) => weekLoad(person, window, input.tasks, input.forecasts, input.capacity)),
    ]),
  );
}

/** Whether anything at all is booked for this person in the window. Drives the "No work booked" line. */
export function hasWork(loads: readonly WeekLoad[]): boolean {
  return loads.some((load) => load.bookedHours > 0);
}
