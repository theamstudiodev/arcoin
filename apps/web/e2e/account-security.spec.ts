import {expect, type Page, test} from '@playwright/test';
import {
  askForCodeThroughUi,
  ensurePassword,
  publicClient,
  setPasswordThroughUi,
  setPasswordWithCode,
  signInWithPassword,
} from './helpers/auth';
import {E2E_ADMIN, E2E_STAFF} from './helpers/accounts';
import {AM_STUDIO, addTeamMember, sql} from './helpers/db';
import {mailpitIds, waitForCode} from './helpers/mailpit';

// Someone who knows a teammate's work email, calling Supabase directly with the public key every browser gets.
// They get no session and no records until the teammate types the code emailed to them — and no password they choose
// is ever kept, because an account holds none until its email is verified (migration
// 20261018050438_password_needs_verified_email).
const ATTACKER_PASSWORD = 'someone-elses-password';

// Next renders its own role="alert" route announcer outside <main>.
const alert = (page: Page) => page.getByRole('main').getByRole('alert');

/** A teammate on the team list who hasn't signed in yet. */
function newTeammate(label: string): string {
  const email = `e2e-${label}-${Date.now()}@amstudio.test`;
  addTeamMember(email, `E2E ${label}`);
  return email;
}

/** Whether Supabase is holding a password for this account at all. */
function hasStoredPassword(email: string): boolean {
  return sql(`select encrypted_password is not null from auth.users where lower(email) = '${email}'`) === 't';
}

/** Proves the address with the code Supabase emailed, and stops there — no password saved yet. */
async function verifyOnly(email: string, code: string) {
  const person = publicClient();
  const {error} = await person.auth.verifyOtp({email, token: code, type: 'email'});
  expect(error).toBeNull();
  return person;
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

  // invalid_credentials, not email_not_confirmed: the password was never kept at all. That also stops this
  // being a way to find out which addresses are on the team list.
  const {error} = await attacker.auth.signInWithPassword({email, password: ATTACKER_PASSWORD});
  expect(error?.code).toBe('invalid_credentials');
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

test("an inactive person who never joined can't create an account", async ({page}) => {
  const email = newTeammate('inactive');
  sql(`update public.people set active = false where email = '${email}'`);

  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', {name: 'Send code'}).click();

  await expect(alert(page)).toHaveText("This email isn't on the AM Studio team list. Ask Athiq to add you.");
  await expect(page.getByLabel('Code')).toHaveCount(0);
});

test('asking for a code again within the minute still opens the code step', async ({page}) => {
  const email = newTeammate('again');
  await ensurePassword(email, 'again-password-6');
  // A code went out moments ago: they asked on another device, or someone else asked for them.
  const before = await mailpitIds(email);
  await publicClient().auth.signInWithOtp({email, options: {shouldCreateUser: true}});
  const {code} = await waitForCode(email, before);
  // Hosted Supabase sends one email per address per minute (locally, per second). Hold that window open.
  sql(`update auth.users set recovery_sent_at = now() + interval '1 minute' where email = '${email}'`);

  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', {name: 'Send code'}).click();
  const recent = 'A code was sent to this email less than a minute ago. Use the newest one.';
  await expect(page.getByRole('main').getByRole('status')).toHaveText(recent);

  // Asking again inside the window says the same, rather than refusing.
  await page.getByRole('button', {name: 'Send a new code'}).click();
  await expect(page.getByRole('main').getByRole('status')).toHaveText(recent);
  await expect(alert(page)).toHaveCount(0);

  await setPasswordWithCode(page, code, 'again-password-7');
});

// A teammate's email is not a secret: it is on their drawings and in every client's inbox. These four prove that
// knowing it buys nothing, because Supabase holds no password for an address until someone proves they receive it.

test('an account holds no password until its email is verified', async () => {
  const email = newTeammate('unverified');

  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});

  expect(hasStoredPassword(email), 'a password was kept on an address nobody has proved they receive').toBe(false);
});

test('nobody else gets a session in the gap between the code and the new password', async () => {
  const email = newTeammate('gap');
  const before = await mailpitIds(email);
  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});

  // The code goes to the teammate, who types it in. Their password is not saved for another moment yet.
  const {code} = await waitForCode(email, before);
  const person = await verifyOnly(email, code);

  const inTheGap = await publicClient().auth.signInWithPassword({email, password: ATTACKER_PASSWORD});
  expect(inTheGap.data.session, 'a password chosen before the email was verified opened a session').toBeNull();
  expect(inTheGap.error?.code).toBe('invalid_credentials');

  // The teammate still finishes normally from that same verified session.
  expect((await person.auth.updateUser({password: 'my-own-password-9'})).error).toBeNull();
  await signInWithPassword(email, 'my-own-password-9');
});

