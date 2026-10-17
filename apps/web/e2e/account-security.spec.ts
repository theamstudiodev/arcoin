import {expect, type Page, test} from '@playwright/test';
import {
  askForCodeThroughUi,
  ensurePassword,
  publicClient,
  setPasswordThroughUi,
  setPasswordWithCode,
  signInWithPassword,
} from './helpers/auth';
import {AM_STUDIO, addTeamMember, sql} from './helpers/db';
import {mailpitIds, waitForCode} from './helpers/mailpit';

// Someone who knows a teammate's work email, calling Supabase directly with the public key every browser gets.
// Whatever they try, only the code emailed to the teammate signs anyone in to that account.
const ATTACKER_PASSWORD = 'someone-elses-password';

// Next renders its own role="alert" route announcer outside <main>.
const alert = (page: Page) => page.getByRole('main').getByRole('alert');

/** A teammate on the team list who hasn't signed in yet. */
function newTeammate(label: string): string {
  const email = `e2e-${label}-${Date.now()}@amstudio.test`;
  addTeamMember(email, `E2E ${label}`);
  return email;
}

/** The one-time codes Supabase is waiting for on this account, e.g. "confirmation_token". */
function pendingCodes(email: string): string {
  return sql(`select coalesce(string_agg(t.token_type::text, ',' order by t.token_type::text), '')
                from auth.one_time_tokens t join auth.users u on u.id = t.user_id
               where lower(u.email) = '${email}'`);
}

/** Supabase sends one email per address per second locally (a minute when hosted). */
const waitOutEmailLimit = (page: Page) => page.waitForTimeout(1_100);

test("signing up with a teammate's email signs no one in", async () => {
  const email = newTeammate('claim');
  const attacker = publicClient();

  const {data} = await attacker.auth.signUp({email, password: ATTACKER_PASSWORD});
  expect(data.session).toBeNull();

  const {error} = await attacker.auth.signInWithPassword({email, password: ATTACKER_PASSWORD});
  expect(error?.code).toBe('email_not_confirmed');
});

test('a sign-up without the code reads no team records', async () => {
  const email = newTeammate('peek');
  const attacker = publicClient();
  await attacker.auth.signUp({email, password: ATTACKER_PASSWORD});

  for (const table of ['people', 'projects', 'settings'] as const) {
    const {data, error} = await attacker.from(table).select('org_id');
    expect(error?.code, table).toBe('42501');
    expect(data, table).toBeNull();
  }
});

test("signing up first doesn't stop the real person joining", async ({page}) => {
  const email = newTeammate('first');
  const before = await mailpitIds(email);
  // Capitals in the address, as if it might slip past the team list as a second account.
  const shouted = email.replace('e2e-', 'E2E-').replace('@amstudio', '@AMStudio');
  await publicClient().auth.signUp({email: shouted, password: ATTACKER_PASSWORD});
  await waitForCode(email, before); // Supabase emailed the teammate, never the attacker.

  await waitOutEmailLimit(page);
  await setPasswordThroughUi(page, email, 'my-own-password-1');

  // One account, and it is the teammate's People row.
  expect(sql(`select count(*) from auth.users where lower(email) = '${email}'`)).toBe('1');
  expect(
    sql(`select p.auth_user_id = u.id from public.people p join auth.users u on lower(u.email) = p.email
          where p.email = '${email}'`),
  ).toBe('t');
});

test("the real person's password replaces the attacker's", async ({page}) => {
  const email = newTeammate('replace');
  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});

  await waitOutEmailLimit(page);
  await setPasswordThroughUi(page, email, 'my-own-password-2');

  const attacker = publicClient();
  expect((await attacker.auth.signInWithPassword({email, password: ATTACKER_PASSWORD})).error?.code).toBe(
    'invalid_credentials',
  );

  // Signing up again once they've joined changes nothing.
  const again = await attacker.auth.signUp({email, password: ATTACKER_PASSWORD});
  expect(again.data.session).toBeNull();
  await signInWithPassword(email, 'my-own-password-2');
  expect((await attacker.auth.signInWithPassword({email, password: ATTACKER_PASSWORD})).error?.code).toBe(
    'invalid_credentials',
  );
});

test('one code step works for a new and an existing account', async ({page}) => {
  const email = newTeammate('codes');

  // A first password: the account is new, so Supabase sends a sign-up code (the Confirm signup email).
  const first = await askForCodeThroughUi(page, email);
  expect(pendingCodes(email)).toBe('confirmation_token');
  await setPasswordWithCode(page, first, 'first-password-3');

  // A forgotten password: the account exists, so Supabase sends a sign-in code (the Magic link email).
  // The app checks both with the same verifyOtp({type: 'email'}).
  await page.context().clearCookies();
  const second = await askForCodeThroughUi(page, email);
  expect(pendingCodes(email)).toBe('recovery_token');
  await setPasswordWithCode(page, second, 'second-password-3');
});

test('an inactive person reads no team records', async () => {
  const email = newTeammate('leaver');
  await ensurePassword(email, 'leaver-password-4');
  const leaver = await signInWithPassword(email, 'leaver-password-4');

  expect((await leaver.from('people').select('id')).data?.length).toBeGreaterThanOrEqual(7);
  expect((await leaver.from('projects').select('id')).data?.length).toBeGreaterThan(0);
  expect((await leaver.from('settings').select('org_id')).data).toHaveLength(1);

  sql(`update public.people set active = false where email = '${email}'`);

  // Still holding a valid session, they now read nothing and change nothing.
  expect((await leaver.from('people').select('id')).data).toEqual([]);
  expect((await leaver.from('projects').select('id')).data).toEqual([]);
  expect((await leaver.from('settings').select('org_id')).data).toEqual([]);
  const insert = await leaver
    .from('people')
    .insert({org_id: AM_STUDIO, email: `e2e-sneak-${Date.now()}@amstudio.test`, name: 'Sneaky', role: 'junior'});
  expect(insert.error?.code).toBe('42501');
});

test("an inactive person can't start setting a password", async ({page}) => {
  const email = newTeammate('inactive');
  sql(`update public.people set active = false where email = '${email}'`);

  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', {name: 'Send code'}).click();

  await expect(alert(page)).toHaveText("This email isn't on the AM Studio team list. Ask Athiq to add you.");
  await expect(page.getByLabel('Code')).toHaveCount(0);
});
