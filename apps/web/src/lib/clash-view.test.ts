import type {Clash} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {type ClashCard, type ClashRows, clashCards, clashDetail, NAMED_TASKS} from '@/lib/clash-view';

// The studio as the clash list reads it: two projects, their Project Architects, and the drawings in them.
const ROWS: ClashRows = {
  projects: [
    {id: 'c-kadri', code: 'AMS-26-014', name: 'Kadri Residence'},
    {id: 'c-deralakatte', code: null, name: 'Deralakatte Hostel'},
  ],
  people: [
    {id: 'b-lilia', name: 'Ar. Lilia'},
    {id: 'b-disha', name: 'Ar. Disha'},
  ],
  tasks: [
    {id: 't-toilet', title: 'Toilet details T1–T3'},
    {id: 't-stair', title: 'Staircase details'},
    {id: 't-schedule', title: 'Door and window schedule'},
    {id: 't-terrace', title: 'Terrace and parapet details'},
  ],
};

const LATE: Clash = {
  kind: 'late',
  severity: 'warn',
  message: 'Forecast to finish 2026-11-24, 3 days after its 2026-11-21 due date.',
  projectId: 'c-kadri',
  taskIds: ['t-toilet'],
};

const SLOT_LIMIT: Clash = {
  kind: 'slot_limit',
  severity: 'block',
  message: '6 packages are in production studio-wide; the limit is 5.',
};

const BLOCKED: Clash = {
  kind: 'unschedulable',
  severity: 'block',
  message: '4 tasks cannot be scheduled. Give each one an assignee and an hours estimate.',
  taskIds: ['t-toilet', 't-stair', 't-schedule', 't-terrace'],
};

/** The one card a single clash makes. Throws rather than letting an empty list satisfy an assertion. */
function card(clash: Clash): ClashCard {
  const [only] = clashCards([clash], ROWS);
  if (!only) throw new Error(`no card for ${clash.kind}`);
  return only;
}

describe('clashCards', () => {
  it('reads a broken studio limit before a warning', () => {
    const cards = clashCards([LATE, SLOT_LIMIT], ROWS);
    expect(cards.map((one) => one.clash.kind)).toEqual(['slot_limit', 'late']);
  });

  it('labels and edges each clash from the vocabulary the phone shares', () => {
    expect(card(SLOT_LIMIT).label).toBe('CAPACITY');
    expect(card(SLOT_LIMIT).edge).toContain('destructive');
    expect(card(LATE).label).toBe('LATE');
    expect(card(LATE).edge).toContain('at-risk');
    expect(card(BLOCKED).label).toBe('BLOCKED');
  });

  it('leaves the engine’s own list alone, so Today can order it its own way', () => {
    const given = [LATE, SLOT_LIMIT];
    clashCards(given, ROWS);
    expect(given.map((clash) => clash.kind)).toEqual(['late', 'slot_limit']);
  });

  it('resolves a project id to the project, and names the drawing rather than its id', () => {
    expect(card(LATE).project).toEqual({id: 'c-kadri', code: 'AMS-26-014', name: 'Kadri Residence'});
    expect(card(LATE).person).toBeNull();
    expect(card(LATE).taskTitles).toEqual(['Toilet details T1–T3']);
    expect(card(LATE).moreTasks).toBe(0);
  });

  it('resolves the per-lead limit to the Project Architect, because the engine puts the lead id there', () => {
    // That clash's message says only "This Project Architect", and the id it carries is Lilia's.
    const perLead = card({
      kind: 'lead_slot_limit',
      severity: 'block',
      message: 'This Project Architect has 3 packages in production; the limit is 2.',
      projectId: 'b-lilia',
      taskIds: ['t-toilet', 't-stair'],
    });

    expect(perLead.person).toEqual({id: 'b-lilia', name: 'Ar. Lilia'});
    // No project, so no `Open project` button: the id is a person's and would open the wrong thing.
    expect(perLead.project).toBeNull();
  });

  it('names three drawings and counts the rest, so one card cannot become the drawing register', () => {
    expect(card(BLOCKED).taskTitles).toHaveLength(NAMED_TASKS);
    expect(card(BLOCKED).taskTitles).toEqual(['Toilet details T1–T3', 'Staircase details', 'Door and window schedule']);
    expect(card(BLOCKED).moreTasks).toBe(1);
  });

  it('drops a task the viewer cannot see rather than printing a uuid at the studio', () => {
    const stale = card({...LATE, taskIds: ['t-toilet', '00000000-0000-4000-e000-000000000001']});
    expect(stale.taskTitles).toEqual(['Toilet details T1–T3']);
    expect(stale.moreTasks).toBe(0);
  });

  it('resolves a studio-wide limit to nothing, because it is about no one project', () => {
    expect(card(SLOT_LIMIT).project).toBeNull();
    expect(card(SLOT_LIMIT).person).toBeNull();
    expect(card(SLOT_LIMIT).taskTitles).toEqual([]);
  });
});

describe('clashDetail', () => {
  it('names the project and the drawing the engine only numbered', () => {
    expect(clashDetail(card(LATE))).toBe('AMS-26-014 Kadri Residence · Toilet details T1–T3');
  });

  it('falls back to the name when a project has no code yet', () => {
    expect(clashDetail(card({...LATE, projectId: 'c-deralakatte', taskIds: []}))).toBe('Deralakatte Hostel');
  });

  it('says how many drawings it did not name', () => {
    expect(clashDetail(card(BLOCKED))).toContain('and 1 more');
  });

  it('is empty for a clash about the whole studio, so the card shows no second line', () => {
    expect(clashDetail(card(SLOT_LIMIT))).toBe('');
  });
});
