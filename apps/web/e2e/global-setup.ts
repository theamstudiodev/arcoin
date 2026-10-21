import {ensurePassword} from './helpers/auth';
import {sql} from './helpers/db';
import {MAILPIT_API, supabaseEnv} from './helpers/local';

/** Seeded team members the tests sign in as. */
const TEST_LOGINS = ['athiq@amstudio.test', 'bushra@amstudio.test'];

// Runs once before the suite: local stack only, and it must be up.
export default async function globalSetup(): Promise<void> {
  const {url, key} = supabaseEnv();
  await mustAnswer(`${url}/auth/v1/health`, {apikey: key});
  await mustAnswer(`${MAILPIT_API}/messages?limit=1`);

  // People and accounts earlier runs created. Their auth users go too: the trigger that links an account to a
  // person fires only when the auth user is created. Some tests sign up with capitals in the address.
  sql("delete from public.projects where name like 'E2E %'");
  sql("delete from public.people where lower(email) like 'e2e-%@amstudio.test'");
  sql("delete from auth.users where lower(email) like 'e2e-%@amstudio.test'");

  for (const email of TEST_LOGINS) await ensurePassword(email);
}

async function mustAnswer(url: string, headers: Record<string, string> = {}): Promise<void> {
  const response = await fetch(url, {headers}).catch(() => null);
  if (!response?.ok) {
    throw new Error(`Start the local stack first: supabase start (no answer from ${url})`);
  }
}
