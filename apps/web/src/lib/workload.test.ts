import type {IsoDate, TaskForecast} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {capacityFrom, type PersonForSchedule, type TaskForSchedule} from '@/lib/forecast';
import {hasWork, personWeekLoads, WEEK_LABELS, weekWindows} from '@/lib/workload';

// Monday 19 October 2026, the same anchor timeline.test.ts uses, so a week here and a column there line up.
const MONDAY = '2026-10-19' as IsoDate;
const WEDNESDAY = '2026-10-21' as IsoDate;

const SETTINGS = {workdays: [1, 2, 3, 4, 5, 6], hours_per_day: 6};

function person(id: string, capacity: number, active = true): PersonForSchedule {
  return {id, name: `Ar. ${id}`, role: 'junior', capacity, active, sort_order: 1};
}

function task(id: string, assignee: string | null, hours: number): TaskForSchedule {
  return {
    id,
    project_id: 'p1',
    package_id: 'k1',
    title: id,
    assignee_id: assignee,
    hours,
    status: 'todo',
    due_date: null,
    start_after: null,
    sort_order: 1,
    done_at: null,
  };
}

function forecast(start: IsoDate): TaskForecast {
  return {start, end: start, lateDays: 0, reason: null} as TaskForecast;
}

describe('weekWindows', () => {
  it('runs Monday to Saturday, because the studio does not work Sundays', () => {
    const [first] = weekWindows(MONDAY);
    expect(first.start).toBe('2026-10-19');
    expect(first.end).toBe('2026-10-24');
  });

  it('starts the current week today, not on Monday', () => {
    // The engine never books the past. Counting Monday and Tuesday on a Wednesday would draw every bar
    // half empty and the label underneath it would be wrong.
    const [first, second] = weekWindows(WEDNESDAY);
    expect(first.start).toBe('2026-10-21');
    expect(first.end).toBe('2026-10-24');
    expect(second.start).toBe('2026-10-26');
  });

  it('gives four windows with the studio\'s own labels', () => {
    const windows = weekWindows(MONDAY);
    expect(windows).toHaveLength(4);
    expect(windows.map((window) => window.label)).toEqual([...WEEK_LABELS]);
    expect(windows[0].title).toBe('week of 19 Oct 2026');
  });
});

describe('personWeekLoads', () => {
  const bushra = person('bushra', 1);
  const asif = person('asif', 0.25);
  const capacity = capacityFrom([bushra, asif], SETTINGS, []);

  it('counts a drawing in the week its forecast starts', () => {
    const tasks = [task('t1', 'bushra', 12), task('t2', 'bushra', 8)];
    const forecasts = new Map([
      ['t1', forecast('2026-10-20' as IsoDate)],
      ['t2', forecast('2026-10-27' as IsoDate)],
    ]);

    const loads = personWeekLoads({today: MONDAY, people: [bushra], tasks, forecasts, capacity});
    const weeks = loads.get('bushra')!;
    expect(weeks[0].bookedHours).toBe(12);
    expect(weeks[1].bookedHours).toBe(8);
    expect(weeks[2].bookedHours).toBe(0);
  });

  it('measures each person against their own capacity', () => {
    // Six working days at six hours is a full week for Bushra and a quarter of that for Asif.
    const loads = personWeekLoads({today: MONDAY, people: [bushra, asif], tasks: [], forecasts: new Map(), capacity});
    expect(loads.get('bushra')![0].capacityHours).toBe(36);
    expect(loads.get('asif')![0].capacityHours).toBe(9);
  });

  it('calls a week full once it reaches capacity, and reports the overflow honestly', () => {
    const tasks = [task('t1', 'bushra', 44)];
    const forecasts = new Map([['t1', forecast('2026-10-20' as IsoDate)]]);
    const weeks = personWeekLoads({today: MONDAY, people: [bushra], tasks, forecasts, capacity}).get('bushra')!;

    expect(weeks[0].full).toBe(true);
    expect(weeks[0].bookedHours).toBe(44);
    // The bar stops at full; the number does not pretend 44 hours fit in 36.
    expect(weeks[0].filledPercent).toBe(100);
    expect(weeks[0].label).toBe('44 of 36 hours booked, week of 19 Oct 2026');
  });

  it('reports no capacity as off rather than as fully booked', () => {
    const leaver = person('leaver', 1, false);
    const noCapacity = capacityFrom([leaver], SETTINGS, []);
    const weeks = personWeekLoads({
      today: MONDAY,
      people: [leaver],
      tasks: [],
      forecasts: new Map(),
      capacity: noCapacity,
    }).get('leaver')!;
    expect(weeks[0].off).toBe(true);
    expect(weeks[0].full).toBe(false);
    expect(weeks[0].label).toBe('Not on production, week of 19 Oct 2026');
  });

  it('leaves a blocked drawing out of every week', () => {
    // No assignee means no forecast start, so it belongs to nobody's week. The clash list names it instead.
    const tasks = [task('t1', null, 10)];
    const loads = personWeekLoads({today: MONDAY, people: [bushra], tasks, forecasts: new Map(), capacity});
    expect(hasWork(loads.get('bushra')!)).toBe(false);
  });
});
