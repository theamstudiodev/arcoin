import {ensureTestAccounts, removeRowsFromEarlierRuns} from './helpers/accounts';
import {MAILPIT_API, supabaseEnv} from './helpers/local';

// Runs once before the suite: local stack only, and it must be up.
export default async function globalSetup(): Promise<void> {
  const {url, key} = supabaseEnv();
  await mustAnswer(`${url}/auth/v1/health`, {apikey: key});
  await mustAnswer(`${MAILPIT_API}/messages?limit=1`);

  // Teardown does this too. Sweeping here as well costs nothing and covers the run that was killed.
  removeRowsFromEarlierRuns();
  await ensureTestAccounts();
}

async function mustAnswer(url: string, headers: Record<string, string> = {}): Promise<void> {
  const response = await fetch(url, {headers}).catch(() => null);
  if (!response?.ok) {
    throw new Error(`Start the local stack first: supabase start (no answer from ${url})`);
  }
}
