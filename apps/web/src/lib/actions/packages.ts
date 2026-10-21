'use server';

import {revalidatePath} from 'next/cache';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import type {TablesInsert} from '@/lib/database.types';
import {getViewer} from '@/lib/me';
import {packageSaveErrorMessage} from '@/lib/package-rules';
import {type PackageInput, packageSchema} from '@/lib/schemas/package';
import {createClient} from '@/lib/supabase/server';

// Admins and the project's own Project Architect manage packages. The database enforces that; this
// function puts its refusals in plain words.

const SIGNED_OUT = "You're signed out. Sign in again.";

/**
 * Adds one of the nine packages to a project, the first time the studio plans it. Nothing creates all
 * nine upfront: a project in P02 would otherwise show seven empty cards for work nobody has started.
 */
export async function addPackage(input: PackageInput): Promise<ActionResult<{id: string}>> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const {me} = await getViewer();
  if (!me) return {ok: false, error: SIGNED_OUT};

  const supabase = await createClient();
  // `org_id` is copied from the project by app.packages_before, so sending one here would only be a
  // guess the trigger overwrites. The generated Insert type asks for it anyway; this cast is that
  // difference and nothing else.
  const {data, error} = await supabase
    .from('packages')
    .insert(parsed.data as TablesInsert<'packages'>)
    .select('id')
    .single();
  if (error) {
    // `unique (project_id, code)` is how "created on demand" stays honest when two people add at once.
    const message = packageSaveErrorMessage(error, parsed.data.code);
    return {ok: false, error: message, fieldErrors: {code: message}};
  }

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return {ok: true, data: {id: data.id}};
}
