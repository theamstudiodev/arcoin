import {describe, expect, it} from 'vitest';
import {addDays, daysBetween, isoWeekday, maxDate, startOfWeek} from '../src/dates';

describe('addDays', () => {
  it('moves forward and back', () => {
    expect(addDays('2026-01-05', 1)).toBe('2026-01-06');
    expect(addDays('2026-01-05', -1)).toBe('2026-01-04');
    expect(addDays('2026-01-05', 0)).toBe('2026-01-05');
  });

  it('crosses months, years and a leap day', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // 2028 is a leap year
  });
});

describe('daysBetween', () => {
  it('counts calendar days, signed', () => {
    expect(daysBetween('2026-01-05', '2026-01-12')).toBe(7);
    expect(daysBetween('2026-01-12', '2026-01-05')).toBe(-7);
    expect(daysBetween('2026-01-05', '2026-01-05')).toBe(0);
  });
});

describe('isoWeekday', () => {
  it('runs Monday 1 to Sunday 7', () => {
    // 2026-01-05 is a Monday.
    expect(isoWeekday('2026-01-05')).toBe(1);
    expect(isoWeekday('2026-01-10')).toBe(6); // Saturday, a working day for the studio
    expect(isoWeekday('2026-01-11')).toBe(7); // Sunday
  });
});

describe('startOfWeek', () => {
  it('finds the Monday of that week', () => {
    expect(startOfWeek('2026-01-05')).toBe('2026-01-05'); // already Monday
    expect(startOfWeek('2026-01-08')).toBe('2026-01-05'); // Thursday
    expect(startOfWeek('2026-01-11')).toBe('2026-01-05'); // Sunday belongs to the week that began Monday
  });
});

describe('maxDate', () => {
  it('returns the later of two', () => {
    expect(maxDate('2026-01-05', '2026-01-12')).toBe('2026-01-12');
    expect(maxDate('2026-01-12', '2026-01-05')).toBe('2026-01-12');
  });
});

describe('timezone independence', () => {
  it('does not shift a date, wherever the machine is', () => {
    // A local-time parse of midnight puts these a day earlier west of UTC. The studio is at UTC+5:30
    // and CI runs at UTC, so this is the bug that would show up as a forecast one day out.
    expect(addDays('2026-03-15', 1)).toBe('2026-03-16');
    expect(isoWeekday('2026-03-15')).toBe(7);
    expect(daysBetween('2026-03-15', '2026-03-16')).toBe(1);
  });
});
