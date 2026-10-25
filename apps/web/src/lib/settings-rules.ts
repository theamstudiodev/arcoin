export type StudioRuleKey =
  | 'hours_per_day'
  | 'slot_limit'
  | 'per_lead_slots'
  | 'dev_limit'
  | 'ready_limit'
  | 'dormant_days';

export interface StudioRule {
  key: StudioRuleKey;
  /** The words the partners use for the rule. They are the field's label, so they are the rule's only name. */
  label: string;
  min: number;
  max: number;
  step: number;
}

/**
 * The six studio rules, in the order the partners read them. Production time is counted in half hours, the
 * way every other hours field in the studio is; the rest count whole packages, projects or days.
 *
 * The maximums are sanity, not policy: the database only insists each one is above zero. AM Studio has 50
 * projects and 7 people, so a four-figure limit is a typo rather than a rule.
 */
export const STUDIO_RULES = [
  {key: 'hours_per_day', label: 'Production hours per person per day', min: 0.5, max: 12, step: 0.5},
  {key: 'slot_limit', label: 'Packages in production, studio-wide', min: 1, max: 999, step: 1},
  {key: 'per_lead_slots', label: 'Packages in production per Project Architect', min: 1, max: 999, step: 1},
  {key: 'dev_limit', label: 'Development limit', min: 1, max: 999, step: 1},
  {key: 'ready_limit', label: 'Ready to Release limit', min: 1, max: 999, step: 1},
  {key: 'dormant_days', label: 'Days before Dormant', min: 1, max: 999, step: 1},
] as const satisfies readonly StudioRule[];

export interface Weekday {
  /** ISO weekday, the way the database stores the working week: Monday is 1 and Sunday is 7. */
  day: number;
  short: string;
  name: string;
}

/** The week, Monday first. AM Studio works Monday to Saturday, so Sunday is the one normally left off. */
export const WEEKDAYS = [
  {day: 1, short: 'Mon', name: 'Monday'},
  {day: 2, short: 'Tue', name: 'Tuesday'},
  {day: 3, short: 'Wed', name: 'Wednesday'},
  {day: 4, short: 'Thu', name: 'Thursday'},
  {day: 5, short: 'Fri', name: 'Friday'},
  {day: 6, short: 'Sat', name: 'Saturday'},
  {day: 7, short: 'Sun', name: 'Sunday'},
] as const satisfies readonly Weekday[];

/** Each day once, ascending — so the stored week always looks the same and an audit entry means something. */
export function sortWorkdays(days: readonly number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * Turns one working day on or off. It will happily return an empty week: refusing that is the schema's job,
 * so the studio is told "at least one day" rather than finding the last toggle quietly dead.
 */
export function toggleWorkday(workdays: readonly number[], day: number): number[] {
  return sortWorkdays(workdays.includes(day) ? workdays.filter((other) => other !== day) : [...workdays, day]);
}

/** Plain words for a refused change to the studio's rules. */
export function settingsSaveErrorMessage(error: {code?: string; message: string}): string {
  if (error.code === '42501') return "Only Asif or Athiq can change the studio's rules.";
  if (error.code === '23514') return 'The studio keeps that rule within its own limits. Check the number and try again.';
  return "Couldn't save. Check your connection and try again.";
}

/** Plain words for a refused change to the holiday list. */
export function holidaySaveErrorMessage(error: {code?: string; message: string}, day: string): string {
  if (error.code === '23505') return `${day} is already on the holiday list.`;
  if (error.code === '42501') return 'Only Asif or Athiq can change the holiday list.';
  return "Couldn't save. Check your connection and try again.";
}
