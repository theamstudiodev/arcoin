import {z} from 'zod';
import {Constants} from '@/lib/database.types';
import {idSchema} from '@/lib/schemas/id';

const TITLE = 'Name the drawing or task.';
const HOURS = 'Hours go in half-hour steps — 1, 1.5, 2 and so on.';
const HOURS_MAX = 'Keep an estimate to 999 hours or fewer. Anything bigger is more than one drawing.';
const DUE_DATE = 'Use a date like 2026-03-15.';

const blankToNull = (value: unknown) => (value === '' || value == null ? null : value);

/**
 * Hours as the register takes them. Blank means "not estimated yet" — the studio writes the drawing
 * list first and the hours when the package is planned, so the database stores 0 and the clash list
 * nags about it rather than the form refusing the row.
 *
 * The half-hour step is the database's own CHECK (`hours * 2 = floor(hours * 2)`). It is repeated here
 * so a typed 1.3 is answered while Lilia is still looking at the field, not after a round trip.
 */
const hours = z.preprocess(
  (value) => {
    if (value === '' || value == null) return 0;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number({error: HOURS})
    .min(0, {error: HOURS})
    .max(999, {error: HOURS_MAX})
    .refine((value) => Number.isInteger(value * 2), {error: HOURS}),
);

const assignee = z.preprocess(blankToNull, idSchema('Choose the person doing this from the team list.').nullable());

const dueDate = z.preprocess(
  blankToNull,
  z
    .string({error: DUE_DATE})
    .regex(/^\d{4}-\d{2}-\d{2}$/, {error: DUE_DATE})
    .nullable(),
);

/**
 * A task as it is typed into a package's add row. Nothing here names the project or the org: a trigger
 * derives both from the package, so a task can never be filed against a project it does not belong to.
 */
export const taskSchema = z.object({
  package_id: idSchema('That package could not be found. Reload the page.'),
  title: z.string({error: TITLE}).trim().min(1, {error: TITLE}).max(160, {error: 'Keep the title to 160 characters or fewer.'}),
  assignee_id: assignee,
  hours,
  due_date: dueDate,
});

const id = idSchema('That task could not be found.');

/** The inline edit: the whole row except its status, which has its own function. */
export const taskUpdateSchema = taskSchema.omit({package_id: true}).extend({id});

/**
 * Status on its own. It is the one change the person a task is assigned to may make — the database
 * enforces that — and the one the studio makes most often, so it does not travel with the rest of the row.
 */
export const taskStatusSchema = z.object({
  id,
  status: z.enum(Constants.public.Enums.task_status, {error: 'Choose a status from the list.'}),
});

export const taskDeleteSchema = z.object({id});

export type TaskInput = z.input<typeof taskSchema>;
export type TaskUpdateInput = z.input<typeof taskUpdateSchema>;
export type TaskStatusInput = z.input<typeof taskStatusSchema>;
export type TaskDeleteInput = z.input<typeof taskDeleteSchema>;
