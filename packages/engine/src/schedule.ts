import {addDays, daysBetween, maxDate} from './dates';
import {PACKAGE_ORDER, REMAINING_SHARE} from './types';
import type {
  Clash,
  IsoDate,
  Person,
  Project,
  ScheduleInput,
  ScheduleResult,
  Task,
  TaskForecast,
} from './types';

/**
 * Places every open task of a Development project on its assignee's calendar, highest-priority
 * project first, and reports clashes. See CLAUDE.md → "The scheduler engine".
 *
 * Pure: the only clock is `input.today`, and the only source of available hours is
 * `input.capacity`. The engine never learns why a day is empty — a Sunday, a holiday and
 * approved leave all arrive as zero. That is what lets Phase 3 add the capacity calendar
 * without touching this file.
 */
export function schedule(input: ScheduleInput): ScheduleResult {
  const {today, projects, people, tasks, settings, capacity} = input;

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));

  // Only Development is scheduled, and only work that still has hours in it. `issued` is
  // finished, so it takes no time and is not placed at all.
  const open = tasks.filter((t) => {
    const project = projectById.get(t.projectId);
    return project?.tier === 'development' && REMAINING_SHARE[t.status] > 0;
  });

  const queue = [...open].sort((a, b) => compareTasks(a, b, projectById));

  // Where each person's day currently stands: the date being filled, and hours already spent on it.
  const cursors = new Map<string, {date: IsoDate; used: number}>();
  const forecasts: TaskForecast[] = [];
  const unschedulable: string[] = [];
  const lateClashes: Clash[] = [];

  for (const task of queue) {
    const blocked = whyBlocked(task, personById);
    if (blocked) {
      forecasts.push({taskId: task.id, start: null, end: null, lateDays: 0, reason: blocked});
      unschedulable.push(task.id);
      continue;
    }

    const placed = place(task, cursors, capacity, today);
    if (!placed.ok) {
      forecasts.push({taskId: task.id, start: null, end: null, lateDays: 0, reason: placed.reason});
      unschedulable.push(task.id);
      continue;
    }

    const lateDays = task.dueDate && placed.end > task.dueDate ? daysBetween(task.dueDate, placed.end) : 0;
    forecasts.push({taskId: task.id, start: placed.start, end: placed.end, lateDays, reason: null});

    if (lateDays > 0) {
      lateClashes.push({
        kind: 'late',
        severity: 'warn',
        message: `Forecast to finish ${placed.end}, ${lateDays} day${lateDays === 1 ? '' : 's'} after its ${task.dueDate} due date. Move it up the priority list or reduce its hours.`,
        projectId: task.projectId,
        taskIds: [task.id],
      });
    }
  }

  return {
    forecasts,
    clashes: [...limitClashes(open, projects, projectById, settings), ...lateClashes, ...unschedulableClash(unschedulable)],
  };
}

/** Project priority, then package production order, then the task's own order. */
function compareTasks(a: Task, b: Task, projectById: Map<string, Project>): number {
  const byPriority = rank(projectById.get(a.projectId)) - rank(projectById.get(b.projectId));
  if (byPriority !== 0) return byPriority;

  const byPackage = PACKAGE_ORDER.indexOf(a.packageCode) - PACKAGE_ORDER.indexOf(b.packageCode);
  if (byPackage !== 0) return byPackage;

  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // total order, so the result is reproducible
}

/** 1 is most urgent. An unranked project waits behind every ranked one. */
function rank(project: Project | undefined): number {
  return project?.priority ?? Number.MAX_SAFE_INTEGER;
}

function whyBlocked(task: Task, personById: Map<string, Person>): string | null {
  if (!task.assigneeId) return 'No assignee — the task cannot be placed on anyone\'s calendar';
  if (task.hours <= 0) return 'No hours estimated — the task has no duration to schedule';

  const person = personById.get(task.assigneeId);
  if (!person) return 'Assignee is not on the team';
  if (!person.active) return 'Assignee is no longer active';
  return null;
}

/** A person with no capacity at all would otherwise be walked forever. Three years is well past any forecast. */
const MAX_DAYS_AHEAD = 365 * 3;

