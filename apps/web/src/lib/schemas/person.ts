import {z} from 'zod';
import {Constants} from '@/lib/database.types';
import {emailSchema} from '@/lib/schemas/email';

const CAPACITY = 'Time on production is a share of the day, from 0.01 to 1.';

/** A person on the team list, as an admin enters them. The same schema checks the form and the server action. */
export const personSchema = z.object({
  name: z
    .string({error: 'Give the person a name.'})
    .trim()
    .min(1, {error: 'Give the person a name.'})
    .max(80, {error: 'Keep the name to 80 characters or fewer.'}),
  email: emailSchema,
  role: z.enum(Constants.public.Enums.person_role, {error: 'Choose a role from the list.'}),
  // The database keeps two decimals (numeric(3,2)) and would round anything finer without saying so.
  capacity: z
    .number({error: CAPACITY})
    .gt(0, {error: CAPACITY})
    .lte(1, {error: CAPACITY})
    .refine((capacity) => Math.abs(capacity * 100 - Math.round(capacity * 100)) < 1e-9, {error: CAPACITY}),
  active: z.boolean(),
});

export const personUpdateSchema = personSchema.extend({id: z.uuid({error: 'That person could not be found.'})});

export type PersonInput = z.input<typeof personSchema>;
export type PersonUpdateInput = z.input<typeof personUpdateSchema>;
