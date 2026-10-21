import {type CapacityFn, type Clash, type IsoDate, schedule, type ScheduleInput, type TaskForecast} from '@studesk/engine';
import {isoWeekday} from '@studesk/engine';
import type {Tables} from '@/lib/database.types';
import {createClient} from '@/lib/supabase/server';

/**
 * The studio's view of its own schedule: every open task's forecast dates and every clash, from one
 * round of queries. The Timeline, the clash list, Today and the drawing register all read this, so it
 * exists once — three screens each building their own would be three chances to disagree.
 *
 * Phase 1 computes on read rather than storing `task_schedule`: nothing yet queries a stored forecast,
 * and a stored one can go stale and show a wrong date. `loadStudioForecast` is server-only; the pure
 * functions below run anywhere, which is what lets the browser preview a change later.
 */

/** The studio is in Mangalore. `toISOString()` would roll the date over at 05:30 IST and schedule from yesterday. */
export const STUDIO_TIME_ZONE = 'Asia/Kolkata';

/** Today, as the studio reckons it. `en-CA` formats as `YYYY-MM-DD`, which is the domain's date shape. */
export function studioToday(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {timeZone: STUDIO_TIME_ZONE}).format(now) as IsoDate;
}

export type ProjectForSchedule = Pick<
  Tables<'projects'>,
  'id' | 'code' | 'name' | 'tier' | 'priority' | 'lead_id' | 'target_date'
>;
export type PersonForSchedule = Pick<Tables<'people'>, 'id' | 'name' | 'role' | 'capacity' | 'active' | 'sort_order'>;
export type TaskForSchedule = Pick<
  Tables<'tasks'>,
  | 'id'
  | 'project_id'
  | 'package_id'
  | 'title'
  | 'assignee_id'
  | 'hours'
  | 'status'
  | 'due_date'
  | 'start_after'
  | 'sort_order'
  // Stamped by the database when a drawing reaches `checked` or `issued`, never by the client. Today's
  // "issued yesterday" card is the only thing that reads it, but it has to come from the same query.
  | 'done_at'
>;
export type PackageForSchedule = Pick<Tables<'packages'>, 'id' | 'project_id' | 'code'>;
export type SettingsForSchedule = Pick<
  Tables<'settings'>,
  'workdays' | 'hours_per_day' | 'slot_limit' | 'per_lead_slots' | 'dev_limit' | 'ready_limit'
>;

const PROJECT_COLUMNS = 'id, code, name, tier, priority, lead_id, target_date';
const PERSON_COLUMNS = 'id, name, role, capacity, active, sort_order';
const TASK_COLUMNS =
  'id, project_id, package_id, title, assignee_id, hours, status, due_date, start_after, sort_order, done_at';
const PACKAGE_COLUMNS = 'id, project_id, code';
const SETTINGS_COLUMNS = 'workdays, hours_per_day, slot_limit, per_lead_slots, dev_limit, ready_limit';

/** What the engine's defaults are when a studio has no settings row yet. Mirrors the migration. */
const SETTINGS_FALLBACK: SettingsForSchedule = {
  workdays: [1, 2, 3, 4, 5, 6],
  hours_per_day: 6,
  slot_limit: 5,
  per_lead_slots: 2,
  dev_limit: 15,
  ready_limit: 10,
};

export interface StudioRows {
  projects: readonly ProjectForSchedule[];
  people: readonly PersonForSchedule[];
  tasks: readonly TaskForSchedule[];
  packages: readonly PackageForSchedule[];
  settings: SettingsForSchedule;
  holidays: readonly IsoDate[];
}

/**
 * Phase 1's capacity: a working day gives `hours_per_day × capacity`, and anything else nothing.
 * Phase 3 swaps the capacity calendar in here so approved leave reduces it — the engine never learns
 * *why* a day is empty, which is the whole reason that swap stays cheap.
 */
