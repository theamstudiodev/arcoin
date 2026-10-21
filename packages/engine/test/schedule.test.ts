import {describe, expect, it} from 'vitest';
import {schedule} from '../src/schedule';
import type {Clash, ClashKind, Person, Project, Task} from '../src/types';
import {ARCHITECT, ATHIQ, capacityFor, devProject, input, task} from './fixtures';

/** January 2026: the 5th is a Monday, the 11th a Sunday. Saturday is a working day here. */

function forecast(result: {forecasts: readonly {taskId: string}[]}, taskId: string) {
  const found = result.forecasts.find((f) => f.taskId === taskId);
  if (!found) throw new Error(`no forecast for ${taskId}`);
  return found as (typeof result.forecasts)[number] & {
    start: string | null;
    end: string | null;
    lateDays: number;
    reason: string | null;
  };
}

const kinds = (clashes: readonly Clash[]): ClashKind[] => clashes.map((c) => c.kind);

describe('schedule() — placing work', () => {
  it('schedules only tasks on development projects', () => {
    const result = schedule(
      input({
        projects: [
          devProject('proj-dev', 1),
          {id: 'proj-ready', tier: 'ready_to_release', priority: 1, leadId: ARCHITECT.id},
          {id: 'proj-awaited', tier: 'response_awaited', priority: 1, leadId: ARCHITECT.id},
          {id: 'proj-dormant', tier: 'dormant', priority: 1, leadId: ARCHITECT.id},
        ],
        tasks: [
          task({id: 't-dev', projectId: 'proj-dev'}),
          task({id: 't-ready', projectId: 'proj-ready'}),
          task({id: 't-awaited', projectId: 'proj-awaited'}),
          task({id: 't-dormant', projectId: 'proj-dormant'}),
        ],
      }),
    );

    expect(result.forecasts.map((f) => f.taskId)).toEqual(['t-dev']);
  });

  it("fills a person's days back to back, 6 production hours a day", () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [task({id: 't', projectId: 'proj', hours: 18})],
      }),
    );

    // 18 hours at 6 a day = Monday, Tuesday, Wednesday.
    expect(forecast(result, 't').start).toBe('2026-01-05');
    expect(forecast(result, 't').end).toBe('2026-01-07');
  });

  it('skips non-working days (Sunday) and holidays', () => {
    const base = {
      projects: [devProject('proj', 1)],
      tasks: [task({id: 't', projectId: 'proj', hours: 42})],
    };

    // 7 working days. Mon 5 – Sat 10 is six, Sunday 11 is skipped, so it ends Monday 12.
    expect(forecast(schedule(input(base)), 't').end).toBe('2026-01-12');

    // Make Wednesday the 7th a holiday and the same work runs a day longer.
    const withHoliday = schedule(input({...base, capacity: capacityFor([ARCHITECT], ['2026-01-07'])}));
    expect(forecast(withHoliday, 't').end).toBe('2026-01-13');
  });

  it('scales a part-time person by capacity — Athiq at 0.5 gets 3 hours a day', () => {
    const result = schedule(
      input({
        people: [ATHIQ],
        capacity: capacityFor([ATHIQ]),
        projects: [devProject('proj', 1, ATHIQ.id)],
        tasks: [task({id: 't', projectId: 'proj', assigneeId: ATHIQ.id, hours: 6})],
      }),
    );

    // 6 hours at 3 a day spans two days, where the architect would have finished in one.
    expect(forecast(result, 't').start).toBe('2026-01-05');
    expect(forecast(result, 't').end).toBe('2026-01-06');
  });

  it('orders by project priority, then package order (P01…ADD), then task sort order', () => {
    const result = schedule(
      input({
        projects: [devProject('proj-a', 1), devProject('proj-b', 2)],
        tasks: [
          task({id: 't-b-first', projectId: 'proj-b', packageCode: 'P01'}),
          task({id: 't-a-second-pkg', projectId: 'proj-a', packageCode: 'P02'}),
          task({id: 't-a-later', projectId: 'proj-a', packageCode: 'P01', sortOrder: 1}),
          task({id: 't-a-first', projectId: 'proj-a', packageCode: 'P01', sortOrder: 0}),
        ],
      }),
    );

    // One 6-hour task a day, so the start dates read out the order directly.
    expect(forecast(result, 't-a-first').start).toBe('2026-01-05');
    expect(forecast(result, 't-a-later').start).toBe('2026-01-06');
    expect(forecast(result, 't-a-second-pkg').start).toBe('2026-01-07');
    expect(forecast(result, 't-b-first').start).toBe('2026-01-08');
  });

  it('puts unranked projects (priority null) after every ranked project', () => {
    const result = schedule(
      input({
        projects: [devProject('proj-unranked', null), devProject('proj-ranked', 9)],
        tasks: [
          task({id: 't-unranked', projectId: 'proj-unranked'}),
          task({id: 't-ranked', projectId: 'proj-ranked'}),
        ],
      }),
    );

    expect(forecast(result, 't-ranked').start).toBe('2026-01-05');
    expect(forecast(result, 't-unranked').start).toBe('2026-01-06');
  });

  it('discounts remaining hours by status: todo 1 · in_progress 0.5 · for_check 0.2 · checked 0.1 · issued 0', () => {
    const only = (status: Task['status']) =>
      schedule(
        input({
          projects: [devProject('proj', 1)],
          tasks: [task({id: 't', projectId: 'proj', hours: 60, status})],
        }),
      );

    expect(forecast(only('todo'), 't').end).toBe('2026-01-15'); // 60h = 10 working days
    expect(forecast(only('in_progress'), 't').end).toBe('2026-01-09'); // 30h = 5 days
    expect(forecast(only('for_check'), 't').end).toBe('2026-01-06'); // 12h = 2 days
    expect(forecast(only('checked'), 't').end).toBe('2026-01-05'); // 6h = 1 day

    // Issued work is finished: it takes no time and is not placed at all.
    expect(only('issued').forecasts).toEqual([]);
  });

  it('never starts a task before its start_after date', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [task({id: 't', projectId: 'proj', startAfter: '2026-01-12'})],
      }),
    );

    expect(forecast(result, 't').start).toBe('2026-01-12');
  });

  it('continues on the same day after a task that ends mid-day', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [
          task({id: 't-half', projectId: 'proj', hours: 3, sortOrder: 0}),
          task({id: 't-spill', projectId: 'proj', hours: 6, sortOrder: 1}),
        ],
      }),
    );

    // The first takes half of Monday; the second starts in what is left and finishes on Tuesday.
    expect(forecast(result, 't-half').end).toBe('2026-01-05');
    expect(forecast(result, 't-spill').start).toBe('2026-01-05');
    expect(forecast(result, 't-spill').end).toBe('2026-01-06');
  });

  it('returns a reason instead of dates when a task has no assignee or no hours', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [
          task({id: 't-nobody', projectId: 'proj', assigneeId: null}),
          task({id: 't-nohours', projectId: 'proj', hours: 0}),
        ],
      }),
    );

    expect(forecast(result, 't-nobody').start).toBeNull();
    expect(forecast(result, 't-nobody').reason).toMatch(/assignee/i);
    expect(forecast(result, 't-nohours').start).toBeNull();
    expect(forecast(result, 't-nohours').reason).toMatch(/hours/i);
  });

  it('is deterministic: same input, same output, no reliance on the system clock', () => {
    const build = () =>
      input({
        projects: [devProject('proj-a', 1), devProject('proj-b', 2)],
        tasks: [
          task({id: 't-1', projectId: 'proj-a', hours: 9}),
          task({id: 't-2', projectId: 'proj-b', hours: 15}),
        ],
      });

    expect(schedule(build())).toEqual(schedule(build()));
  });
});

