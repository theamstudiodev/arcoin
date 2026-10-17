import {expect, type Page, test} from '@playwright/test';
import {setPasswordThroughUi, signInWithPassword} from './helpers/auth';
import {addTeamMember} from './helpers/db';

/** Signs in on "another device", resets the password in the app, and reports whether that device can carry on. */
async function otherDeviceAfterReset(page: Page, firstPassword: string, newPassword: string) {
  const email = `e2e-reset-${Date.now()}@amstudio.test`;
  addTeamMember(email, 'E2E Resetter');
  await setPasswordThroughUi(page, email, firstPassword);

  // A phone left signed in somewhere.
  const otherDevice = await signInWithPassword(email, firstPassword);

  // Forgot the password: set it again in the app.
  await page.context().clearCookies();
  await setPasswordThroughUi(page, email, newPassword);

  return otherDevice.auth.refreshSession();
}

test('setting a new password signs out every other device', async ({page}) => {
  const {error} = await otherDeviceAfterReset(page, 'first-password-1', 'second-password-2');
  expect(error?.message).toMatch(/refresh token/i);
});

test('setting the same password again still signs out every other device', async ({page}) => {
  const {error} = await otherDeviceAfterReset(page, 'only-password-1', 'only-password-1');
  expect(error?.message).toMatch(/refresh token/i);
});
