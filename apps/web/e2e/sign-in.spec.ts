import {expect, type Page, test} from '@playwright/test';
import {signInThroughUi, TEST_PASSWORD} from './helpers/auth';
import {addTeamMember} from './helpers/db';
import {mailpitIds, waitForCode} from './helpers/mailpit';

// Next renders its own role="alert" route announcer outside <main>.
const alert = (page: Page) => page.getByRole('main').getByRole('alert');

test('Athiq signs in with his password', async ({page}) => {
  await page.goto('/login');
  // Typed the way a phone keyboard delivers it: a capital and a trailing space.
  await page.getByLabel('Email').fill(' Athiq@AMStudio.test ');
  await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);

  // The session lasts 90 days, so people on phones rarely sign in again.
  const session = (await page.context().cookies()).find((cookie) => /^sb-.+-auth-token(\.0)?$/.test(cookie.name));
  const daysLeft = ((session?.expires ?? 0) - Date.now() / 1000) / 86_400;
  expect(daysLeft).toBeGreaterThan(89);
  expect(daysLeft).toBeLessThanOrEqual(90);

  await expect(page.getByRole('banner')).toContainText('Ar. Athiq');
});

test('signing out ends the session on this device', async ({page}) => {
  await signInThroughUi(page, 'athiq@amstudio.test');
  // Signed in, the sign-in screen sends him straight back to work.
  await page.goto('/login');
  await expect(page).toHaveURL(/\/people$/);

  await page.getByRole('banner').getByRole('button', {name: 'Sign out'}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/people');
  await expect(page).toHaveURL(/\/login$/);
});

test('a wrong password is refused plainly', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('athiq@amstudio.test');
  await page.getByLabel('Password', {exact: true}).fill('not-his-password');
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();

  await expect(alert(page)).toHaveText("That email and password don't match. Try again, or set a new password.");
  await expect(page).toHaveURL(/\/login$/);
});

test('a new team member sets a password with an emailed code, then signs in with it', async ({page}) => {
  const email = `e2e-new-${Date.now()}@amstudio.test`;
  addTeamMember(email, 'E2E Newcomer');

  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  const before = await mailpitIds(email);
  await page.getByRole('button', {name: 'Send code'}).click();
  const {code, subject} = await waitForCode(email, before);
  expect(subject).toBe('Set your Arcoin password');

  await page.getByLabel('Code').fill('000000');
  await page.getByLabel('New password').fill('first-drawings-26');
  await page.getByRole('button', {name: 'Set password', exact: true}).click();
  await expect(alert(page)).toContainText('That code is wrong or has expired');
  await expect(page.getByLabel('Code')).toHaveValue('');

  await page.getByLabel('Code').fill(code);
  await page.getByRole('button', {name: 'Set password', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);

  // On another device, the password alone signs them in.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', {exact: true}).fill('first-drawings-26');
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);
});

test('a stranger is refused', async ({page}) => {
  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill('stranger@example.com');
  await page.getByRole('button', {name: 'Send code'}).click();

  await expect(alert(page)).toHaveText("This email isn't on the AM Studio team list. Ask Athiq to add you.");
  await expect(page.getByLabel('Code')).toHaveCount(0);
});

test('the blueprint drifts, and stands still for reduced motion', async ({page}) => {
  await page.goto('/login');
  await expect(page.locator('.bg-blueprint')).toHaveCSS('animation-name', 'blueprint-drift');

  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.reload();
  await expect(page.locator('.bg-blueprint')).toHaveCSS('animation-name', 'none');
});
