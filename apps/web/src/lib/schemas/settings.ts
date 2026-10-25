import {z} from 'zod';
import {sortWorkdays} from '@/lib/settings-rules';

const HOURS = 'Production hours per person per day are from 0.5 to 12, in half-hour steps.';
const WORKDAYS = 'The studio has to work at least one day a week. Turn another day on before turning this one off.';
const DAY = 'Pick a date for the holiday, like 2026-12-25.';
const HOLIDAY_LABEL = 'Keep the holiday name to 60 characters or fewer.';

/**
 * A number typed into a form arrives as a string, and anything that is not a number is left for Zod to
 * reject. A cleared field becomes null rather than 0: every one of these rules has to hold a value, so
 * blanking one is a mistake the field's own message explains.
 */
const typedNumber = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
};

/** A rule the studio counts in whole things: packages, projects or days. The database only insists on above zero. */
const whole = (error: string) =>
  z.preprocess(typedNumber, z.number({error}).int({error}).min(1, {error}).max(999, {error}));

/**
 * The six studio rules. Mirrors the checks on the settings row so a bad number comes back in words instead
 * of as a constraint violation — the database stays the final word on every one of them.
 */
export const studioRulesSchema = z.object({
  // numeric(3,1) keeps one decimal and would round anything finer without saying so, and the studio counts
  // production time in half hours everywhere else.
  hours_per_day: z.preprocess(
    typedNumber,
    z
      .number({error: HOURS})
      .gt(0, {error: HOURS})
      .lte(12, {error: HOURS})
      .refine((hours) => hours * 2 === Math.floor(hours * 2), {error: HOURS}),
  ),
  slot_limit: whole('Packages in production, studio-wide, is a whole number from 1 to 999.'),
  per_lead_slots: whole('Packages in production per Project Architect is a whole number from 1 to 999.'),
  dev_limit: whole('The Development limit is a whole number of projects from 1 to 999.'),
  ready_limit: whole('The Ready to Release limit is a whole number of projects from 1 to 999.'),
  dormant_days: whole('Days before Dormant is a whole number of days from 1 to 999.'),
});

/** What a blurred field sends: the rules that changed, not all six. */
export const studioRulesPatchSchema = studioRulesSchema
  .partial()
  .refine((rules) => Object.keys(rules).length > 0, {error: 'Nothing changed, so there was nothing to save.'});

/** The working week as ISO weekdays. Saved whole, because a week is one setting, not seven. */
export const workdaysSchema = z.object({
  workdays: z
    .array(z.number({error: WORKDAYS}).int({error: WORKDAYS}).min(1, {error: WORKDAYS}).max(7, {error: WORKDAYS}), {
      error: WORKDAYS,
    })
    .min(1, {error: WORKDAYS})
    .transform(sortWorkdays),
});

/** A day the studio is closed. The name is optional: a date on its own still closes the studio. */
export const holidaySchema = z.object({
  day: z
    .string({error: DAY})
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {error: DAY}),
  label: z.preprocess(
    (value) => (value == null ? '' : value),
    z
      .string({error: HOLIDAY_LABEL})
      .trim()
      .max(60, {error: HOLIDAY_LABEL})
      .transform((label) => (label === '' ? null : label)),
  ),
});

/** Taking a holiday off the list. The day is its key, and there is no update policy: a change is a remove then an add. */
export const holidayDaySchema = holidaySchema.pick({day: true});

export type StudioRulesPatchInput = z.input<typeof studioRulesPatchSchema>;
export type WorkdaysInput = z.input<typeof workdaysSchema>;
export type HolidayInput = z.input<typeof holidaySchema>;
export type HolidayDayInput = z.input<typeof holidayDaySchema>;
