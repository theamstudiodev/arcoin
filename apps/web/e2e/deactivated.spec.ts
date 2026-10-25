import {expect, test} from '@playwright/test';
import {setPasswordThroughUi} from './helpers/auth';
import {addTeamMember, sql} from './helpers/db';

test('someone made inactive mid-session is sent back to sign-in', async ({page}) => {
  const email = `e2e-leaving-${Date.now()}@amstudio.test`;
  addTeamMember(email, 'E2E Leaving');
  await setPasswordThroughUi(page, email);
  await expect(page.getByRole('banner')).toContainText('E2E Leaving');

  sql(`update public.people set active = false where email = '${email}'`);

  // Their session still works, but they're no longer on the team: no loop between the two screens.
  await page.goto('/people');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    "This email isn't on the AM Studio team list. Ask Athiq to add you.",
  );
});
