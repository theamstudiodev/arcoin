import type {CapacityFn, IsoDate, Person, Project, ScheduleInput, Settings, Task} from '../src/types';

/** Monday. Every fixture starts here so the arithmetic in the tests is readable. */
export const MONDAY: IsoDate = '2026-01-05';

export const SETTINGS: Settings = {
  workdays: [1, 2, 3, 4, 5, 6], // Monday–Saturday
  hoursPerDay: 6,
  slotLimit: 5,
  perLeadSlots: 2,
  devLimit: 15,
  readyLimit: 10,
};

export const ARCHITECT: Person = {id: 'p-arch', role: 'lead', capacity: 1, active: true};
/** Athiq runs the studio, so half a day of production. */
export const ATHIQ: Person = {id: 'p-athiq', role: 'director', capacity: 0.5, active: true};

/** ISO weekday, Monday = 1 … Sunday = 7, computed in UTC so no timezone can shift it. */
function weekday(date: IsoDate): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Phase 1's capacity: a working day gives hoursPerDay × capacity, anything else nothing.
 * The engine never learns *why* a day is empty — that is the point of the injection.
 */
export function capacityFor(people: readonly Person[], holidays: readonly IsoDate[] = []): CapacityFn {
  return (personId, date) => {
    const person = people.find((p) => p.id === personId);
    if (!person || !person.active) return 0;
    if (!SETTINGS.workdays.includes(weekday(date))) return 0;
    if (holidays.includes(date)) return 0;
    return SETTINGS.hoursPerDay * person.capacity;
  };
}

export function devProject(id: string, priority: number | null, leadId: string | null = ARCHITECT.id): Project {
  return {id, tier: 'development', priority, leadId};
}

export function task(overrides: Partial<Task> & Pick<Task, 'id' | 'projectId'>): Task {
  return {
    packageCode: 'P01',
    assigneeId: ARCHITECT.id,
    hours: 6,
    status: 'todo',
    dueDate: null,
    startAfter: null,
    sortOrder: 0,
    ...overrides,
  };
}

export function input(overrides: Partial<ScheduleInput> = {}): ScheduleInput {
  const people = overrides.people ?? [ARCHITECT];
  return {
    today: MONDAY,
    settings: SETTINGS,
    people,
    projects: [],
    tasks: [],
    capacity: capacityFor(people),
    ...overrides,
  };
}
