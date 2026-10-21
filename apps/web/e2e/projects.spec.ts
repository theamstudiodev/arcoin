import {expect, type Page, test} from '@playwright/test';
import {signInThroughUi, signInWithPassword} from './helpers/auth';
import {AM_STUDIO, sql} from './helpers/db';

// The seeded portfolio: four in Development, one waiting to start, one waiting on the client.
const DEVELOPMENT = ['Mangala Residence', 'Kadri Residence', 'Madikeri Campus Block', 'Munnar Resort'] as const;

/** A tier's column, found by its heading, so cards from another tier can't satisfy an assertion. */
const tier = (page: Page, name: string) =>
  page.locator('section').filter({has: page.getByRole('heading', {name, level: 2})});

const card = (page: Page, name: string) => page.getByRole('listitem').filter({hasText: name});

async function openBoard(page: Page, email: string): Promise<void> {
  await signInThroughUi(page, email);
  await page.goto('/projects');
  await expect(page.getByRole('heading', {name: 'Projects', level: 1})).toBeVisible();
}

test('Athiq sees the four tiers, each project under the right one, in priority order', async ({page}) => {
  await openBoard(page, 'athiq@amstudio.test');

  for (const name of ['Development', 'Ready to Release', 'Response Awaited', 'Dormant']) {
    await expect(page.getByRole('heading', {name, level: 2})).toBeVisible();
  }

  // Priority 1 first, 4 last — the order the studio works in.
  const development = tier(page, 'Development').getByRole('listitem');
  const inOrder = await development.allTextContents();
  expect(inOrder).toHaveLength(DEVELOPMENT.length);
  DEVELOPMENT.forEach((name, i) => expect(inOrder[i]).toContain(name));

  await expect(tier(page, 'Ready to Release').getByRole('listitem')).toContainText('Kavoor Clinic');
  await expect(tier(page, 'Response Awaited').getByRole('listitem')).toContainText('Bejai Apartments');
  await expect(tier(page, 'Dormant')).toContainText('Nothing here');
});

test('each capped tier shows how full it is, and the waiting rooms show no limit', async ({page}) => {
  await openBoard(page, 'athiq@amstudio.test');

  await expect(tier(page, 'Development')).toContainText('4 / 15');
  await expect(tier(page, 'Development').getByLabel('4 of 15 projects')).toBeVisible();
  await expect(tier(page, 'Ready to Release').getByLabel('1 of 10 project')).toBeVisible();

  // Response Awaited and Dormant hold whatever the client list produces.
  await expect(tier(page, 'Response Awaited').getByLabel('1 project, no limit')).toBeVisible();
  await expect(tier(page, 'Dormant').getByLabel('0 projects, no limit')).toBeVisible();
});

test('a tier over its limit is marked', async ({page}) => {
  try {
    // Four are seeded into Development, so twelve more puts it one over the limit of fifteen.
    sql(
      `insert into public.projects (org_id, name, tier) select '${AM_STUDIO}', 'E2E Over ' || g, 'development' from generate_series(1, 12) g`,
    );
    await openBoard(page, 'athiq@amstudio.test');

    await expect(tier(page, 'Development')).toContainText('16 / 15');
    await expect(tier(page, 'Development')).toContainText('1 over');
  } finally {
    sql("delete from public.projects where name like 'E2E %'");
  }
});

test('Athiq moves a project to another tier from its card', async ({page}) => {
  try {
    await openBoard(page, 'athiq@amstudio.test');
    await card(page, 'Kavoor Clinic').getByLabel('Tier for Kavoor Clinic').selectOption({label: 'Development'});

    await expect(tier(page, 'Development').getByRole('listitem').filter({hasText: 'Kavoor Clinic'})).toBeVisible();
    await expect(tier(page, 'Ready to Release')).toContainText('Nothing here');
    expect(sql("select tier from public.projects where name = 'Kavoor Clinic'")).toBe('development');
  } finally {
    sql("update public.projects set tier = 'ready_to_release' where name = 'Kavoor Clinic'");
  }
});

