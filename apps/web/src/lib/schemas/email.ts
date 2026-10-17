import {z} from 'zod';

const message = 'Enter your full email address.';

/** An email as people type it on a phone: stray spaces and capitals are dropped before it is checked. */
export const emailSchema = z.string({error: message}).trim().toLowerCase().pipe(z.email({error: message}));
