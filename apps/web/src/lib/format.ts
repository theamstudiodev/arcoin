/** A person's share of the day on production work, the way the studio says it. */
export function formatCapacity(capacity: number): string {
  if (capacity === 1) return 'Full time';
  if (capacity === 0.5) return 'Half time';
  return `${Math.round(capacity * 100)}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A `YYYY-MM-DD` date the studio can read at a glance. Split rather than parsed, so no timezone
 * can move it a day either way.
 */
export function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!year || !name || !day) return date;
  return `${Number(day)} ${name} ${year}`;
}
