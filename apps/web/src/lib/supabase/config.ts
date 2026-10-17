import type {CookieOptionsWithName} from '@supabase/ssr';

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
 * Supabase refresh tokens themselves never expire, so this cookie is the session length.
 */
export const SESSION_COOKIE: CookieOptionsWithName = {maxAge: 60 * 60 * 24 * 90};
