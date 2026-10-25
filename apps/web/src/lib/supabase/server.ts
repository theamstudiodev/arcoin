import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import type {Database} from '@/lib/database.types';
import {supabaseEnv, withSessionLength} from '@/lib/supabase/config';

/** Supabase for Server Components and server actions, signed in as the visitor. Create one per request. */
export async function createClient() {
  const {url, key} = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const {name, value, options} of cookiesToSet) cookieStore.set(name, value, withSessionLength(options));
        } catch {
          // Server Components can't set cookies; the proxy has already refreshed this request's session.
        }
      },
    },
  });
}