describe('schedule() — clashes', () => {
  it('flags more than 5 packages in production studio-wide', () => {
    const packages: Task['packageCode'][] = ['P01', 'P02', 'P03', 'P04', 'P05', 'CS'];
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: packages.map((packageCode, i) => task({id: `t-${packageCode}`, projectId: 'proj', packageCode, sortOrder: i})),
      }),
    );

    expect(kinds(result.clashes)).toContain('slot_limit');

    // Five is the limit, so five is fine.
    const atLimit = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: packages.slice(0, 5).map((packageCode, i) => task({id: `t-${packageCode}`, projectId: 'proj', packageCode, sortOrder: i})),
      }),
    );
    expect(kinds(atLimit.clashes)).not.toContain('slot_limit');
  });

  it('flags a Project Architect with more than 2 packages in production', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1, ARCHITECT.id)],
        tasks: [
          task({id: 't-a', projectId: 'proj', packageCode: 'P01'}),
          task({id: 't-b', projectId: 'proj', packageCode: 'P02'}),
          task({id: 't-c', projectId: 'proj', packageCode: 'P03'}),
        ],
      }),
    );

    expect(kinds(result.clashes)).toContain('lead_slot_limit');
    // Three packages is under the studio-wide limit of five, so only the per-lead rule fires.
    expect(kinds(result.clashes)).not.toContain('slot_limit');
  });

  it('flags more than 15 projects in Development and more than 10 Ready to Release', () => {
    const dev: Project[] = Array.from({length: 16}, (_, i) => devProject(`dev-${i}`, i + 1));
    expect(kinds(schedule(input({projects: dev})).clashes)).toContain('dev_limit');

    const ready: Project[] = Array.from({length: 11}, (_, i) => ({
      id: `ready-${i}`,
      tier: 'ready_to_release' as const,
      priority: i + 1,
      leadId: ARCHITECT.id,
    }));
    expect(kinds(schedule(input({projects: ready})).clashes)).toContain('ready_limit');

    // At the limits, nothing is flagged.
    const atLimits = schedule(input({projects: [...dev.slice(0, 15), ...ready.slice(0, 10)]}));
    expect(kinds(atLimits.clashes)).not.toContain('dev_limit');
    expect(kinds(atLimits.clashes)).not.toContain('ready_limit');
  });

  it('flags a task forecast to finish after its due date, with the number of days late', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [task({id: 't', projectId: 'proj', hours: 18, dueDate: '2026-01-06'})],
      }),
    );

    // Forecast to end Wednesday the 7th against a Tuesday due date.
    expect(forecast(result, 't').end).toBe('2026-01-07');
    expect(forecast(result, 't').lateDays).toBe(1);
    expect(kinds(result.clashes)).toContain('late');

    // Comfortably on time: no clash, no late days.
    const onTime = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [task({id: 't', projectId: 'proj', hours: 6, dueDate: '2026-01-30'})],
      }),
    );
    expect(forecast(onTime, 't').lateDays).toBe(0);
    expect(kinds(onTime.clashes)).not.toContain('late');
  });

  it('flags tasks that cannot be scheduled', () => {
    const result = schedule(
      input({
        projects: [devProject('proj', 1)],
        tasks: [task({id: 't-nobody', projectId: 'proj', assigneeId: null})],
      }),
    );

    expect(kinds(result.clashes)).toContain('unschedulable');
    const clash = result.clashes.find((c) => c.kind === 'unschedulable');
    expect(clash?.taskIds).toContain('t-nobody');
  });
});

