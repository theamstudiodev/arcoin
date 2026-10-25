import {cache} from 'react';
import type {Tables} from '@/lib/database.types';
import {createClient} from '@/lib/supabase/server';

export type Me = Pick<Tables<'people'>, 'id' | 'org_id' | 'name' | 'role'>;

/**
 * Who is looking, once per request: whether they're signed in, and their People row. `me` is null for someone signed
 * in who is no longer on the team — the database hides inactive people, even from themselves.
 */
export const getViewer = cache(async (): Promise<{signedIn: boolean; me: Me | null}> => {
  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return {signedIn: false, me: null};

  const {data: me, error} = await supabase
    .from('people')
    .select('id, org_id, name, role')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't look up who is signed in: ${error.message}`);
  return {signedIn: true, me};
});
