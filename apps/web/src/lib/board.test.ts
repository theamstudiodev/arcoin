import {type IsoDate, schedule, type TaskForecast} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {boardSummary, lateLine, packagesInProduction, projectBoardMeta} from '@/lib/board';
import type {PackageForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';
import {toScheduleInput} from '@/lib/forecast';

const TODAY = '2026-10-21' as IsoDate;
const SETTINGS = {workdays: [1, 2, 3, 4, 5, 6], hours_per_day: 6, slot_limit: 5, per_lead_slots: 2, dev_limit: 15, ready_limit: 10};

function project(id: string, tier: ProjectForSchedule['tier'], priority: number | null = 1): ProjectForSchedule {
  return {id, code: `AMS-${id}`, name: id, tier, priority, lead_id: 'lilia', target_date: null};
}

function pkg(id: string, projectId: string, code: PackageForSchedule['code']): PackageForSchedule {
  return {id, project_id: projectId, code};
}

function task(
  id: string,
  packageId: string,
  status: TaskForSchedule['status'],
  overrides: Partial<TaskForSchedule> = {},
): TaskForSchedule {
  return {
    id,
    project_id: 'p1',
    package_id: packageId,
    title: id,
    assignee_id: 'bushra',
    hours: 6,
    status,
    due_date: null,
    start_after: null,
    sort_order: 1,
    done_at: null,
    ...overrides,
  };
}

describe('packagesInProduction', () => {
  it('counts a package only while a drawing still has hours left on it', () => {
    const projects = [project('p1', 'development')];
    const packages = [pkg('k1', 'p1', 'P04'), pkg('k2', 'p1', 'P01')];
    // k2 is finished history: every drawing issued, so it holds no slot.
    const tasks = [task('t1', 'k1', 'todo'), task('t2', 'k2', 'issued'), task('t3', 'k2', 'issued')];

    expect([...packagesInProduction(projects, packages, tasks)]).toEqual(['k1']);
  });

  it('ignores packages on projects that are not in Development', () => {
    // Only Development is scheduled, so a Ready to Release package takes no production slot.
    const projects = [project('p1', 'development'), project('p2', 'ready_to_release')];
    const packages = [pkg('k1', 'p1', 'P04'), pkg('k2', 'p2', 'P01')];
    const tasks = [task('t1', 'k1', 'todo'), task('t2', 'k2', 'todo')];

    expect([...packagesInProduction(projects, packages, tasks)]).toEqual(['k1']);
  });

  it('agrees with the number the engine puts in its own slot-limit clash', () => {
    // The rule lives privately inside schedule(). If the two ever drift, the board's strip and the clash
    // list would tell Athiq different numbers — so this is the test that stands between them.
    const projects = Array.from({length: 6}, (_, index) => project(`p${index}`, 'development', index + 1));
    const packages = projects.map((p, index) => pkg(`k${index}`, p.id, 'P04'));
    const tasks = packages.map((k, index) => task(`t${index}`, k.id, 'todo', {project_id: projects[index].id}));

    const rows = {
      projects,
      packages,
      tasks,
      people: [{id: 'bushra', name: 'Ar. Bushra', role: 'junior' as const, capacity: 1, active: true, sort_order: 1}],
      settings: SETTINGS,
      holidays: [],
    };
    const result = schedule(toScheduleInput(rows, TODAY));
    const slotClash = result.clashes.find((clash) => clash.kind === 'slot_limit');

    expect(slotClash?.message).toContain(`${packagesInProduction(projects, packages, tasks).size} packages`);
  });
});

describe('boardSummary', () => {
  const base = {
    projects: [project('p1', 'development'), project('p2', 'development'), project('p3', 'dormant')],
    packages: [pkg('k1', 'p1', 'P04')],
    tasks: [task('t1', 'k1', 'todo')],
    forecasts: new Map<string, TaskForecast>(),
    clashes: [],
    settings: SETTINGS,
  };

  it('reports production, Development and clashes against the studio limits', () => {
    const summary = boardSummary(base);
    expect(summary.packagesInProduction).toBe(1);
    expect(summary.slotLimit).toBe(5);
    expect(summary.overSlots).toBe(false);
    expect(summary.developmentCount).toBe(2);
    expect(summary.overDevelopment).toBe(false);
  });

  it('is over the limit only past it, never at it', () => {
    // The engine uses a strict comparison, and a studio sitting exactly on its limit has broken no rule.
    const atLimit = boardSummary({...base, settings: {...SETTINGS, slot_limit: 1}});
    expect(atLimit.overSlots).toBe(false);

    const over = boardSummary({...base, settings: {...SETTINGS, slot_limit: 0, dev_limit: 1}});
    expect(over.overSlots).toBe(true);
    expect(over.overDevelopment).toBe(true);
  });
});

describe('projectBoardMeta', () => {
  const packages = [pkg('k1', 'p1', 'P04'), pkg('k2', 'p1', 'P01'), pkg('k3', 'p1', 'ADD')];

  it('names the earliest package in the delivery order that still has work', () => {
    // P01 comes before P04 even though P04's drawings were created first.
    const tasks = [task('t1', 'k1', 'todo'), task('t2', 'k2', 'todo'), task('t3', 'k3', 'todo')];
    const meta = projectBoardMeta({project: {id: 'p1'}, packages, tasks, forecasts: new Map(), leadName: 'Ar. Lilia'});
    expect(meta.nextPackage).toBe('P01');
  });

  it('skips a package whose drawings have all gone out', () => {
    const tasks = [task('t1', 'k1', 'todo'), task('t2', 'k2', 'issued')];
    const meta = projectBoardMeta({project: {id: 'p1'}, packages, tasks, forecasts: new Map(), leadName: 'Ar. Lilia'});
    expect(meta.nextPackage).toBe('P04');
  });

  it('reads the finish date and the late count off the forecast', () => {
    const tasks = [task('t1', 'k1', 'todo'), task('t2', 'k1', 'todo')];
    const forecasts = new Map<string, TaskForecast>([
      ['t1', {taskId: 't1', start: '2026-10-21', end: '2026-11-02', lateDays: 3} as TaskForecast],
      ['t2', {taskId: 't2', start: '2026-10-21', end: '2026-11-24', lateDays: 0} as TaskForecast],
    ]);
    const meta = projectBoardMeta({project: {id: 'p1'}, packages, tasks, forecasts, leadName: 'Ar. Lilia'});

    expect(meta.finish).toBe('2026-11-24');
    expect(meta.lateTasks).toBe(1);
    expect(meta.metaLine).toBe('Lead Lilia · Next P04 · Finishes 24 Nov 2026');
  });

  it('says so plainly when a project has no Project Architect', () => {
    const meta = projectBoardMeta({project: {id: 'p1'}, packages, tasks: [], forecasts: new Map(), leadName: null});
    expect(meta.metaLine).toBe('No Project Architect');
  });
});

describe('lateLine', () => {
  it('counts one drawing in the singular', () => {
    expect(lateLine(1)).toBe('1 task running late');
    expect(lateLine(2)).toBe('2 tasks running late');
  });
});
