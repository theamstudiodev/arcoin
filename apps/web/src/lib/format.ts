/** A person's share of the day on production work, the way the studio says it. */
export function formatCapacity(capacity: number): string {
  if (capacity === 1) return 'Full time';
  if (capacity === 0.5) return 'Half time';
  return `${Math.round(capacity * 100)}%`;
}
