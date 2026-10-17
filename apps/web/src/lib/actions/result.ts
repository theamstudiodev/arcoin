import {z} from 'zod';

/**
 * What every service function returns. `error` is written for the person using the app: it names what went wrong
 * and what to do. `fieldErrors` holds one message per form field.
 */
export type ActionResult<T = null> =
  | {ok: true; data: T}
  | {ok: false; error: string; fieldErrors?: Record<string, string>};

/** The first message for each field that failed, for showing under its input. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string[] | undefined> = z.flattenError(error).fieldErrors;
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) => (messages?.[0] ? [[field, messages[0]]] : [])),
  );
}

/** The result for input that failed its schema: the first problem, plus every field's message. */
export function invalidInput(error: z.ZodError): ActionResult<never> {
  return {ok: false, error: error.issues[0]?.message ?? 'Check the form and try again.', fieldErrors: fieldErrorsOf(error)};
}
