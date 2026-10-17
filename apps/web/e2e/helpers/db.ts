import {execFileSync} from 'node:child_process';
import {assertLocal} from './local';

const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export const AM_STUDIO = '00000000-0000-4000-a000-000000000001';

/** Runs SQL as the database owner on the LOCAL database. Test setup and cleanup only. */
export function sql(query: string): string {
  const url = process.env.SUPABASE_DB_URL || LOCAL_DB_URL;
  assertLocal(url);
  return execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-q', '-X', '-At', '-c', query], {encoding: 'utf8'}).trim();
}

/** Puts someone on the team list, as an admin would. Test emails start with e2e- so setup can remove them. */
export function addTeamMember(email: string, name: string, role = 'junior'): void {
  sql(`insert into public.people (org_id, email, name, role) values ('${AM_STUDIO}', '${email}', '${name}', '${role}')`);
}
