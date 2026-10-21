import {describe, expect, it} from 'vitest';
import {projectMoveSchema, projectSchema} from '@/lib/schemas/project';

const VALID = {
  code: 'AMS-26-014',
  name: 'Kadri Residence',
  client: 'Mr Rao',
  project_type: 'Residence',
  tier: 'development',
  priority: 2,
  lead_id: '11111111-1111-4111-8111-111111111111',
  target_date: '2026-03-15',
};

const parse = (overrides: Record<string, unknown> = {}) => projectSchema.safeParse({...VALID, ...overrides});

describe('projectSchema', () => {
  it('accepts a fully filled project', () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe('Kadri Residence');
  });

  it('needs a name', () => {
    expect(parse({name: '   '}).success).toBe(false);
    expect(parse({name: undefined}).error?.issues[0]?.message).toMatch(/name/i);
  });

  it('turns every blank optional field into null, so the database stores "not set"', () => {
    const result = parse({code: '', client: '', project_type: '', priority: '', lead_id: '', target_date: ''});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      code: null,
      client: null,
      project_type: null,
      priority: null,
      lead_id: null,
      target_date: null,
    });
  });

  it('trims what it keeps', () => {
    const result = parse({name: '  Mangala Heights  ', code: '  AMS-26-020  '});
    expect(result.success && result.data.name).toBe('Mangala Heights');
    expect(result.success && result.data.code).toBe('AMS-26-020');
  });

  it('reads a priority typed into a form as a number', () => {
    const result = parse({priority: '7'});
    expect(result.success && result.data.priority).toBe(7);
  });

  it('holds priority to a whole number from 1 to 999', () => {
    expect(parse({priority: 0}).success).toBe(false);
    expect(parse({priority: 1000}).success).toBe(false);
    expect(parse({priority: 2.5}).success).toBe(false);
    expect(parse({priority: 'soon'}).success).toBe(false);
    expect(parse({priority: 1}).success).toBe(true);
    expect(parse({priority: 999}).success).toBe(true);
  });

  it('only accepts the four tiers', () => {
    expect(parse({tier: 'dormant'}).success).toBe(true);
    expect(parse({tier: 'on_hold'}).success).toBe(false);
  });

  it('wants a real date for the target', () => {
    expect(parse({target_date: '15-03-2026'}).success).toBe(false);
    expect(parse({target_date: '2026-03-15'}).success).toBe(true);
  });

  it('wants a real person for the lead', () => {
    expect(parse({lead_id: 'athiq'}).success).toBe(false);
  });
});

describe('projectMoveSchema', () => {
  it('takes just the board position', () => {
    const result = projectMoveSchema.safeParse({id: VALID.lead_id, tier: 'development', priority: '1'});
    expect(result.success).toBe(true);
    expect(result.success && result.data.priority).toBe(1);
  });

  it('allows a move to unranked', () => {
    const result = projectMoveSchema.safeParse({id: VALID.lead_id, tier: 'dormant', priority: ''});
    expect(result.success && result.data.priority).toBeNull();
  });

  it('refuses a project it cannot identify', () => {
    expect(projectMoveSchema.safeParse({id: 'nope', tier: 'dormant', priority: null}).success).toBe(false);
  });
});
