'use server';

import {revalidatePath} from 'next/cache';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import {getViewer} from '@/lib/me';
import {
  type HolidayDayInput,
  holidayDaySchema,
  type HolidayInput,
  holidaySchema,
  type StudioRulesPatchInput,
  studioRulesPatchSchema,
  type WorkdaysInput,
  workdaysSchema,
} from '@/lib/schemas/settings';
import {holidaySaveErrorMessage, settingsSaveErrorMessage} from '@/lib/settings-rules';
import {createClient} from '@/lib/supabase/server';

// Only admins may change the studio's rules. The database enforces that; these functions put its refusals in
// plain words. There is one settings row per org, so every change here is an update filtered by org_id —
// `org_id` is never sent, and `updated_at` belongs to the touch trigger.
//
// These are not ordinary settings: hours_per_day, workdays and the holiday list all feed the capacity the
// scheduler works from, so changing any of them moves every forecast date in the studio. Nothing else on the
// screen is that expensive, which is why each one saves on its own rather than behind a form full of changes.

const SIGNED_OUT = "You're signed out. Sign in again.";

/** Changes the studio rules that were edited — one blurred field at a time, not all six. */
export async function updateStudioRules(input: StudioRulesPatchInput): Promise<ActionResult> {
  const parsed = studioRulesPatchSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {data, error} = await supabase
    .from('settings')
    .update(parsed.data)
    .eq('org_id', me.org_id)
    .select('org_id');
  if (error) return {ok: false, error: settingsSaveErrorMessage(error)};
  // Row-level security turns a refused update into "no rows changed", not an error.
  if (data.length === 0) return refused();

  revalidatePath('/settings');
  return {ok: true, data: null};
}

/** Sets the studio's working week. The database refuses an empty one, and so does the schema, in words. */
export async function setWorkdays(input: WorkdaysInput): Promise<ActionResult> {
  const parsed = workdaysSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {data, error} = await supabase
    .from('settings')
    .update({workdays: parsed.data.workdays})
    .eq('org_id', me.org_id)
    .select('org_id');
  if (error) return {ok: false, error: settingsSaveErrorMessage(error)};
  if (data.length === 0) return refused();

  revalidatePath('/settings');
  return {ok: true, data: null};
}

/** Closes the studio for a day. Nobody is scheduled on it, so it pushes every date that follows. */
export async function addHoliday(input: HolidayInput): Promise<ActionResult> {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {error} = await supabase.from('holidays').insert({...parsed.data, org_id: me.org_id});
  if (error) return {ok: false, error: holidaySaveErrorMessage(error, parsed.data.day)};

  revalidatePath('/settings');
  return {ok: true, data: null};
}

/** Takes a day back off the holiday list. There is no update policy on holidays: a correction is a remove and an add. */
export async function removeHoliday(input: HolidayDayInput): Promise<ActionResult> {
  const parsed = holidayDaySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {data, error} = await supabase
    .from('holidays')
    .delete()
    .eq('org_id', me.org_id)
    .eq('day', parsed.data.day)
    .select('day');
  if (error) return {ok: false, error: holidaySaveErrorMessage(error, parsed.data.day)};
  // A refused delete removes nothing and raises nothing, exactly like a day that was already taken off.
  if (data.length === 0) {
    const {data: still} = await supabase.from('holidays').select('day').eq('day', parsed.data.day).maybeSingle();
    if (!still) return {ok: false, error: `${parsed.data.day} is not on the holiday list any more. Reload the page.`};
    return {ok: false, error: holidaySaveErrorMessage({code: '42501', message: 'no rows deleted'}, parsed.data.day)};
  }

  revalidatePath('/settings');
  return {ok: true, data: null};
}

/** No rows changed: either the viewer is not an admin, or the studio has no settings row at all. */
async function refused(): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const {data} = await supabase.from('settings').select('org_id').maybeSingle();
  if (!data) return {ok: false, error: "The studio's rules are missing. Reload the page."};
  return {ok: false, error: settingsSaveErrorMessage({code: '42501', message: 'no rows updated'})};
}
