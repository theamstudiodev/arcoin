import {createBrowserClient, parseCookieHeader, serializeCookieHeader} from '@supabase/ssr';
import type {Database} from '@/lib/database.types';
import {supabaseEnv, withSessionLength} from '@/lib/supabase/config';

/** Supabase in the browser, signed in as the visitor. Row-level security applies to everything it does. */
export function createClient() {
  const {url, key} = supabaseEnv();
  return createBrowserClient<Database>(url, key, {
    // The library's own document.cookie handling, but with the 90-day session length.
    cookies: {
      getAll: () => parseCookieHeader(document.cookie).map(({name, value}) => ({name, value: value ?? ''})),
      setAll(cookiesToSet) {
        for (const {name, value, options} of cookiesToSet) {
          document.cookie = serializeCookieHeader(name, value, withSessionLength(options));
        }
      },
    },
  });
}
