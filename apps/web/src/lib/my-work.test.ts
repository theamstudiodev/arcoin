import type {CapacityFn, IsoDate, TaskForecast} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import type {PackageForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';
import {buildMyWork, dayLabel, formatHours, type MyWorkInput} from '@/lib/my-work';

// Wednesday. Mangalore works Monday to Saturday, so this week holds six working days.
const TODAY = '2026-10-21' as IsoDate;

const BUSHRA = 'p-bushra';
const NASHWA = 'p-nashwa';

const KADRI: ProjectForSchedule = {
  id: 'proj-kadri',
  code: 'AMS-26-014',
  name: 'Kadri Residence',
  tier: 'development',
  priority: 2,
  lead_id: 'p-lilia',
  target_date: '2026-12-24',
};
const MADIKERI: ProjectForSchedule = {
  id: 'proj-madikeri',
  code: 'AMS-26-002',
  name: 'Madikeri Campus Block',
  tier: 'development',
  priority: 3,
  lead_id: 'p-athiq',
  target_date: '2027-02-12',
};
const KAVOOR: ProjectForSchedule = {
  id: 'proj-kavoor',
  code: 'AMS-26-021',
  name: 'Kavoor Clinic',
  tier: 'ready_to_release',
  priority: 5,
  lead_id: 'p-lilia',
  target_date: null,
};

const PACKAGES: PackageForSchedule[] = [
  {id: 'pkg-kadri-p04', project_id: KADRI.id, code: 'P04'},
  {id: 'pkg-kadri-add', project_id: KADRI.id, code: 'ADD'},
  {id: 'pkg-madikeri-p02', project_id: MADIKERI.id, code: 'P02'},
  {id: 'pkg-kavoor-p01', project_id: KAVOOR.id, code: 'P01'},
];

function task(over: Partial<TaskForSchedule> & {id: string; package_id: string; project_id: string}): TaskForSchedule {
  return {
    title: 'A drawing',
    assignee_id: BUSHRA,
    hours: 6,
    status: 'todo',
    // Stamped by the database only once a drawing reaches checked or issued.
    done_at: null,
    due_date: null,
    start_after: null,
    sort_order: 1,
    ...over,
  };
}

function forecast(over: Partial<TaskForecast> & {taskId: string}): TaskForecast {
  return {start: null, end: null, lateDays: 0, reason: null, ...over};
}

/** Phase 1's capacity, inlined: six hours on Monday to Saturday, nothing on a Sunday. */
const FULL_TIME: CapacityFn = (_personId, date) => (isSunday(date) ? 0 : 6);

function isSunday(date: IsoDate): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
}

function build(over: Partial<MyWorkInput> = {}) {
  return buildMyWork({
    personId: BUSHRA,
    today: TODAY,
    projects: [KADRI, MADIKERI, KAVOOR],
    packages: PACKAGES,
    tasks: [],
    forecasts: new Map(),
    capacity: FULL_TIME,
    ...over,
  });
}

describe('formatHours', () => {
  it('writes a whole number plainly and a half-hour with one decimal', () => {
    expect(formatHours(6)).toBe('6');
    expect(formatHours(4.5)).toBe('4.5');
    expect(formatHours(0)).toBe('0');
  });
});

describe('dayLabel', () => {
  it('names the two days a person can plan for', () => {
    expect(dayLabel(TODAY, TODAY)).toBe('Today');
    expect(dayLabel('2026-10-22' as IsoDate, TODAY)).toBe('Tomorrow');
  });

  it('gives every other day its weekday and date', () => {
    expect(dayLabel('2026-11-19' as IsoDate, TODAY)).toBe('Thu 19 Nov');
    expect(dayLabel('2026-10-24' as IsoDate, TODAY)).toBe('Sat 24 Oct');
    expect(dayLabel('2026-11-01' as IsoDate, TODAY)).toBe('Sun 1 Nov');
  });

  it('adds the year only when the day is not in this one', () => {
    expect(dayLabel('2027-01-22' as IsoDate, TODAY)).toBe('Fri 22 Jan 2027');
  });
});

