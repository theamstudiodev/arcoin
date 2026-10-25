import {ensurePassword} from './auth';
import {AM_STUDIO, sql} from './db';

/**
 * The rows the suite owns: the two accounts it signs in as, and the sweep that removes everything
 * earlier runs left behind.
 *
 * The suite used to sign in as Athiq and Bushra, which meant every run rewrote two of the studio's
 * seeded passwords to TEST_PASSWORD — so whoever had been opening the app locally found their own
 * sign-in broken by a test run. These two accounts exist instead. Nothing here touches the seven
 * seeded teammates, and nothing in the suite signs in as one.
 */

/** Signs in as an admin: the Settings fields, the board's controls, the whole of People. */
export const E2E_ADMIN = 'e2e-admin@amstudio.test';
export const E2E_ADMIN_NAME = 'Ar. E2E Admin';

/** Signs in as staff: everything an admin sees, with nothing to change it by. */
export const E2E_STAFF = 'e2e-staff@amstudio.test';
export const E2E_STAFF_NAME = 'Ar. E2E Staff';

const ACCOUNTS = [
  {email: E2E_ADMIN, name: E2E_ADMIN_NAME, role: 'director'},
  {email: E2E_STAFF, name: E2E_STAFF_NAME, role: 'junior'},
] as const;

// Last on People, so the studio's real team still reads from the top of the list.
const SORT_ORDER = 900;

const KEPT = ACCOUNTS.map((account) => `'${account.email}'`).join(', ');

/**
 * Puts both accounts on the team list and gives each a password, creating nothing that already
 * exists. The first run after `supabase db reset` walks each one through the real six-digit code
 * flow; every run after that finds the password already works and sends no email at all.
 *
 * The person row has to exist first: a trigger on auth.users refuses an account for an address that
 * is not on the team list.
 */
export async function ensureTestAccounts(): Promise<void> {
  for (const {email, name, role} of ACCOUNTS) {
    sql(`insert into public.people (org_id, email, name, role, sort_order)
         select '${AM_STUDIO}', '${email}', '${name}', '${role}', ${SORT_ORDER}
         where not exists (select 1 from public.people where lower(email) = '${email}')`);
    await ensurePassword(email);
  }
}

/**
 * Removes the people, projects, packages, tasks and holidays the specs create, and the accounts
 * behind them — but never the two logins above, which are kept so the next run needs no email.
 *
 * Children before parents: a task belongs to a package, a package to a project. Deleting the
 * project first would work through its cascades, but naming the order keeps it true if a cascade
 * ever changes. The auth users go with their people: the trigger that links an account to a person
 * fires only when the auth user is created, so a left-behind account can never be re-linked.
 *
 * Run from both global setup and global teardown. Teardown is where it belongs — a run should leave
 * the database as it found it — but teardown does not run if the suite is killed, so setup sweeps
 * too rather than trusting the previous run to have finished.
 */
export function removeRowsFromEarlierRuns(): void {
  sql("delete from public.tasks where title like 'E2E %'");
  sql("delete from public.packages where project_id in (select id from public.projects where name like 'E2E %')");
  sql("delete from public.projects where name like 'E2E %'");
  sql("delete from public.holidays where label like 'E2E %'");
  // Some tests sign up with capitals in the address, so both deletes compare in lower case.
  sql(`delete from public.people where lower(email) like 'e2e-%@amstudio.test' and lower(email) not in (${KEPT})`);
  sql(`delete from auth.users where lower(email) like 'e2e-%@amstudio.test' and lower(email) not in (${KEPT})`);
}
