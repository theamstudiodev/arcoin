import {describe, expect, it} from 'vitest';
import {formatCapacity, formatShortDate} from '@/lib/format';

it.each([
  [1, 'Full time'],
  [0.75, '75%'],
  [0.5, 'Half time'],
  [0.25, '25%'],
  [0.6, '60%'],
])('shows time on production %s as "%s"', (capacity, label) => {
  expect(formatCapacity(capacity)).toBe(label);
});

describe('formatShortDate', () => {
  it('reads a date the way the studio says it', () => {
    expect(formatShortDate('2026-03-15')).toBe('15 Mar 2026');
    expect(formatShortDate('2026-01-05')).toBe('5 Jan 2026');
    expect(formatShortDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('does not shift the day, whatever the machine timezone', () => {
    // A local-time parse of midnight turns this into the 14th west of UTC.
    expect(formatShortDate('2026-03-15')).toBe('15 Mar 2026');
  });

  it('gives back anything it cannot read, rather than inventing a date', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
    expect(formatShortDate('2026-13-01')).toBe('2026-13-01');
  });
});
