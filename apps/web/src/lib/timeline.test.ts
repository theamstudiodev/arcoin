import type {IsoDate, TaskForecast} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import type {PackageForSchedule, PersonForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';
import {
  barGeometry,
  barLabel,
  BAR_HEIGHT,
  DAY_WIDTH,
  isInWindow,
  LABEL_WIDTH,
  laneTop,
  legendFor,
  markerLeft,
  packLanes,
  parseView,
  rowHeight,
  rowsByPackage,
  rowsByPerson,
  type TimelineBar,
  timelineBars,
  timelineScale,
  TIMELINE_VIEW_LABELS,
  WEEK_WIDTH,
} from '@/lib/timeline';

// A Wednesday in the week the studio's seed was written against. Its Monday is 19 Oct 2026 and the
// twelfth week closes on 10 Jan 2027.
const WEDNESDAY: IsoDate = '2026-10-21';
const SCALE = timelineScale(WEDNESDAY);

/** A bar with everything filled in, so each test overrides only the thing it is about. */
function bar(over: Partial<TimelineBar> = {}): TimelineBar {
  return {
    taskId: 't-toilet',
    title: 'Toilet details T1–T3',
    projectId: 'p-kadri',
    projectCode: 'AMS-26-014',
    projectName: 'Kadri Residence',
    packageCode: 'P04',
    assigneeId: 'who-bushra',
    status: 'in_progress',
    start: '2026-10-21',
    end: '2026-10-21',
    dueDate: '2026-11-21',
    lateDays: 0,
    ...over,
  };
}

describe('timelineScale', () => {
  it('opens on the Monday of the week today falls in, and runs twelve whole weeks', () => {
    expect(SCALE.start).toBe('2026-10-19');
    expect(SCALE.end).toBe('2027-01-10');
    expect(SCALE.days).toBe(84);
    expect(SCALE.weeks).toHaveLength(12);
    expect(SCALE.width).toBe(84 * DAY_WIDTH);
  });

  it('spaces the week columns evenly and dates each one without a year', () => {
    expect(SCALE.weeks[0]).toEqual({monday: '2026-10-19', label: '19 Oct', left: 0});
    expect(SCALE.weeks[1]).toEqual({monday: '2026-10-26', label: '26 Oct', left: WEEK_WIDTH});
    expect(SCALE.weeks[11]).toEqual({monday: '2027-01-04', label: '4 Jan', left: 11 * WEEK_WIDTH});
  });

  it('labels the range the way the mock does, with an en dash', () => {
    expect(SCALE.label).toBe('19 Oct – 10 Jan');
  });

  it('puts today at the left edge on a Monday and six days in on a Sunday', () => {
    expect(timelineScale('2026-10-19').todayLeft).toBe(0);
    expect(SCALE.todayLeft).toBe(2 * DAY_WIDTH);
    expect(timelineScale('2026-10-25').todayLeft).toBe(6 * DAY_WIDTH);
    // A Sunday still belongs to the week that has just finished, so the window does not jump forward.
    expect(timelineScale('2026-10-25').start).toBe('2026-10-19');
  });

  it('counts a leap day as a day like any other', () => {
    const leap = timelineScale('2028-03-01');
    expect(leap.start).toBe('2028-02-28');
    expect(leap.end).toBe('2028-05-21');
    expect(leap.weeks[0].monday).toBe('2028-02-28');
  });

  it('takes a shorter window when asked, for a test or a narrower screen', () => {
    const four = timelineScale(WEDNESDAY, 4);
    expect(four.weeks).toHaveLength(4);
    expect(four.days).toBe(28);
    expect(four.end).toBe('2026-11-15');
  });
});

describe('isInWindow', () => {
  it('includes both ends and nothing outside them', () => {
    expect(isInWindow(SCALE, '2026-10-19')).toBe(true);
    expect(isInWindow(SCALE, '2027-01-10')).toBe(true);
    expect(isInWindow(SCALE, '2026-10-18')).toBe(false);
    expect(isInWindow(SCALE, '2027-01-11')).toBe(false);
    expect(isInWindow(SCALE, null)).toBe(false);
  });
});

describe('barGeometry', () => {
  it('gives a one-day drawing exactly one day of width', () => {
    expect(barGeometry(SCALE, '2026-10-21', '2026-10-21')).toEqual({
      left: 2 * DAY_WIDTH,
      width: DAY_WIDTH,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it('counts both ends, so Wednesday to Saturday is four days', () => {
    const geometry = barGeometry(SCALE, '2026-10-21', '2026-10-24');
    expect(geometry).toEqual({left: 2 * DAY_WIDTH, width: 4 * DAY_WIDTH, clippedStart: false, clippedEnd: false});
  });

  it('ends flush with the right edge for a task finishing on the last day', () => {
    const geometry = barGeometry(SCALE, '2027-01-09', '2027-01-10');
    expect(geometry).not.toBeNull();
    expect((geometry as NonNullable<typeof geometry>).left + (geometry as NonNullable<typeof geometry>).width).toBe(
      SCALE.width,
    );
    expect(geometry?.clippedEnd).toBe(false);
  });

  it('spans the whole window and marks both ends clipped', () => {
    expect(barGeometry(SCALE, '2026-09-01', '2027-03-01')).toEqual({
      left: 0,
      width: SCALE.width,
      clippedStart: true,
      clippedEnd: true,
    });
  });

  it('cuts a task that began before the window at the left edge', () => {
    expect(barGeometry(SCALE, '2026-10-12', '2026-10-20')).toEqual({
      left: 0,
      width: 2 * DAY_WIDTH,
      clippedStart: true,
      clippedEnd: false,
    });
  });

  it('cuts a task that runs past the twelfth week at the right edge', () => {
    const geometry = barGeometry(SCALE, '2027-01-04', '2027-02-28');
    expect(geometry).toEqual({
      left: 77 * DAY_WIDTH,
      width: 7 * DAY_WIDTH,
      clippedStart: false,
      clippedEnd: true,
    });
  });

  it('draws nothing for a task entirely in the past or entirely beyond the window', () => {
    expect(barGeometry(SCALE, '2026-09-01', '2026-10-18')).toBeNull();
    expect(barGeometry(SCALE, '2027-01-11', '2027-01-20')).toBeNull();
  });
});

describe('markerLeft', () => {
  it('centres the diamond in its day', () => {
    expect(markerLeft(SCALE, '2026-10-19')).toBe(DAY_WIDTH / 2);
    expect(markerLeft(SCALE, '2026-11-21')).toBe(33 * DAY_WIDTH + DAY_WIDTH / 2);
  });

  it('has nowhere to draw a due date outside the window, or none at all', () => {
    expect(markerLeft(SCALE, '2027-03-05')).toBeNull();
    expect(markerLeft(SCALE, null)).toBeNull();
  });
});

describe('packLanes', () => {
  it('keeps back-to-back work on one lane', () => {
    const lanes = packLanes([
      bar({taskId: 'a', start: '2026-10-21', end: '2026-10-22'}),
      bar({taskId: 'b', start: '2026-10-23', end: '2026-10-24'}),
    ]);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].map((item) => item.taskId)).toEqual(['a', 'b']);
  });

  it('stacks two drawings that share a day, because that day is booked twice', () => {
    // The engine leaves the hours left in a day for the next task, so Bushra finishes one drawing
    // and starts the next on the same Wednesday. One lane would hide one of them.
    const lanes = packLanes([
      bar({taskId: 'first-floor', start: '2026-10-21', end: '2026-10-21'}),
      bar({taskId: 'toilet', start: '2026-10-21', end: '2026-10-21'}),
      bar({taskId: 'concept', start: '2026-10-21', end: '2026-10-24'}),
      bar({taskId: 'cottage', start: '2026-10-24', end: '2026-10-27'}),
    ]);
    // Three, not four: the cottage starts on the 24th and the first lane has been free since the 22nd,
    // so it drops back into it. Packing work into the shallowest row that fits keeps the grid readable.
    expect(lanes).toHaveLength(3);
    expect(lanes.map((lane) => lane.map((item) => item.taskId))).toEqual([
      ['first-floor', 'cottage'],
      ['toilet'],
      ['concept'],
    ]);
  });

  it('drops only as far as it must, reusing the first lane that has finished', () => {
    const lanes = packLanes([
      bar({taskId: 'long', start: '2026-10-19', end: '2026-10-24'}),
      bar({taskId: 'overlap', start: '2026-10-21', end: '2026-10-22'}),
      bar({taskId: 'after', start: '2026-10-26', end: '2026-10-27'}),
    ]);
    expect(lanes).toHaveLength(2);
    expect(lanes[0].map((item) => item.taskId)).toEqual(['long', 'after']);
    expect(lanes[1].map((item) => item.taskId)).toEqual(['overlap']);
  });

  it('has no lanes at all for someone with nothing on', () => {
    expect(packLanes([])).toEqual([]);
  });
});

describe('laneTop and rowHeight', () => {
  it('spaces the lanes by the gap and pads the row either side', () => {
    expect(laneTop(0)).toBe(6);
    expect(laneTop(1)).toBe(6 + BAR_HEIGHT + 4);
  });

  it('holds one lane of height for an empty row, so the grid keeps its rhythm', () => {
    const empty = {key: 'asif', label: 'Ar. Asif', meta: 'Principal Architect', lanes: []};
    expect(rowHeight(empty)).toBe(BAR_HEIGHT + 12);
    expect(rowHeight({...empty, lanes: [[bar()]]})).toBe(BAR_HEIGHT + 12);
  });

  it('grows with the deepest stack', () => {
    const three = {key: 'bushra', label: 'Ar. Bushra', meta: 'Junior Architect', lanes: [[bar()], [bar()], [bar()]]};
    expect(rowHeight(three)).toBe(3 * BAR_HEIGHT + 2 * 4 + 12);
  });
});

const KADRI: ProjectForSchedule = {
  id: 'p-kadri',
  code: 'AMS-26-014',
  name: 'Kadri Residence',
  tier: 'development',
  priority: 2,
  lead_id: 'who-lilia',
  target_date: '2026-12-24',
};
const MANGALA: ProjectForSchedule = {
  id: 'p-mangala',
  code: 'AMS-26-008',
  name: 'Mangala Residence',
  tier: 'development',
  priority: 1,
  lead_id: 'who-disha',
  target_date: '2026-12-02',
};
const PACKAGES: readonly PackageForSchedule[] = [
  {id: 'pkg-kadri-p04', project_id: 'p-kadri', code: 'P04'},
  {id: 'pkg-kadri-add', project_id: 'p-kadri', code: 'ADD'},
  {id: 'pkg-mangala-p04', project_id: 'p-mangala', code: 'P04'},
];

function task(over: Partial<TaskForSchedule> & {id: string}): TaskForSchedule {
  return {
    project_id: 'p-kadri',
    package_id: 'pkg-kadri-p04',
    title: 'Staircase details',
    assignee_id: 'who-lilia',
    done_at: null,
    hours: 6,
    status: 'todo',
    due_date: '2026-11-24',
    start_after: null,
    sort_order: 5,
    ...over,
  };
}

function forecast(taskId: string, over: Partial<TaskForecast> = {}): TaskForecast {
  return {taskId, start: '2026-10-21', end: '2026-10-22', lateDays: 0, reason: null, ...over};
}

describe('timelineBars', () => {
  const tasks = [
    task({id: 'kadri-staircase'}),
    task({id: 'kadri-facade', package_id: 'pkg-kadri-add', title: 'Revised facade option for client'}),
    task({id: 'mangala-ground', project_id: 'p-mangala', package_id: 'pkg-mangala-p04', title: 'Ground floor working plan'}),
    task({id: 'not-development', title: 'Kavoor Clinic concept'}),
  ];
  const forecasts = new Map<string, TaskForecast>([
    ['kadri-staircase', forecast('kadri-staircase')],
    ['kadri-facade', forecast('kadri-facade')],
    ['mangala-ground', forecast('mangala-ground')],
  ]);
  const input = {tasks, packages: PACKAGES, projects: [KADRI, MANGALA], forecasts};

  it('leaves out a task the engine never forecast — it is not on a Development project', () => {
    const {bars} = timelineBars(input);
    expect(bars.map((item) => item.taskId)).not.toContain('not-development');
  });

  it('orders by project priority, then package production order', () => {
    const {bars} = timelineBars(input);
    expect(bars.map((item) => item.taskId)).toEqual(['mangala-ground', 'kadri-staircase', 'kadri-facade']);
  });

  it('carries the project code, name and package code onto every bar', () => {
    const {bars} = timelineBars(input);
    expect(bars[0]).toMatchObject({
      projectCode: 'AMS-26-008',
      projectName: 'Mangala Residence',
      packageCode: 'P04',
      start: '2026-10-21',
      end: '2026-10-22',
    });
  });

  it('lists a task the engine refused to place, in the engine’s own words, rather than dropping it', () => {
    const refused = new Map(forecasts);
    refused.set('kadri-staircase', forecast('kadri-staircase', {start: null, end: null, reason: 'No assignee'}));

    const {bars, blocked} = timelineBars({...input, forecasts: refused});
    expect(bars.map((item) => item.taskId)).toEqual(['mangala-ground', 'kadri-facade']);
    expect(blocked).toEqual([
      {
        taskId: 'kadri-staircase',
        title: 'Staircase details',
        projectId: 'p-kadri',
        projectCode: 'AMS-26-014',
        reason: 'No assignee',
      },
    ]);
  });

  it('treats a forecast with no dates as blocked even when the engine gave no reason', () => {
    const half = new Map([['kadri-staircase', forecast('kadri-staircase', {start: null, end: null})]]);
    const {bars, blocked} = timelineBars({...input, forecasts: half});
    expect(bars).toEqual([]);
    expect(blocked[0].reason).toBe('The scheduler could not place this task');
  });
});

const PEOPLE: readonly PersonForSchedule[] = [
  {id: 'who-asif', name: 'Ar. Asif', role: 'principal', capacity: 0.25, active: true, sort_order: 1},
  {id: 'who-lilia', name: 'Ar. Lilia', role: 'lead', capacity: 1, active: true, sort_order: 3},
  {id: 'who-bushra', name: 'Ar. Bushra', role: 'junior', capacity: 1, active: true, sort_order: 5},
  {id: 'who-gone', name: 'Ar. Someone', role: 'junior', capacity: 1, active: false, sort_order: 9},
];

describe('rowsByPerson', () => {
  const rows = rowsByPerson([bar({assigneeId: 'who-bushra'}), bar({taskId: 'other', assigneeId: 'who-lilia'})], PEOPLE);

  it('keeps one row per active person, in the studio’s order, with the role underneath', () => {
    expect(rows.map((row) => row.label)).toEqual(['Ar. Asif', 'Ar. Lilia', 'Ar. Bushra']);
    expect(rows.map((row) => row.meta)).toEqual(['Principal Architect', 'Project Architect', 'Junior Architect']);
  });

  it('shows an empty row for whoever is free, because that is the answer to who can take work', () => {
    expect(rows[0].lanes).toEqual([]);
    expect(rows[1].lanes).toHaveLength(1);
  });

  it('gives each person only their own work', () => {
    expect(rows[2].lanes[0].map((item) => item.taskId)).toEqual(['t-toilet']);
  });
});

describe('rowsByPackage', () => {
  it('names the row by project and package code, with the package name underneath', () => {
    const rows = rowsByPackage([
      bar({taskId: 'a'}),
      bar({taskId: 'b', start: '2026-10-23', end: '2026-10-24'}),
      bar({taskId: 'c', packageCode: 'ADD', title: 'Site measurement visit'}),
    ]);
    expect(rows.map((row) => row.label)).toEqual(['AMS-26-014 · P04', 'AMS-26-014 · ADD']);
    expect(rows.map((row) => row.meta)).toEqual(['Design and Tender', 'Additional tasks']);
    expect(rows[0].lanes[0].map((item) => item.taskId)).toEqual(['a', 'b']);
  });

  it('gives a package no row at all when nothing in it is scheduled', () => {
    expect(rowsByPackage([])).toEqual([]);
  });
});

describe('legendFor', () => {
  it('lists each project once, in the order the grid draws them', () => {
    // Each project carries its own id. Two projects sharing one would be impossible in the database,
    // and the legend is keyed on the id because a project's code is nullable and can be edited.
    const legend = legendFor([
      bar({projectId: 'p-mangala', projectCode: 'AMS-26-008', projectName: 'Mangala Residence'}),
      bar({projectId: 'p-kadri', projectCode: 'AMS-26-014', projectName: 'Kadri Residence'}),
      bar({projectId: 'p-mangala', projectCode: 'AMS-26-008', projectName: 'Mangala Residence'}),
    ]);
    expect(legend.map((entry) => entry.code)).toEqual(['AMS-26-008', 'AMS-26-014']);
    expect(legend[0].colour).toMatch(/^bg-project-[1-8]$/);
  });
});

describe('barLabel', () => {
  it('reads out the code, the drawing, its status and its dates', () => {
    expect(barLabel(bar({start: '2026-10-21', end: '2026-10-24'}))).toBe(
      'AMS-26-014 Toilet details T1–T3 · In progress · 21 Oct 2026 to 24 Oct 2026 · due 21 Nov 2026',
    );
  });

  it('says how late a task is, so lateness is never only a colour', () => {
    expect(barLabel(bar({lateDays: 6}))).toContain('6 days late');
    expect(barLabel(bar({lateDays: 1}))).toContain('1 day late');
  });

  it('leaves the due date out when the drawing has none', () => {
    expect(barLabel(bar({dueDate: null}))).not.toContain('due');
  });
});

describe('parseView', () => {
  it('shows people first, which is Athiq’s Monday question', () => {
    expect(parseView(undefined)).toBe('person');
    expect(parseView('person')).toBe('person');
    expect(TIMELINE_VIEW_LABELS.person).toBe('By person');
    expect(TIMELINE_VIEW_LABELS.package).toBe('By project & package');
  });

  it('reads the other view from the query string, and ignores anything it does not know', () => {
    expect(parseView('package')).toBe('package');
    expect(parseView(['package', 'person'])).toBe('package');
    expect(parseView('gantt')).toBe('person');
    expect(parseView('')).toBe('person');
  });
});

describe('the mock’s measurements', () => {
  it('keeps the label column and the bar at the sizes STITCH-PROMPTS specifies', () => {
    expect(LABEL_WIDTH).toBe(180);
    expect(BAR_HEIGHT).toBe(22);
  });
});
