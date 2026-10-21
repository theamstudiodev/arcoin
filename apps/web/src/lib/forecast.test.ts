import type {IsoDate} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {
  capacityFrom,
  type PersonForSchedule,
  type SettingsForSchedule,
  type StudioRows,
  studioToday,
  toScheduleInput,
} from '@/lib/forecast';

const SETTINGS: SettingsForSchedule = {
  workdays: [1, 2, 3, 4, 5, 6], // Monday–Saturday
  hours_per_day: 6,
  slot_limit: 5,
  per_lead_slots: 2,
  dev_limit: 15,
  ready_limit: 10,
};

const LILIA: PersonForSchedule = {
  id: 'p-lilia',
  name: 'Ar. Lilia',
  role: 'lead',
  capacity: 1,
  active: true,
  sort_order: 3,
};
const ATHIQ: PersonForSchedule = {
  id: 'p-athiq',
  name: 'Ar. Athiq',
  role: 'director',
  capacity: 0.5,
  active: true,
  sort_order: 2,
};

describe('studioToday', () => {
  it('reckons the date in Mangalore, not UTC', () => {
    // 19:00 UTC is already half past midnight the next day in the studio. Using toISOString() here
    // would schedule from yesterday every night between 18:30 and midnight UTC.
    const lateEvening = new Date('2026-03-15T19:00:00Z');
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-03-15');
    expect(studioToday(lateEvening)).toBe('2026-03-16');
  });

  it('agrees with UTC during the studio working day', () => {
    expect(studioToday(new Date('2026-03-15T06:00:00Z'))).toBe('2026-03-15');
  });

  it('gives a YYYY-MM-DD string, which is what the domain layer uses', () => {
    expect(studioToday(new Date('2026-01-05T04:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('capacityFrom', () => {
  const capacity = capacityFrom([LILIA, ATHIQ], SETTINGS, ['2026-01-07' as IsoDate]);

  it('gives a full day to someone on production full time', () => {
    expect(capacity('p-lilia', '2026-01-05' as IsoDate)).toBe(6); // Monday
  });

  it('scales a part-time person — Athiq at half gets three hours', () => {
    expect(capacity('p-athiq', '2026-01-05' as IsoDate)).toBe(3);
  });

  it('gives nothing on a day the studio does not work', () => {
    expect(capacity('p-lilia', '2026-01-10' as IsoDate)).toBe(6); // Saturday IS a working day here
    expect(capacity('p-lilia', '2026-01-11' as IsoDate)).toBe(0); // Sunday
  });

  it('gives nothing on a holiday', () => {
    expect(capacity('p-lilia', '2026-01-07' as IsoDate)).toBe(0);
  });

  it('gives nothing to someone who has left', () => {
    const withFormer = capacityFrom([{...LILIA, active: false}], SETTINGS, []);
    expect(withFormer('p-lilia', '2026-01-05' as IsoDate)).toBe(0);
  });

  it('gives nothing for someone not on the team at all', () => {
    expect(capacity('p-stranger', '2026-01-05' as IsoDate)).toBe(0);
  });

  it('follows the studio’s own working week', () => {
    // A studio that closes on Saturday.
    const mondayToFriday = capacityFrom([LILIA], {...SETTINGS, workdays: [1, 2, 3, 4, 5]}, []);
    expect(mondayToFriday('p-lilia', '2026-01-10' as IsoDate)).toBe(0);
  });
});

const ROWS: StudioRows = {
  projects: [
    {
      id: 'proj-kadri',
      code: 'AMS-26-014',
      name: 'Kadri Residence',
      tier: 'development',
      priority: 2,
      lead_id: 'p-lilia',
      target_date: '2026-12-24',
    },
  ],
  people: [LILIA, ATHIQ],
  tasks: [
    {
      id: 'task-plan',
      project_id: 'proj-kadri',
      package_id: 'pkg-p04',
      title: 'Ground floor working plan',
      assignee_id: 'p-lilia',
      hours: 12,
      status: 'todo',
      due_date: '2026-11-06',
      start_after: null,
      sort_order: 1,
    },
    {
      id: 'task-orphan',
      project_id: 'proj-kadri',
      package_id: 'pkg-not-loaded',
      title: 'A task whose package we did not read',
      assignee_id: 'p-lilia',
      hours: 4,
      status: 'todo',
      due_date: null,
      start_after: null,
      sort_order: 2,
    },
  ],
  packages: [{id: 'pkg-p04', project_id: 'proj-kadri', code: 'P04'}],
  settings: SETTINGS,
  holidays: [],
};

describe('toScheduleInput', () => {
  const input = toScheduleInput(ROWS, '2026-01-05' as IsoDate);

  it('renames the database’s columns to the engine’s names', () => {
    expect(input.projects[0]).toEqual({
      id: 'proj-kadri',
      tier: 'development',
      priority: 2,
      leadId: 'p-lilia',
    });
    expect(input.tasks[0]).toMatchObject({
      id: 'task-plan',
      projectId: 'proj-kadri',
      assigneeId: 'p-lilia',
      startAfter: null,
      sortOrder: 1,
      dueDate: '2026-11-06',
    });
  });

  it('looks a task’s package code up, because the engine orders work P01 to ADD', () => {
    expect(input.tasks[0]?.packageCode).toBe('P04');
  });

  it('leaves out a task whose package was not loaded rather than guessing its order', () => {
    expect(input.tasks.map((task) => task.id)).toEqual(['task-plan']);
  });

  it('passes the studio limits the engine needs, and not the one it does not', () => {
    expect(input.settings).toEqual({
      workdays: [1, 2, 3, 4, 5, 6],
      hoursPerDay: 6,
      slotLimit: 5,
      perLeadSlots: 2,
      devLimit: 15,
      readyLimit: 10,
    });
    // dormant_days is a portfolio rule, not a scheduling one, so the engine never sees it.
    expect(input.settings).not.toHaveProperty('dormantDays');
  });

  it('carries today through, so the engine never reads a clock', () => {
    expect(input.today).toBe('2026-01-05');
  });

  it('hands over a working capacity function', () => {
    expect(input.capacity('p-athiq', '2026-01-05' as IsoDate)).toBe(3);
  });
});
