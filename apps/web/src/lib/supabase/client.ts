import {createBrowserClient} from '@supabase/ssr';
import type {Database} from '@/lib/database.types';
import {SESSION_COOKIE, supabaseEnv} from '@/lib/supabase/config';

/** Supabase in the browser, signed in as the visitor. Row-level security applies to everything it does. */
export function createClient() {
  const {url, key} = supabaseEnv();
  return createBrowserClient<Database>(url, key, {cookieOptions: SESSION_COOKIE});
}
