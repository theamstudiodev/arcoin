import {expect, type Page} from '@playwright/test';
import {mailpitIds, waitForCode} from './mailpit';

/** Signs in through the login screen with the emailed code, and waits for the People screen. */
export async function signInThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  const before = await mailpitIds(email);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', {name: 'Send code'}).click();
  const {code} = await waitForCode(email, before);
  await page.getByLabel('Code').fill(code);
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/people$/);
}
