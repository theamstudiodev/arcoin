import {z} from 'zod';
import {Constants} from '@/lib/database.types';
import {idSchema} from '@/lib/schemas/id';

const NAME = 'Give the project a name.';
const PRIORITY = 'Priority is a whole number from 1 to 999, or blank for unranked.';
const TARGET_DATE = 'Use a date like 2026-03-15.';

/**
 * Blank means "not set", and the database stores null for it. That matters for the project code:
 * its uniqueness only applies where there is one, so several projects may wait without a code.
 */
const optionalText = (max: number, error: string) =>
  z.preprocess(
    (value) => (value == null ? '' : value),
    z
      .string({error})
      .trim()
      .max(max, {error})
      .transform((value) => (value === '' ? null : value)),
  );

const blankToNull = (value: unknown) => (value === '' || value == null ? null : value);

/** A number typed into a form arrives as a string; anything that is not a number is left for Zod to reject. */
const priority = z.preprocess((value) => {
  const empty = blankToNull(value);
  if (empty === null) return null;
  if (typeof empty === 'string') {
    const parsed = Number(empty);
    return Number.isFinite(parsed) ? parsed : empty;
  }
  return empty;
}, z.number({error: PRIORITY}).int({error: PRIORITY}).min(1, {error: PRIORITY}).max(999, {error: PRIORITY}).nullable());

const tier = z.enum(Constants.public.Enums.project_tier, {error: 'Choose a tier from the list.'});

/** A project as an admin enters it. The same schema checks the form and the server action. */
export const projectSchema = z.object({
  code: optionalText(24, 'Keep the project code to 24 characters or fewer.'),
  name: z
    .string({error: NAME})
    .trim()
    .min(1, {error: NAME})
    .max(120, {error: 'Keep the name to 120 characters or fewer.'}),
  client: optionalText(80, 'Keep the client name to 80 characters or fewer.'),
  project_type: optionalText(40, 'Keep the project type to 40 characters or fewer.'),
  tier,
  priority,
  lead_id: z.preprocess(blankToNull, idSchema('Choose a Project Architect from the list.').nullable()),
  target_date: z.preprocess(
    blankToNull,
    z
      .string({error: TARGET_DATE})
      .regex(/^\d{4}-\d{2}-\d{2}$/, {error: TARGET_DATE})
      .nullable(),
  ),
});

const id = idSchema('That project could not be found.');

export const projectUpdateSchema = projectSchema.extend({id});

/** The quick change from a card: only where the project sits on the board. */
export const projectMoveSchema = z.object({id, tier, priority});

export type ProjectInput = z.input<typeof projectSchema>;
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;
export type ProjectMoveInput = z.input<typeof projectMoveSchema>;
