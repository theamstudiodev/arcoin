/**
 * The scheduler's contract. Mirrors the database vocabulary exactly
 * (supabase/migrations/20261017000100_foundation.sql).
 */

/** A calendar date, always `YYYY-MM-DD`. Never a `Date` object in the domain layer. */
export type IsoDate = string & { readonly __brand?: 'IsoDate' };

export type ProjectTier = 'development' | 'ready_to_release' | 'response_awaited' | 'dormant';
export type TaskStatus = 'todo' | 'in_progress' | 'for_check' | 'checked' | 'issued';
export type PackageCode = 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'CS' | 'SV' | 'TD' | 'ADD';
export type PersonRole = 'principal' | 'director' | 'lead' | 'junior' | 'technical';

/** Production order of packages — the tie-break after project priority. */
export const PACKAGE_ORDER: readonly PackageCode[] = ['P01', 'P02', 'P03', 'P04', 'P05', 'CS', 'SV', 'TD', 'ADD'];

/** Share of a task's hours still to do, by status. */
export const REMAINING_SHARE: Readonly<Record<TaskStatus, number>> = {
  todo: 1,
  in_progress: 0.5,
  for_check: 0.2,
  checked: 0.1,
  issued: 0,
};

export interface Person {
  id: string;
  role: PersonRole;
  /** Fraction of a working day available for production, 0 < capacity ≤ 1. */
  capacity: number;
  active: boolean;
}

export interface Project {
  id: string;
  tier: ProjectTier;
  /** 1 = most urgent. `null` = unranked, scheduled after every ranked project. */
  priority: number | null;
  leadId: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  packageCode: PackageCode;
  assigneeId: string | null;
  hours: number;
  status: TaskStatus;
  dueDate: IsoDate | null;
  /** Do not schedule before this date. */
  startAfter: IsoDate | null;
  sortOrder: number;
}

export interface Settings {
  /** ISO weekdays, Mon = 1 … Sun = 7. */
  workdays: readonly number[];
  hoursPerDay: number;
  slotLimit: number;
  perLeadSlots: number;
  devLimit: number;
  readyLimit: number;
}

/**
 * Hours a person can give to production on a date. Phase 1: working day × hoursPerDay × capacity,
 * minus holidays. Phase 3 swaps in the capacity calendar so approved leave reduces it.
 * The engine never knows *why* a day has fewer hours.
 */
export type CapacityFn = (personId: string, date: IsoDate) => number;

export interface ScheduleInput {
  today: IsoDate;
  projects: readonly Project[];
  people: readonly Person[];
  tasks: readonly Task[];
  settings: Settings;
  capacity: CapacityFn;
}

export interface TaskForecast {
  taskId: string;
  start: IsoDate | null;
  end: IsoDate | null;
  /** Calendar days past the due date; 0 when on time or undated. */
  lateDays: number;
  /** Set when the task cannot be scheduled, e.g. 'No assignee', 'No hours estimated'. */
  reason: string | null;
}

export type ClashKind = 'slot_limit' | 'lead_slot_limit' | 'dev_limit' | 'ready_limit' | 'late' | 'unschedulable';

export interface Clash {
  kind: ClashKind;
  severity: 'block' | 'warn' | 'info';
  message: string;
  projectId?: string;
  taskIds?: readonly string[];
}

export interface ScheduleResult {
  forecasts: readonly TaskForecast[];
  clashes: readonly Clash[];
}
