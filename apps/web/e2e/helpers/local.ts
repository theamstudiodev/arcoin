// The e2e suite signs people in, creates auth users and deletes test rows. It must never touch staging.

export const MAILPIT_API = 'http://127.0.0.1:54324/api/v1';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function assertLocal(url: string): void {
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error('E2E tests create users and people — they run only against local Supabase.');
  }
}

export function supabaseEnv(): {url: string; key: string} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase URL or publishable key is missing. Copy .env.example to apps/web/.env.local and fill it from `supabase status`.',
    );
  }
  assertLocal(url);
  return {url, key};
}
