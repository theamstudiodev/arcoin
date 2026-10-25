import {describe, expect, it} from 'vitest';
import {
  holidaySaveErrorMessage,
  settingsSaveErrorMessage,
  sortWorkdays,
  STUDIO_RULES,
  toggleWorkday,
  WEEKDAYS,
} from '@/lib/settings-rules';

describe('STUDIO_RULES', () => {
  it('lists the six rules the partners agreed, in the order they read them', () => {
    expect(STUDIO_RULES.map((rule) => rule.key)).toEqual([
      'hours_per_day',
      'slot_limit',
      'per_lead_slots',
      'dev_limit',
      'ready_limit',
      'dormant_days',
    ]);
  });

  it('labels each rule in the studio’s own words', () => {
    expect(STUDIO_RULES.map((rule) => rule.label)).toEqual([
      'Production hours per person per day',
      'Packages in production, studio-wide',
      'Packages in production per Project Architect',
      'Development limit',
      'Ready to Release limit',
      'Days before Dormant',
    ]);
  });

  it('counts production time in half hours and everything else in whole things', () => {
    const hours = STUDIO_RULES[0];
    expect(hours).toMatchObject({key: 'hours_per_day', min: 0.5, max: 12, step: 0.5});
    for (const rule of STUDIO_RULES.slice(1)) expect(rule, rule.key).toMatchObject({min: 1, step: 1});
  });
});

describe('WEEKDAYS', () => {
  it('runs Monday to Sunday as ISO weekdays, which is how the week is stored', () => {
    expect(WEEKDAYS.map((weekday) => weekday.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(WEEKDAYS[0]).toMatchObject({day: 1, short: 'Mon', name: 'Monday'});
    expect(WEEKDAYS[6]).toMatchObject({day: 7, short: 'Sun', name: 'Sunday'});
  });
});

describe('sortWorkdays', () => {
  it('keeps each day once, ascending', () => {
    expect(sortWorkdays([6, 1, 3, 1])).toEqual([1, 3, 6]);
    expect(sortWorkdays([])).toEqual([]);
  });
});

describe('toggleWorkday', () => {
  it('turns Sunday on and leaves the week in order', () => {
    expect(toggleWorkday([1, 2, 3, 4, 5, 6], 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('turns Saturday off — the studio dropping to a five-day week', () => {
    expect(toggleWorkday([1, 2, 3, 4, 5, 6], 6)).toEqual([1, 2, 3, 4, 5]);
  });

  it('will return an empty week, so the refusal can be worded rather than a toggle going quietly dead', () => {
    expect(toggleWorkday([3], 3)).toEqual([]);
  });
});

describe('settingsSaveErrorMessage', () => {
  it('says who may change the rules when the database refuses', () => {
    expect(settingsSaveErrorMessage({code: '42501', message: 'denied'})).toMatch(/Asif or Athiq/);
  });

  it('names the number when a check constraint turns it down', () => {
    expect(settingsSaveErrorMessage({code: '23514', message: 'violates check'})).toMatch(/number/i);
  });

  it('falls back to something actionable for anything else', () => {
    expect(settingsSaveErrorMessage({message: 'network down'})).toMatch(/try again/i);
  });
});

describe('holidaySaveErrorMessage', () => {
  it('names the day that is already on the list', () => {
    expect(holidaySaveErrorMessage({code: '23505', message: 'duplicate'}, '2026-12-25')).toContain('2026-12-25');
  });

  it('says who may change the holiday list', () => {
    expect(holidaySaveErrorMessage({code: '42501', message: 'denied'}, '2026-12-25')).toMatch(/Asif or Athiq/);
  });

  it('falls back to something actionable for anything else', () => {
    expect(holidaySaveErrorMessage({message: 'network down'}, '2026-12-25')).toMatch(/try again/i);
  });
});
