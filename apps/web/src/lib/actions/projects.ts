'use server';

import {revalidatePath} from 'next/cache';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import {getViewer} from '@/lib/me';
import {projectSaveErrorMessage} from '@/lib/project-rules';
import {
  type ProjectInput,
  type ProjectMoveInput,
  projectMoveSchema,
  projectSchema,
  type ProjectUpdateInput,
  projectUpdateSchema,
} from '@/lib/schemas/project';
import {createClient} from '@/lib/supabase/server';

// Only admins may add or change projects. The database enforces that; these functions put its refusals in plain words.
// `tier_since` is maintained by a trigger on every tier change, so nothing here sends it.

const SIGNED_OUT = "You're signed out. Sign in again.";

/** Adds a project to the board, in the tier the admin chose. */
export async function addProject(input: ProjectInput): Promise<ActionResult<{id: string}>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {data, error} = await supabase
    .from('projects')
    .insert({...parsed.data, org_id: me.org_id})
    .select('id')
    .single();
  if (error) return failed(error, parsed.data.code);

  revalidatePath('/projects');
  return {ok: true, data: {id: data.id}};
}

/** Changes a project's details, including where it sits on the board. */
export async function updateProject(input: ProjectUpdateInput): Promise<ActionResult> {
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const {id, ...changes} = parsed.data;
  const supabase = await createClient();
  const {data, error} = await supabase.from('projects').update(changes).eq('id', id).select('id');
  if (error) return failed(error, changes.code);
  // Row-level security turns a refused update into "no rows changed", not an error.
  if (data.length === 0) return refused(id);

  revalidatePath('/projects');
  return {ok: true, data: null};
}

/**
 * Moves a project between tiers, or re-ranks it, from its card on the board. This is the change
 * Athiq makes most often, so it is its own function rather than a trip through the whole form.
 */
export async function moveProject(input: ProjectMoveInput): Promise<ActionResult> {
  const parsed = projectMoveSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const {id, tier, priority} = parsed.data;
  const supabase = await createClient();
  const {data, error} = await supabase.from('projects').update({tier, priority}).eq('id', id).select('id');
  if (error) return failed(error, null);
  if (data.length === 0) return refused(id);

  revalidatePath('/projects');
  return {ok: true, data: null};
}

function failed(error: {code?: string; message: string}, code: string | null): ActionResult<never> {
  const message = projectSaveErrorMessage(error, code);
  return error.code === '23505' ? {ok: false, error: message, fieldErrors: {code: message}} : {ok: false, error: message};
}

/** No rows changed: either the viewer is not an admin, or the project is gone. */
async function refused(id: string): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const {data} = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
  if (!data) return {ok: false, error: 'That project is no longer on the board. Reload the page.'};
  return {ok: false, error: projectSaveErrorMessage({code: '42501', message: 'no rows updated'}, null)};
}
