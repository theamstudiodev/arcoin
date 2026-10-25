import type {IsoDate} from './types';

/**
 * Date arithmetic on `YYYY-MM-DD` strings, in UTC throughout. Parsing with an explicit `Z`
 * keeps a machine in Mangalore and a CI runner in UTC on the same calendar day — a local-time
 * parse would shift every date by one in half the world.
 */

const DAY_MS = 86_400_000;

function toUtc(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10) as IsoDate;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/** ISO weekday, Monday = 1 … Sunday = 7. Matches `settings.workdays` in the database. */
export function isoWeekday(date: IsoDate): number {
  const day = new Date(toUtc(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The Monday of the week a date falls in. The timeline's 12-week scale starts from one of these. */
export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}
