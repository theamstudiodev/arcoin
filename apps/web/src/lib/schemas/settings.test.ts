import {describe, expect, it} from 'vitest';
import {
  holidayDaySchema,
  holidaySchema,
  studioRulesPatchSchema,
  studioRulesSchema,
  workdaysSchema,
} from '@/lib/schemas/settings';

// The limits the partners agreed, which the seed starts every studio on.
const SEEDED = {
  hours_per_day: 6,
  slot_limit: 5,
  per_lead_slots: 2,
  dev_limit: 15,
  ready_limit: 10,
  dormant_days: 60,
};

const parse = (overrides: Record<string, unknown> = {}) => studioRulesSchema.safeParse({...SEEDED, ...overrides});

describe('studioRulesSchema', () => {
  it('accepts the rules AM Studio runs on', () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.success && result.data.dev_limit).toBe(15);
  });

  it('reads numbers typed into the form as numbers', () => {
    const result = studioRulesSchema.safeParse({
      hours_per_day: '6.5',
      slot_limit: '5',
      per_lead_slots: '2',
      dev_limit: '15',
      ready_limit: '10',
      dormant_days: '60',
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.hours_per_day).toBe(6.5);
  });

  it('holds production hours to the working day the database allows', () => {
    expect(parse({hours_per_day: 0}).success).toBe(false);
    expect(parse({hours_per_day: -1}).success).toBe(false);
    expect(parse({hours_per_day: 12.5}).success).toBe(false);
    expect(parse({hours_per_day: 12}).success).toBe(true);
    expect(parse({hours_per_day: 0.5}).success).toBe(true);
  });

  it('counts production hours in half hours, the way every other hours field does', () => {
    expect(parse({hours_per_day: 6.25}).success).toBe(false);
    expect(parse({hours_per_day: 7.5}).success).toBe(true);
  });

  it('says what to do when the hours are wrong', () => {
    expect(parse({hours_per_day: 14}).error?.issues[0]?.message).toBe(
      'Production hours per person per day are from 0.5 to 12, in half-hour steps.',
    );
  });

  it('keeps every limit a whole number above zero', () => {
    for (const key of ['slot_limit', 'per_lead_slots', 'dev_limit', 'ready_limit', 'dormant_days']) {
      expect(parse({[key]: 0}).success, key).toBe(false);
      expect(parse({[key]: 2.5}).success, key).toBe(false);
      expect(parse({[key]: 1000}).success, key).toBe(false);
      expect(parse({[key]: 1}).success, key).toBe(true);
    }
  });

  it('refuses a cleared rule rather than reading the blank as nothing', () => {
    expect(parse({dev_limit: ''}).success).toBe(false);
    expect(parse({dev_limit: ''}).error?.issues[0]?.message).toMatch(/Development limit/);
  });

  it('refuses anything that is not a number', () => {
    expect(parse({slot_limit: 'five'}).success).toBe(false);
  });
});

describe('studioRulesPatchSchema', () => {
  it('takes the one rule that changed', () => {
    const result = studioRulesPatchSchema.safeParse({dormant_days: '45'});
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({dormant_days: 45});
  });

  it('still refuses a bad number, and names the field it came from', () => {
    const result = studioRulesPatchSchema.safeParse({hours_per_day: '14'});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['hours_per_day']);
  });

  it('has nothing to send when nothing changed', () => {
    expect(studioRulesPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe('workdaysSchema', () => {
  it('accepts the studio’s Monday to Saturday week', () => {
    const result = workdaysSchema.safeParse({workdays: [1, 2, 3, 4, 5, 6]});
    expect(result.success && result.data.workdays).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('stores the week in order, each day once', () => {
    const result = workdaysSchema.safeParse({workdays: [7, 1, 1, 3]});
    expect(result.success && result.data.workdays).toEqual([1, 3, 7]);
  });

  it('will not let the studio work no days at all', () => {
    const result = workdaysSchema.safeParse({workdays: []});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/at least one day a week/);
  });

  it('only knows the seven ISO weekdays', () => {
    expect(workdaysSchema.safeParse({workdays: [0]}).success).toBe(false);
    expect(workdaysSchema.safeParse({workdays: [8]}).success).toBe(false);
    expect(workdaysSchema.safeParse({workdays: ['Mon']}).success).toBe(false);
  });
});

describe('holidaySchema', () => {
  it('takes a date and the name the studio knows it by', () => {
    const result = holidaySchema.safeParse({day: '2026-11-01', label: ' Kannada Rajyotsava '});
    expect(result.success && result.data).toEqual({day: '2026-11-01', label: 'Kannada Rajyotsava'});
  });

  it('closes the studio on a date with no name', () => {
    expect(holidaySchema.safeParse({day: '2026-12-25', label: ''}).success).toBe(true);
    expect(holidaySchema.safeParse({day: '2026-12-25'}).data?.label).toBeNull();
  });

  it('wants a real date, and says which shape', () => {
    expect(holidaySchema.safeParse({day: '25-12-2026'}).success).toBe(false);
    expect(holidaySchema.safeParse({day: ''}).error?.issues[0]?.message).toContain('2026-12-25');
  });

  it('keeps the name short enough to read in a chip', () => {
    expect(holidaySchema.safeParse({day: '2026-12-25', label: 'x'.repeat(61)}).success).toBe(false);
  });
});

describe('holidayDaySchema', () => {
  it('needs only the day, because that is the holiday’s key', () => {
    const result = holidayDaySchema.safeParse({day: '2026-12-25'});
    expect(result.success && result.data).toEqual({day: '2026-12-25'});
  });
});