function place(
  task: Task,
  cursors: Map<string, {date: IsoDate; used: number}>,
  capacity: ScheduleInput['capacity'],
  today: IsoDate,
): {ok: true; start: IsoDate; end: IsoDate} | {ok: false; reason: string} {
  const personId = task.assigneeId as string;
  const cursor = cursors.get(personId) ?? {date: today, used: 0};

  // Never before today, and never before the task says it may begin.
  let date = maxDate(cursor.date, today);
  if (task.startAfter) date = maxDate(date, task.startAfter);
  let used = date === cursor.date ? cursor.used : 0;

  let remaining = round(task.hours * REMAINING_SHARE[task.status]);
  let start: IsoDate | null = null;
  let end: IsoDate = date;

  for (let walked = 0; remaining > 0; walked++) {
    if (walked > MAX_DAYS_AHEAD) {
      return {ok: false, reason: 'No working hours available for the assignee'};
    }

    const free = round(capacity(personId, date) - used);
    if (free <= 0) {
      date = addDays(date, 1);
      used = 0;
      continue;
    }

    const worked = Math.min(free, remaining);
    start ??= date;
    end = date;
    remaining = round(remaining - worked);
    used = round(used + worked);

    if (remaining > 0) {
      date = addDays(date, 1);
      used = 0;
    }
  }

  // Leave the day open: the next task picks up the hours left in it rather than starting tomorrow.
  cursors.set(personId, {date, used});
  return {ok: true, start: start as IsoDate, end};
}

/**
 * The studio limits. A package counts as "in production" when it has at least one task with
 * hours left on a Development project — that is the work actually occupying a slot.
 */
function limitClashes(
  open: readonly Task[],
  projects: readonly Project[],
  projectById: Map<string, Project>,
  settings: ScheduleInput['settings'],
): Clash[] {
  const clashes: Clash[] = [];

  const inProduction = new Set(open.map((t) => `${t.projectId}/${t.packageCode}`));
  if (inProduction.size > settings.slotLimit) {
    clashes.push({
      kind: 'slot_limit',
      severity: 'block',
      message: `${inProduction.size} packages are in production studio-wide; the limit is ${settings.slotLimit}. Finish or pause one before starting another.`,
    });
  }

  // Per Project Architect, counted by the lead of the package's project.
  const perLead = new Map<string, Set<string>>();
  for (const key of inProduction) {
    const projectId = key.slice(0, key.lastIndexOf('/'));
    const leadId = projectById.get(projectId)?.leadId;
    if (!leadId) continue;
    const packages = perLead.get(leadId) ?? new Set<string>();
    packages.add(key);
    perLead.set(leadId, packages);
  }
  for (const [leadId, packages] of [...perLead.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (packages.size > settings.perLeadSlots) {
      clashes.push({
        kind: 'lead_slot_limit',
        severity: 'block',
        message: `This Project Architect has ${packages.size} packages in production; the limit is ${settings.perLeadSlots}. Hand one over or finish it first.`,
        taskIds: open.filter((t) => packages.has(`${t.projectId}/${t.packageCode}`)).map((t) => t.id),
        projectId: leadId,
      });
    }
  }

  const byTier = (tier: Project['tier']) => projects.filter((p) => p.tier === tier).length;

  const development = byTier('development');
  if (development > settings.devLimit) {
    clashes.push({
      kind: 'dev_limit',
      severity: 'warn',
      message: `${development} projects are in Development; the limit is ${settings.devLimit}. Move one back to Ready to Release.`,
    });
  }

  const ready = byTier('ready_to_release');
  if (ready > settings.readyLimit) {
    clashes.push({
      kind: 'ready_limit',
      severity: 'warn',
      message: `${ready} projects are Ready to Release; the limit is ${settings.readyLimit}. Start one or let it go dormant.`,
    });
  }

  return clashes;
}

function unschedulableClash(taskIds: readonly string[]): Clash[] {
  if (taskIds.length === 0) return [];
  return [
    {
      kind: 'unschedulable',
      severity: 'block',
      message: `${taskIds.length} task${taskIds.length === 1 ? '' : 's'} cannot be scheduled. Give each one an assignee and an hours estimate.`,
      taskIds,
    },
  ];
}

/** Hours are half-hour steps and capacities are fractions, so keep floating point from drifting. */
function round(hours: number): number {
  return Math.round(hours * 100) / 100;
}
