import {expect, test} from '@playwright/test';

test('a signed-out visitor is sent to /login', async ({page}) => {
  await page.goto('/people');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('Arcoin');
});
