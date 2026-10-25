import type {CookieOptions} from '@supabase/ssr';

/** The project URL and browser-safe key. Read when used, not on import: CI builds without .env.local. */
export function supabaseEnv(): {url: string; key: string} {
  // Spelled out in full so Next inlines them into the browser bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase URL or publishable key is missing. Copy .env.example to apps/web/.env.local and fill it from `supabase status`.',
    );
  }
  return {url, key};
}

/**
 * 90 days, renewed whenever the session refreshes: people re-enter a code only after three months away.
 * Supabase refresh tokens never expire, so the cookie's lifetime is the session length.
 */
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

/**
 * @supabase/ssr writes its session cookies for 400 days and ignores `cookieOptions.maxAge`, so every cookie
 * handler passes the library's options through this. A max-age of 0 is a deletion and stays one.
 */
export function withSessionLength(options: CookieOptions): CookieOptions {
  return options.maxAge === 0 ? options : {...options, maxAge: SESSION_MAX_AGE};
}
