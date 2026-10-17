import {expect, test} from '@playwright/test';
import {mailpitIds, waitForCode} from './helpers/mailpit';

test('Athiq signs in with the emailed code', async ({page}) => {
  await page.goto('/login');
  const before = await mailpitIds('athiq@amstudio.test');

  // Typed the way a phone keyboard delivers it: a capital and a trailing space.
  await page.getByLabel('Email').fill(' Athiq@AMStudio.test ');
  await page.getByRole('button', {name: 'Send code'}).click();

  await page.getByLabel('Code').fill('000000');
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('That code is wrong or has expired');
  await expect(page.getByLabel('Code')).toHaveValue('');

  const {code} = await waitForCode('athiq@amstudio.test', before);
  await page.getByLabel('Code').fill(code);
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/people$/);

  // The session lasts 90 days, so people on phones rarely sign in again.
  const session = (await page.context().cookies()).find((cookie) => /^sb-.+-auth-token(\.0)?$/.test(cookie.name));
  const daysLeft = ((session?.expires ?? 0) - Date.now() / 1000) / 86_400;
  expect(daysLeft).toBeGreaterThan(89);
  expect(daysLeft).toBeLessThanOrEqual(90);
});

test('a stranger is refused', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('stranger@example.com');
  await page.getByRole('button', {name: 'Send code'}).click();

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    "This email isn't on the AM Studio team list. Ask Athiq to add you.",
  );
  await expect(page.getByLabel('Code')).toHaveCount(0);
});
