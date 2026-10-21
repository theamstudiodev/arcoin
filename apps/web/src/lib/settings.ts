import type {Tables} from '@/lib/database.types';

/** What the Settings screen reads from the studio's one settings row, and the row type it gives. */
export const SETTINGS_COLUMNS =
  'workdays, hours_per_day, slot_limit, per_lead_slots, dev_limit, ready_limit, dormant_days';
export type SettingsRow = Pick<
  Tables<'settings'>,
  'workdays' | 'hours_per_day' | 'slot_limit' | 'per_lead_slots' | 'dev_limit' | 'ready_limit' | 'dormant_days'
>;

/** A day the studio is closed. Named, because Athiq reads the list to plan around Rajyotsava, not around a date. */
export const HOLIDAY_COLUMNS = 'day, label';
export type HolidayRow = Pick<Tables<'holidays'>, 'day' | 'label'>;

/**
 * The rules the partners agreed, as the migration defaults them. There is one settings row per org and the
 * seed creates it, so this stands in only if that row is ever missing — the screen then shows the studio's
 * real rules rather than a card full of zeros.
 */
export const SETTINGS_DEFAULTS: SettingsRow = {
  workdays: [1, 2, 3, 4, 5, 6],
  hours_per_day: 6,
  slot_limit: 5,
  per_lead_slots: 2,
  dev_limit: 15,
  ready_limit: 10,
  dormant_days: 60,
};