test("a failed password save doesn't leave an earlier password working", async () => {
  const email = newTeammate('failed');
  const before = await mailpitIds(email);
  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});

  const {code} = await waitForCode(email, before);
  const person = await verifyOnly(email, code);

  // Their save fails — a short password here, a dropped connection in the studio. The gap never closes.
  expect((await person.auth.updateUser({password: 'short'})).error?.code).toBe('weak_password');

  const later = await publicClient().auth.signInWithPassword({email, password: ATTACKER_PASSWORD});
  expect(later.data.session, 'an unfinished sign-up left someone else holding a working password').toBeNull();
});

test('a burst of sign-in attempts around the moment of verification gets nobody in', async () => {
  const email = newTeammate('race');
  const before = await mailpitIds(email);
  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});
  const {code} = await waitForCode(email, before);

  // The teammate's verification and five password attempts leave at the same instant.
  const person = publicClient();
  const [verified, ...attempts] = await Promise.all([
    person.auth.verifyOtp({email, token: code, type: 'email'}),
    ...Array.from({length: 5}, () => publicClient().auth.signInWithPassword({email, password: ATTACKER_PASSWORD})),
  ]);
  expect(verified.error).toBeNull();
  for (const [i, attempt] of attempts.entries()) {
    expect(attempt.data.session, `racing attempt ${i + 1} got a session`).toBeNull();
  }
  expect((await publicClient().auth.signInWithPassword({email, password: ATTACKER_PASSWORD})).data.session).toBeNull();

  // And the teammate still finishes from that same verified session.
  expect((await person.auth.updateUser({password: 'my-own-password-11'})).error).toBeNull();
  await signInWithPassword(email, 'my-own-password-11');
});

test("an existing team member's password is never cleared", async () => {
  for (const email of [E2E_ADMIN, E2E_STAFF]) {
    expect(hasStoredPassword(email), email).toBe(true);
  }
  // Supabase writes to these rows on every sign-in and token refresh. None of that may touch the password.
  sql(`update auth.users set last_sign_in_at = now(), updated_at = now() where lower(email) = '${E2E_ADMIN}'`);
  expect(hasStoredPassword(E2E_ADMIN)).toBe(true);
  await signInWithPassword(E2E_ADMIN);
});

test('a password reset works even after an earlier save failed', async ({page}) => {
  const email = newTeammate('retry');
  const before = await mailpitIds(email);
  await publicClient().auth.signUp({email, password: ATTACKER_PASSWORD});
  const {code} = await waitForCode(email, before);
  const person = await verifyOnly(email, code);

  // Their first attempt fails, leaving a verified account holding no password at all.
  expect((await person.auth.updateUser({password: 'short'})).error?.code).toBe('weak_password');
  expect(hasStoredPassword(email)).toBe(false);

  // They start again from the login screen — the account is not stuck — and nobody else got in meanwhile.
  await waitOutEmailLimit(page);
  await setPasswordThroughUi(page, email, 'second-try-password-12');
  await signInWithPassword(email, 'second-try-password-12');
  expect((await publicClient().auth.signInWithPassword({email, password: ATTACKER_PASSWORD})).data.session).toBeNull();
});

test('a forgotten password is replaced, and the old one stops working', async ({page}) => {
  const email = newTeammate('forgot');
  await ensurePassword(email, 'first-password-10');
  expect(hasStoredPassword(email)).toBe(true);

  await waitOutEmailLimit(page);
  await setPasswordThroughUi(page, email, 'second-password-10');

  await signInWithPassword(email, 'second-password-10');
  expect((await publicClient().auth.signInWithPassword({email, password: 'first-password-10'})).error?.code).toBe(
    'invalid_credentials',
  );
});

test('a reset asked for straight from Supabase still sends a code, never a link', async () => {
  const email = newTeammate('recover');
  await ensurePassword(email, 'recover-password-8');

  const before = await mailpitIds(email);
  await publicClient().auth.resetPasswordForEmail(email);
  const {code, subject} = await waitForCode(email, before);
  expect(subject).toBe('Set your Arcoin password');

  // The same check the app's code step makes.
  const {error} = await publicClient().auth.verifyOtp({email, token: code, type: 'email'});
  expect(error).toBeNull();
});
