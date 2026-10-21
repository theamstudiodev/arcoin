'use server';

import {revalidatePath} from 'next/cache';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import type {TablesInsert} from '@/lib/database.types';
import {getViewer} from '@/lib/me';
import {
  type TaskDeleteInput,
  taskDeleteSchema,
  type TaskInput,
  taskSchema,
  type TaskStatusInput,
  taskStatusSchema,
  type TaskUpdateInput,
  taskUpdateSchema,
} from '@/lib/schemas/task';
import {createClient} from '@/lib/supabase/server';
import {taskSaveErrorMessage} from '@/lib/task-rules';

// The register's four mutations. Admins and the project's Project Architect manage tasks; the person a
// task is assigned to may change its status and nothing else. All of that is enforced in Postgres —
// these functions only turn its refusals into sentences the studio can act on.
//
// Two shapes of refusal arrive here, and they are not the same thing:
//   · a row-level-security policy hides the row, so the update changes nothing and raises nothing
//   · app.tasks_before raises 42501 with a sentence written for the studio, which we pass straight through

const SIGNED_OUT = "You're signed out. Sign in again.";
const ADD_REFUSED = 'Only the Project Architect or an admin can add a task to this project.';
const CHANGE_REFUSED = 'Only the Project Architect, an admin, or the person a task is assigned to can change it.';
const DELETE_REFUSED = 'Only the Project Architect or an admin can delete a task.';
const GONE = 'That task is no longer in the register. Reload the page.';

/** Adds a drawing or an additional task to a package, last in its list. */
export async function addTask(input: TaskInput): Promise<ActionResult<{id: string}>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const last = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('package_id', parsed.data.package_id)
    .order('sort_order', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (last.error) return {ok: false, error: taskSaveErrorMessage(last.error)};

  // `project_id`, `org_id`, `created_by` and `created_at` are all derived by app.tasks_before from the
  // package — sending them would be a claim about where the task lives that the trigger overwrites.
  // The generated Insert type asks for the first two anyway; this cast is that difference and no more.
  const {data, error} = await supabase
    .from('tasks')
    .insert({...parsed.data, sort_order: (last.data?.sort_order ?? 0) + 1} as TablesInsert<'tasks'>)
    .select('id, project_id')
    .single();
  // An insert the policy refuses raises instead of changing nothing, and Postgres' own wording for it
  // ("new row violates row-level security policy") is no use to Lilia. The trigger's assignee-only rule
  // cannot fire here: it only runs on an update.
  if (error) return {ok: false, error: error.code === '42501' ? ADD_REFUSED : taskSaveErrorMessage(error)};

  revalidatePath(`/projects/${data.project_id}`);
  return {ok: true, data: {id: data.id}};
}

/** Changes a task's title, who is doing it, its hours or its due date — the inline edit in the register. */
export async function updateTask(input: TaskUpdateInput): Promise<ActionResult> {
  const parsed = taskUpdateSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const {id, ...changes} = parsed.data;
  const supabase = await createClient();
  const {data, error} = await supabase.from('tasks').update(changes).eq('id', id).select('id, project_id');
  if (error) return {ok: false, error: taskSaveErrorMessage(error)};
  if (data.length === 0) return refused(id, CHANGE_REFUSED);

  revalidatePath(`/projects/${data[0]?.project_id}`);
  return {ok: true, data: null};
}

/**
 * Moves a task along the five statuses. Its own function, like moving a project between tiers: it is
 * the change the studio makes most often, and the only one someone who is merely the assignee may make.
 * `done_at` is stamped by the database clock when the status reaches checked or issued.
 */
export async function setTaskStatus(input: TaskStatusInput): Promise<ActionResult> {
  const parsed = taskStatusSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const {id, status} = parsed.data;
  const supabase = await createClient();
  const {data, error} = await supabase.from('tasks').update({status}).eq('id', id).select('id, project_id');
  if (error) return {ok: false, error: taskSaveErrorMessage(error)};
  if (data.length === 0) return refused(id, CHANGE_REFUSED);

  // A status change moves the drawing on three screens: its register, the person's own week, and the
  // morning brief that counts what went out yesterday.
  revalidatePath(`/projects/${data[0]?.project_id}`);
  revalidatePath('/my-work');
  revalidatePath('/today');
  return {ok: true, data: null};
}

/** Removes a task from the register. A drawing that was issued is history, so this is for mistakes. */
export async function deleteTask(input: TaskDeleteInput): Promise<ActionResult> {
  const parsed = taskDeleteSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  const {data, error} = await supabase.from('tasks').delete().eq('id', parsed.data.id).select('id, project_id');
  if (error) return {ok: false, error: taskSaveErrorMessage(error)};
  if (data.length === 0) return refused(parsed.data.id, DELETE_REFUSED);

  revalidatePath(`/projects/${data[0]?.project_id}`);
  return {ok: true, data: null};
}

/** Nothing changed: either the policy hid the row from this person, or the task is already gone. */
async function refused(id: string, message: string): Promise<ActionResult<never>> {
  const supabase = await createClient();
  const {data} = await supabase.from('tasks').select('id').eq('id', id).maybeSingle();
  return {ok: false, error: data ? message : GONE};
}
