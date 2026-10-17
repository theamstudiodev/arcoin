import {describe, it} from 'vitest';

// The engine's specification, as tests to write BEFORE the implementation.
// Turn each `it.todo` into a real test with a small fixture: people, projects, tasks in → dates out.

describe('schedule() — placing work', () => {
  it.todo('schedules only tasks on development projects');
  it.todo('fills a person\'s days back to back, 6 production hours a day');
  it.todo('skips non-working days (Sunday) and holidays');
  it.todo('scales a part-time person by capacity — Athiq at 0.5 gets 3 hours a day');
  it.todo('orders by project priority, then package order (P01…ADD), then task sort order');
  it.todo('puts unranked projects (priority null) after every ranked project');
  it.todo('discounts remaining hours by status: todo 1 · in_progress 0.5 · for_check 0.2 · checked 0.1 · issued 0');
  it.todo('never starts a task before its start_after date');
  it.todo('continues on the same day after a task that ends mid-day');
  it.todo('returns a reason instead of dates when a task has no assignee or no hours');
  it.todo('is deterministic: same input, same output, no reliance on the system clock');
});

describe('schedule() — clashes', () => {
  it.todo('flags more than 5 packages in production studio-wide');
  it.todo('flags a Project Architect with more than 2 packages in production');
  it.todo('flags more than 15 projects in Development and more than 10 Ready to Release');
  it.todo('flags a task forecast to finish after its due date, with the number of days late');
  it.todo('flags tasks that cannot be scheduled');
});

describe('schedule() — the Monday scenario', () => {
  it.todo('raising Kadri from priority 2 to 1 moves its tasks earlier and pushes Munnar and Mangala later — and changes nothing else');
});
