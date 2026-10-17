import {expect, it} from 'vitest';
import {formatCapacity} from '@/lib/format';

it.each([
  [1, 'Full time'],
  [0.75, '75%'],
  [0.5, 'Half time'],
  [0.25, '25%'],
  [0.6, '60%'],
])('shows time on production %s as "%s"', (capacity, label) => {
  expect(formatCapacity(capacity)).toBe(label);
});
