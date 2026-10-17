import {createServerClient} from '@supabase/ssr';
import {type NextRequest, NextResponse} from 'next/server';
import type {Database} from '@/lib/database.types';
import {SESSION_COOKIE, supabaseEnv} from '@/lib/supabase/config';

/** Pages a signed-out visitor may open. */
export const PUBLIC_PATHS = ['/login'];

/**
 * Refreshes the visitor's session on every request and sends signed-out visitors to /login.
 *
 * It never sends a signed-in visitor away from /login: the login page decides that from the person row,
 * so someone deactivated mid-session isn't bounced back and forth between the two.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const {url, key} = supabaseEnv();
  let response = NextResponse.next({request});
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(url, key, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        // The page rendering this request reads the refreshed tokens; the browser stores them.
        for (const {name, value} of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({request});
        for (const {name, value, options} of cookiesToSet) response.cookies.set(name, value, options);
        // A response carrying someone's session must never be cached and served to someone else.
        cacheHeaders = headers;
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  // Nothing may run between creating the client and this call: it is what refreshes the session.
  const {data} = await supabase.auth.getClaims();

  if (!data?.claims && !PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    for (const [name, value] of Object.entries(cacheHeaders)) redirect.headers.set(name, value);
    return redirect;
  }
  return response;
}