describe('buildMyWork', () => {
  it('shows the person their own drawings and nobody else’s', () => {
    const work = build({
      tasks: [
        task({id: 't-mine', project_id: KADRI.id, package_id: 'pkg-kadri-p04', title: 'Toilet details T1–T3'}),
        task({
          id: 't-nashwa',
          project_id: KADRI.id,
          package_id: 'pkg-kadri-p04',
          title: 'Section AA and BB',
          assignee_id: NASHWA,
        }),
      ],
      forecasts: new Map([['t-mine', forecast({taskId: 't-mine', start: TODAY, end: TODAY})]]),
    });

    expect(work.taskCount).toBe(1);
    expect(titles(work.groups[0])).toEqual(['Toilet details T1–T3']);
  });

  it('groups by the day the engine forecasts the work starts, not by its due date', () => {
    // Due in November, but Bushra picks it up on Friday — the heading has to say Friday.
    const work = build({
      tasks: [task({id: 't-1', project_id: KADRI.id, package_id: 'pkg-kadri-p04', due_date: '2026-11-21'})],
      forecasts: new Map([
        ['t-1', forecast({taskId: 't-1', start: '2026-10-23' as IsoDate, end: '2026-10-23' as IsoDate})],
      ]),
    });

    expect(work.groups.map((group) => group.label)).toEqual(['Fri 23 Oct']);
    expect(work.groups[0]?.key).toBe('2026-10-23');
  });

  it('heads the days Today, Tomorrow and then the weekday, in date order', () => {
    const work = build({
      tasks: [
        task({id: 't-later', project_id: KADRI.id, package_id: 'pkg-kadri-p04', sort_order: 3}),
        task({id: 't-today', project_id: KADRI.id, package_id: 'pkg-kadri-p04', sort_order: 1}),
        task({id: 't-tomorrow', project_id: KADRI.id, package_id: 'pkg-kadri-p04', sort_order: 2}),
      ],
      forecasts: new Map([
        ['t-later', forecast({taskId: 't-later', start: '2026-10-24' as IsoDate, end: '2026-10-24' as IsoDate})],
        ['t-today', forecast({taskId: 't-today', start: TODAY, end: TODAY})],
        ['t-tomorrow', forecast({taskId: 't-tomorrow', start: '2026-10-22' as IsoDate, end: '2026-10-22' as IsoDate})],
      ]),
    });

    expect(work.groups.map((group) => group.label)).toEqual(['Today', 'Tomorrow', 'Sat 24 Oct']);
    expect(work.groups.every((group) => group.kind === 'day')).toBe(true);
  });

  it('puts a day’s drawings in the order the studio produces them', () => {
    // Same day, three projects and packages: priority 2 before priority 3, P04 before ADD.
    const work = build({
      tasks: [
        task({id: 't-concept', project_id: MADIKERI.id, package_id: 'pkg-madikeri-p02', title: 'Concept plan — Block A'}),
        task({id: 't-extra', project_id: KADRI.id, package_id: 'pkg-kadri-add', title: 'Revised facade option'}),
        task({id: 't-toilet', project_id: KADRI.id, package_id: 'pkg-kadri-p04', title: 'Toilet details T1–T3'}),
      ],
      forecasts: new Map(
        ['t-concept', 't-extra', 't-toilet'].map((id) => [id, forecast({taskId: id, start: TODAY, end: TODAY})]),
      ),
    });

    expect(titles(work.groups[0])).toEqual(['Toilet details T1–T3', 'Revised facade option', 'Concept plan — Block A']);
  });

  it('carries the hours, the due date and how late the forecast runs', () => {
    const work = build({
      tasks: [
        task({
          id: 't-1',
          project_id: KADRI.id,
          package_id: 'pkg-kadri-p04',
          title: 'Toilet details T1–T3',
          hours: 9,
          status: 'in_progress',
          due_date: '2026-10-20',
        }),
      ],
      forecasts: new Map([
        ['t-1', forecast({taskId: 't-1', start: TODAY, end: TODAY, lateDays: 1})],
      ]),
    });

    expect(work.groups[0]?.tasks[0]).toMatchObject({
      hours: 9,
      // Half of it is done, which is what the week line counts and the engine schedules.
      remainingHours: 4.5,
      dueDate: '2026-10-20',
      lateDays: 1,
      projectCode: 'AMS-26-014',
      projectName: 'Kadri Residence',
      packageCode: 'P04',
      blockedReason: null,
    });
  });

  it('keeps a drawing nobody can schedule, under a heading of its own', () => {
    const work = build({
      tasks: [
        task({id: 't-dated', project_id: KADRI.id, package_id: 'pkg-kadri-p04', title: 'Toilet details T1–T3'}),
        task({
          id: 't-no-hours',
          project_id: KADRI.id,
          package_id: 'pkg-kadri-p04',
          title: 'Terrace details',
          hours: 0,
          sort_order: 9,
        }),
      ],
      forecasts: new Map([
        ['t-dated', forecast({taskId: 't-dated', start: TODAY, end: TODAY})],
        ['t-no-hours', forecast({taskId: 't-no-hours', reason: 'No hours estimated — the task has no duration to schedule'})],
      ]),
    });

    const blocked = work.groups[1];
    expect(work.taskCount).toBe(2);
    expect(blocked?.kind).toBe('blocked');
    expect(blocked?.label).toBe('Not scheduled');
    expect(blocked?.note).toContain('Still yours');
    expect(titles(blocked)).toEqual(['Terrace details']);
    expect(blocked?.tasks[0]?.blockedReason).toBe('No hours estimated — the task has no duration to schedule');
  });

  it('explains a drawing with no forecast at all — its project has not reached Development', () => {
    const work = build({
      tasks: [task({id: 't-waiting', project_id: KAVOOR.id, package_id: 'pkg-kavoor-p01', title: 'Site study'})],
    });

    expect(work.groups[0]?.kind).toBe('blocked');
    expect(work.groups[0]?.tasks[0]?.blockedReason).toBe(
      'The project is not in Development yet, so nothing on it has dates.',
    );
  });

  it('separates finished work, which the engine never places because it has no hours left', () => {
    const work = build({
      tasks: [
        task({
          id: 't-issued',
          project_id: KADRI.id,
          package_id: 'pkg-kadri-p04',
          title: 'Ground floor working plan',
          status: 'issued',
          hours: 12,
        }),
      ],
    });

    const finished = work.groups[0];
    expect(finished?.kind).toBe('done');
    expect(finished?.label).toBe('Finished');
    expect(titles(finished)).toEqual(['Ground floor working plan']);
    // Nothing of it is left, so it cannot book any of the week.
    expect(work.week.bookedHours).toBe(0);
  });

  it('counts the hours left in the week’s drawings against the days the person has', () => {
    const work = build({
      tasks: [
        task({id: 't-checked', project_id: KADRI.id, package_id: 'pkg-kadri-p04', hours: 10, status: 'checked'}),
        task({id: 't-progress', project_id: KADRI.id, package_id: 'pkg-kadri-p04', hours: 9, status: 'in_progress', sort_order: 2}),
        task({id: 't-todo', project_id: MADIKERI.id, package_id: 'pkg-madikeri-p02', hours: 14}),
        task({id: 't-next-week', project_id: MADIKERI.id, package_id: 'pkg-madikeri-p02', hours: 16, sort_order: 2}),
      ],
      forecasts: new Map([
        ['t-checked', forecast({taskId: 't-checked', start: TODAY, end: TODAY})],
        ['t-progress', forecast({taskId: 't-progress', start: TODAY, end: TODAY})],
        ['t-todo', forecast({taskId: 't-todo', start: '2026-10-22' as IsoDate, end: '2026-10-24' as IsoDate})],
        // Starts on the eighth day, so it belongs to next week however many hours it carries.
        ['t-next-week', forecast({taskId: 't-next-week', start: '2026-10-28' as IsoDate, end: '2026-10-31' as IsoDate})],
      ]),
    });

    // 1 of the checked drawing, 4.5 of the one in progress, 14 of the one not started.
    expect(work.week.bookedHours).toBe(19.5);
    expect(work.week.capacityHours).toBe(36);
    expect(work.week.workingDays).toBe(6);
    expect(work.week.label).toBe('19.5 of 36 hours booked');
    expect(work.week.filledPercent).toBe(54);
    expect(work.week.overHours).toBe(0);
  });

  it('scales the week to the person — Athiq is on production half the time', () => {
    const halfTime: CapacityFn = (_personId, date) => (isSunday(date) ? 0 : 3);
    const work = build({capacity: halfTime});

    expect(work.week.capacityHours).toBe(18);
    expect(work.week.label).toBe('0 of 18 hours booked');
  });

  it('shortens a week the studio closes part of', () => {
    // Kannada Rajyotsava, the studio shut. The capacity function is the only thing that knows.
    const withHoliday: CapacityFn = (_personId, date) =>
      isSunday(date) || date === '2026-10-23' ? 0 : 6;
    const work = build({capacity: withHoliday});

    expect(work.week.capacityHours).toBe(30);
    expect(work.week.workingDays).toBe(5);
  });

  it('reports an over-booked week as it is, and stops only the bar at full', () => {
    const work = build({
      tasks: [task({id: 't-big', project_id: KADRI.id, package_id: 'pkg-kadri-p04', hours: 44})],
      forecasts: new Map([
        ['t-big', forecast({taskId: 't-big', start: TODAY, end: '2026-11-02' as IsoDate})],
      ]),
    });

    expect(work.week.bookedHours).toBe(44);
    expect(work.week.overHours).toBe(8);
    expect(work.week.label).toBe('44 of 36 hours booked');
    expect(work.week.filledPercent).toBe(100);
  });

  it('gives someone with nothing assigned no groups at all, so the screen can say so', () => {
    const work = build({
      tasks: [task({id: 't-nashwa', project_id: KADRI.id, package_id: 'pkg-kadri-p04', assignee_id: NASHWA})],
    });

    expect(work.taskCount).toBe(0);
    expect(work.groups).toEqual([]);
    expect(work.week.label).toBe('0 of 36 hours booked');
    expect(work.week.filledPercent).toBe(0);
  });

  it('leaves out a drawing whose project or package it could not read', () => {
    const work = build({
      tasks: [task({id: 't-orphan', project_id: 'proj-gone', package_id: 'pkg-gone'})],
    });

    expect(work.taskCount).toBe(0);
  });
});

function titles(group: {tasks: readonly {title: string}[]} | undefined): string[] {
  return (group?.tasks ?? []).map((task) => task.title);
}