test('raising a project up the priority list re-orders the board — the Monday change', async ({page}) => {
  try {
    await openBoard(page, 'athiq@amstudio.test');
    const priority = card(page, 'Madikeri Campus Block').getByLabel('Priority for Madikeri Campus Block');

    // Madikeri is third. Make it most urgent and it leads Development.
    await priority.fill('1');
    await priority.press('Enter');

    await expect(tier(page, 'Development').getByRole('listitem').first()).toContainText('Madikeri Campus Block');
    expect(sql("select priority from public.projects where name = 'Madikeri Campus Block'")).toBe('1');

    // The projects nobody touched keep their own order behind it.
    const inOrder = await tier(page, 'Development').getByRole('listitem').allTextContents();
    expect(inOrder[1]).toContain('Mangala Residence');
    expect(inOrder[2]).toContain('Kadri Residence');
  } finally {
    sql("update public.projects set priority = 3 where name = 'Madikeri Campus Block'");
  }
});

test('Athiq adds a project, and it lands in the tier chosen for it', async ({page}) => {
  const name = `E2E Tower ${Date.now()}`;
  try {
    await openBoard(page, 'athiq@amstudio.test');
    await page.getByRole('button', {name: 'Add project'}).click();

    const add = page.getByRole('dialog', {name: 'Add project'});
    await add.getByLabel('Name').fill(name);
    await add.getByLabel('Project code').fill('E2E-26-001');
    await add.getByLabel('Client').fill('E2E Client');
    await add.getByLabel('Tier').selectOption({label: 'Ready to Release'});
    await add.getByLabel('Priority').fill('9');
    await add.getByRole('button', {name: 'Add project'}).click();
    await expect(add).toBeHidden();

    const added = tier(page, 'Ready to Release').getByRole('listitem').filter({hasText: name});
    await expect(added).toContainText('E2E-26-001');
    await expect(added).toContainText('E2E Client');
  } finally {
    sql(`delete from public.projects where name = '${name}'`);
  }
});

test('a duplicate project code is refused plainly', async ({page}) => {
  await openBoard(page, 'athiq@amstudio.test');
  await page.getByRole('button', {name: 'Add project'}).click();

  const add = page.getByRole('dialog', {name: 'Add project'});
  await add.getByLabel('Name').fill('E2E Clash');
  await add.getByLabel('Project code').fill('AMS-26-014'); // Kadri Residence already has it
  await add.getByRole('button', {name: 'Add project'}).click();

  await expect(add.getByRole('alert')).toContainText('AMS-26-014');
});

test('a junior sees the board read-only', async ({page}) => {
  await openBoard(page, 'bushra@amstudio.test');

  // They need to see the plan — the scheduler reads capacity in their browser too.
  await expect(card(page, 'Kadri Residence')).toContainText('AMS-26-014');

  await expect(page.getByRole('button', {name: 'Add project'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Edit /})).toHaveCount(0);
  await expect(page.getByLabel(/^Tier for /)).toHaveCount(0);
  await expect(page.getByLabel(/^Priority for /)).toHaveCount(0);
});

test('a junior cannot move a project directly', async () => {
  const db = await signInWithPassword('bushra@amstudio.test');

  const {data} = await db.from('projects').update({tier: 'dormant'}).eq('code', 'AMS-26-014').select('id');

  // Row-level security hides the row from the update rather than raising, so nothing changes.
  expect(data ?? []).toEqual([]);
  expect(sql("select tier from public.projects where code = 'AMS-26-014'")).toBe('development');
});

test("the project form's fields don't make an iPhone zoom in", async ({page}) => {
  await openBoard(page, 'athiq@amstudio.test');
  await page.getByRole('button', {name: 'Add project'}).click();
  const add = page.getByRole('dialog', {name: 'Add project'});

  // iPhones zoom the page when a field smaller than 16px gets focus, and stay zoomed.
  for (const field of ['Name', 'Project code', 'Client', 'Tier', 'Priority', 'Project Architect', 'Target date']) {
    await expect(add.getByLabel(field, {exact: true}), field).toHaveCSS('font-size', '16px');
  }
});