export function capacityFrom(
  people: readonly Pick<PersonForSchedule, 'id' | 'capacity' | 'active'>[],
  settings: Pick<SettingsForSchedule, 'workdays' | 'hours_per_day'>,
  holidays: readonly IsoDate[],
): CapacityFn {
  const byId = new Map(people.map((person) => [person.id, person]));
  const workdays = new Set(settings.workdays);
  const closed = new Set(holidays);

  return (personId, date) => {
    const person = byId.get(personId);
    if (!person || !person.active) return 0;
    if (!workdays.has(isoWeekday(date))) return 0;
    if (closed.has(date)) return 0;
    return settings.hours_per_day * person.capacity;
  };
}

/**
 * Database rows to the engine's input. A real mapping layer, because the two shapes genuinely differ:
 * the database is snake_case and keys a task by `package_id`, while the engine is camelCase and wants
 * the package's `code` so it can order work P01 → ADD.
 */
export function toScheduleInput(rows: StudioRows, today: IsoDate): ScheduleInput {
  const codeByPackage = new Map(rows.packages.map((pkg) => [pkg.id, pkg.code]));

  return {
    today,
    projects: rows.projects.map((project) => ({
      id: project.id,
      tier: project.tier,
      priority: project.priority,
      leadId: project.lead_id,
    })),
    people: rows.people.map((person) => ({
      id: person.id,
      role: person.role,
      capacity: person.capacity,
      active: person.active,
    })),
    // A task whose package was not loaded cannot be ordered, so it is left out rather than guessed at.
    tasks: rows.tasks.flatMap((task) => {
      const packageCode = codeByPackage.get(task.package_id);
      if (!packageCode) return [];
      return [
        {
          id: task.id,
          projectId: task.project_id,
          packageCode,
          assigneeId: task.assignee_id,
          hours: task.hours,
          status: task.status,
          dueDate: task.due_date,
          startAfter: task.start_after,
          sortOrder: task.sort_order,
        },
      ];
    }),
    settings: {
      workdays: rows.settings.workdays,
      hoursPerDay: rows.settings.hours_per_day,
      slotLimit: rows.settings.slot_limit,
      perLeadSlots: rows.settings.per_lead_slots,
      devLimit: rows.settings.dev_limit,
      readyLimit: rows.settings.ready_limit,
    },
    capacity: capacityFrom(rows.people, rows.settings, rows.holidays),
  };
}

export interface StudioForecast extends StudioRows {
  today: IsoDate;
  /** Every scheduled task's forecast, by task id. A task with no forecast is not on a Development project. */
  forecasts: Map<string, TaskForecast>;
  clashes: readonly Clash[];
}

/** Reads the studio under the viewer's own row-level security, then runs the engine over it. */
export async function loadStudioForecast(today: IsoDate = studioToday()): Promise<StudioForecast> {
  const supabase = await createClient();
  const [projects, people, tasks, packages, settings, holidays] = await Promise.all([
    supabase.from('projects').select(PROJECT_COLUMNS),
    supabase.from('people').select(PERSON_COLUMNS).order('sort_order').order('name'),
    supabase.from('tasks').select(TASK_COLUMNS),
    supabase.from('packages').select(PACKAGE_COLUMNS),
    supabase.from('settings').select(SETTINGS_COLUMNS).maybeSingle(),
    supabase.from('holidays').select('day'),
  ]);

  const failed = [projects.error, people.error, tasks.error, packages.error, settings.error, holidays.error].find(
    (error) => error,
  );
  if (failed) throw new Error(`Couldn't work out the schedule: ${failed.message}`);

  const rows: StudioRows = {
    projects: projects.data ?? [],
    people: people.data ?? [],
    tasks: tasks.data ?? [],
    packages: packages.data ?? [],
    settings: settings.data ?? SETTINGS_FALLBACK,
    holidays: (holidays.data ?? []).map((holiday) => holiday.day as IsoDate),
  };

  const result = schedule(toScheduleInput(rows, today));
  return {
    ...rows,
    today,
    forecasts: new Map(result.forecasts.map((forecast) => [forecast.taskId, forecast])),
    clashes: result.clashes,
  };
}
