'use server';

import {revalidatePath} from 'next/cache';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import {getViewer} from '@/lib/me';
import {personSaveErrorMessage, selfLockoutError} from '@/lib/people-rules';
import {isAdmin} from '@/lib/roles';
import {type PersonInput, personSchema, type PersonUpdateInput, personUpdateSchema} from '@/lib/schemas/person';
import {createClient} from '@/lib/supabase/server';

// Only admins may add or change people. The database enforces that; these functions put its refusals in plain words.

const SIGNED_OUT = "You're signed out. Sign in again.";

/** Puts someone on the team list, last in the studio's order. They can then set a password with that email. */
export async function addPerson(input: PersonInput): Promise<ActionResult<{id: string}>> {
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const last = await supabase
    .from('people')
    .select('sort_order')
    .order('sort_order', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (last.error) return {ok: false, error: personSaveErrorMessage(last.error, parsed.data.email)};

  const {data, error} = await supabase
    .from('people')
    .insert({...parsed.data, org_id: me.org_id, sort_order: (last.data?.sort_order ?? 0) + 1})
    .select('id')
    .single();
  if (error) return failed(error, parsed.data.email);

  revalidatePath('/people');
  return {ok: true, data: {id: data.id}};
}

/** Changes someone's name, role, time on production, or whether they're active. */
export async function updatePerson(input: PersonUpdateInput): Promise<ActionResult> {
  const parsed = personUpdateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const {id, ...changes} = parsed.data;
  const lockout = isAdmin(me.role) ? selfLockoutError(me.id, parsed.data) : null;
  if (lockout) return {ok: false, error: lockout};

  const supabase = await createClient();
  const current = await supabase.from('people').select('name, email, auth_user_id').eq('id', id).maybeSingle();
  if (current.error) return failed(current.error, changes.email);
  if (!current.data) return {ok: false, error: "That person isn't on the team list any more. Reload the page."};
  // Their sign-in account is tied to the email it was created with; a new one here would lock them out. The team list
  // may have been typed in by hand, so capitals don't count as a change, and a linked email is left as stored.
  const linked = current.data.auth_user_id !== null;
  if (linked && current.data.email.toLowerCase() !== changes.email) {
    const error = `${current.data.name} already has a sign-in for this email, so it can't change here.`;
    return {ok: false, error, fieldErrors: {email: error}};
  }
  const {email, ...details} = changes;

  const {data, error} = await supabase
    .from('people')
    .update(linked ? details : {...details, email})
    .eq('id', id)
    .select('id');
  if (error) return failed(error, changes.email);
  // Row-level security turns a refused update into "no rows changed", not an error.
  if (data.length === 0) return failed({code: '42501', message: 'no rows updated'}, changes.email);

  revalidatePath('/people');
  return {ok: true, data: null};
}

function failed(error: {code?: string; message: string}, email: string): ActionResult<never> {
  const message = personSaveErrorMessage(error, email);
  return error.code === '23505' ? {ok: false, error: message, fieldErrors: {email: message}} : {ok: false, error: message};
}
