import {describe, expect, it} from 'vitest';
import {taskDeleteSchema, taskSchema, taskStatusSchema, taskUpdateSchema} from '@/lib/schemas/task';

const PACKAGE = '00000000-0000-4000-d000-000000000001';
const BUSHRA = '00000000-0000-4000-b000-000000000005';

const VALID = {
  package_id: PACKAGE,
  title: 'Staircase details',
  assignee_id: BUSHRA,
  hours: 6,
  due_date: '2026-11-24',
};

const parse = (overrides: Record<string, unknown> = {}) => taskSchema.safeParse({...VALID, ...overrides});

describe('taskSchema', () => {
  it('accepts a drawing as the register takes it', () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.success && result.data.title).toBe('Staircase details');
  });

  it('needs a title', () => {
    expect(parse({title: '   '}).success).toBe(false);
    expect(parse({title: undefined}).error?.issues[0]?.message).toMatch(/drawing or task/i);
  });

  it('trims the title, so a stray space never makes a second drawing', () => {
    expect(parse({title: '  Section AA and BB  '}).success && parse({title: '  Section AA and BB  '}).data).toMatchObject(
      {title: 'Section AA and BB'},
    );
  });

  it('reads hours typed into a form as a number', () => {
    const result = parse({hours: '7.5'});
    expect(result.success && result.data.hours).toBe(7.5);
  });

  it('holds hours to the half-hour steps the database allows', () => {
    expect(parse({hours: 1.3}).success).toBe(false);
    expect(parse({hours: '1.25'}).success).toBe(false);
    expect(parse({hours: 1.5}).success).toBe(true);
    expect(parse({hours: 12}).success).toBe(true);
    // The same sentence the database's own CHECK earns, so both paths read alike.
    expect(parse({hours: 1.3}).error?.issues[0]?.message).toBe('Hours go in half-hour steps — 1, 1.5, 2 and so on.');
  });

  it('takes a blank hours as "not estimated yet", which the clash list then nags about', () => {
    const blank = parse({hours: ''});
    const missing = parse({hours: null});
    expect(blank.success && blank.data.hours).toBe(0);
    expect(missing.success && missing.data.hours).toBe(0);
  });

  it('refuses hours that are not a number at all, and an estimate past a drawing', () => {
    expect(parse({hours: 'soon'}).success).toBe(false);
    expect(parse({hours: -1}).success).toBe(false);
    expect(parse({hours: 1000}).success).toBe(false);
  });

  it('turns a blank assignee and a blank due date into null, so the database stores "not set"', () => {
    const result = parse({assignee_id: '', due_date: ''});
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({assignee_id: null, due_date: null});
  });

  it('wants a real person for the assignee and a real date for the due date', () => {
    expect(parse({assignee_id: 'bushra'}).success).toBe(false);
    expect(parse({due_date: '24-11-2026'}).success).toBe(false);
  });

  it('wants the package the task belongs to', () => {
    expect(parse({package_id: 'P04'}).success).toBe(false);
    expect(parse({package_id: undefined}).success).toBe(false);
  });
});

describe('taskUpdateSchema', () => {
  it('identifies the task and leaves its package alone — a task never moves package from the register', () => {
    const result = taskUpdateSchema.safeParse({
      id: '00000000-0000-4000-e000-000000000001',
      title: 'Staircase details',
      assignee_id: BUSHRA,
      hours: '6',
      due_date: '2026-11-24',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty('package_id');
    expect(result.success && result.data.hours).toBe(6);
  });

  it('refuses a task it cannot identify', () => {
    expect(taskUpdateSchema.safeParse({...VALID, id: 'nope'}).success).toBe(false);
  });
});

describe('taskStatusSchema', () => {
  it('takes the one change an assignee may make', () => {
    const result = taskStatusSchema.safeParse({id: PACKAGE, status: 'for_check'});
    expect(result.success).toBe(true);
    expect(result.success && result.data.status).toBe('for_check');
  });

  it('only accepts the five statuses', () => {
    expect(taskStatusSchema.safeParse({id: PACKAGE, status: 'issued'}).success).toBe(true);
    expect(taskStatusSchema.safeParse({id: PACKAGE, status: 'done'}).success).toBe(false);
  });
});

describe('taskDeleteSchema', () => {
  it('takes the task and nothing else', () => {
    expect(taskDeleteSchema.safeParse({id: PACKAGE}).success).toBe(true);
    expect(taskDeleteSchema.safeParse({id: ''}).success).toBe(false);
  });
});