describe('schedule() — the Monday scenario', () => {
  // The sentence Phase 1 is judged on: Athiq changes one priority and the dates redraw.
  const people: Person[] = [ARCHITECT];
  const threeProjects = (kadriPriority: number, munnarPriority: number) =>
    input({
      people,
      projects: [
        devProject('kadri', kadriPriority),
        devProject('munnar', munnarPriority),
        devProject('mangala', 3),
      ],
      tasks: [
        task({id: 't-kadri', projectId: 'kadri'}),
        task({id: 't-munnar', projectId: 'munnar'}),
        task({id: 't-mangala', projectId: 'mangala'}),
      ],
    });

  it('raising Kadri from priority 2 to 1 moves its tasks earlier and pushes Munnar and Mangala later — and changes nothing else', () => {
    const before = schedule(threeProjects(2, 1));
    expect(forecast(before, 't-munnar').start).toBe('2026-01-05');
    expect(forecast(before, 't-kadri').start).toBe('2026-01-06');
    expect(forecast(before, 't-mangala').start).toBe('2026-01-07');

    const after = schedule(threeProjects(1, 2));
    expect(forecast(after, 't-kadri').start).toBe('2026-01-05');
    expect(forecast(after, 't-munnar').start).toBe('2026-01-06');

    // The project nobody touched keeps its dates.
    expect(forecast(after, 't-mangala').start).toBe(forecast(before, 't-mangala').start);
    expect(forecast(after, 't-mangala').end).toBe(forecast(before, 't-mangala').end);
  });
});
