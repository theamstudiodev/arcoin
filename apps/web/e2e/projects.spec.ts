import {expect, type Page, test} from '@playwright/test';
import {signInThroughUi, signInWithPassword} from './helpers/auth';
import {E2E_ADMIN, E2E_STAFF} from './helpers/accounts';
import {AM_STUDIO, sql} from './helpers/db';

// The seeded portfolio is the studio's real scale: 50 projects, with both production tiers full.
const TIER_COUNTS = {Development: 15, 'Ready to Release': 10, 'Response Awaited': 15, Dormant: 10} as const;
// Priorities 1 to 4. The rest of Development runs on to priority 15.
const DEVELOPMENT_TOP = ['Mangala Residence', 'Kadri Residence', 'Madikeri Campus Block', 'Munnar Resort'] as const;

/** A tier's column, found by its heading, so cards from another tier can't satisfy an assertion. */
const tier = (page: Page, name: string) =>
  page.locator('section').filter({has: page.getByRole('heading', {name, level: 2})});

/**
 * A phone shows one tier at a time behind a row of chips, so asking about a tier means choosing it
 * first. At a desk all four are side by side and the chips are not there, which is why this looks
 * before it clicks: the same spec then reads at either width.
 */
async function openTier(page: Page, name: string) {
  const chip = page.getByRole('navigation', {name: 'Tiers'}).getByRole('button', {name});
  if (await chip.isVisible()) await chip.click();
  return tier(page, name);
}

const card = (page: Page, name: string) => page.getByRole('listitem').filter({hasText: name});

/** Opens a project from the board, which on a phone is the only way in. */
async function openProject(page: Page, tierName: string, name: string): Promise<void> {
  await (await openTier(page, tierName)).getByRole('listitem').filter({hasText: name}).getByRole('link').first().click();
  await expect(page.getByRole('heading', {name, level: 1})).toBeVisible();
}

async function openBoard(page: Page, email: string): Promise<void> {
  await signInThroughUi(page, email);
  await page.goto('/projects');
  await expect(page.getByRole('heading', {name: 'Projects', level: 1})).toBeVisible();
}

test('Athiq sees the four tiers, each project under the right one, in priority order', async ({page}) => {
  await openBoard(page, E2E_ADMIN);

  for (const [name, count] of Object.entries(TIER_COUNTS)) {
    const column = await openTier(page, name);
    await expect(page.getByRole('heading', {name, level: 2})).toBeVisible();
    await expect(column.getByRole('listitem'), name).toHaveCount(count);
  }

  // Priority 1 first — the order the studio works in — and priority 15 last.
  const inOrder = await (await openTier(page, 'Development')).getByRole('listitem').allTextContents();
  DEVELOPMENT_TOP.forEach((name, i) => expect(inOrder[i], `position ${i}`).toContain(name));
  expect(inOrder[14]).toContain('Kankanady Mixed Use');

  // A waiting room has nothing to rank, so it falls back to the name — at 15 and 10 rows that matters.
  const dormant = await (await openTier(page, 'Dormant')).getByRole('listitem').allTextContents();
  expect(dormant[0]).toContain('Adyar Farmhouse');

  await openTier(page, 'Ready to Release');
  await expect(card(page, 'Kavoor Clinic')).toBeVisible();
  await expect(
    (await openTier(page, 'Response Awaited')).getByRole('listitem').filter({hasText: 'Bejai Apartments'}),
  ).toBeVisible();
});

test('each capped tier shows how full it is, and the waiting rooms show no limit', async ({page}) => {
  await openBoard(page, E2E_ADMIN);

  // Both production tiers are seeded exactly at their limit.
  const development = await openTier(page, 'Development');
  await expect(development).toContainText('15 / 15');
  await expect(development.getByLabel('15 of 15 projects')).toBeVisible();
  // At the limit is not over it.
  await expect(development).not.toContainText('over');

  const ready = await openTier(page, 'Ready to Release');
  await expect(ready.getByLabel('10 of 10 projects')).toBeVisible();
  await expect(ready).not.toContainText('over');

  // Response Awaited and Dormant hold whatever the client list produces.
  await expect((await openTier(page, 'Response Awaited')).getByLabel('15 projects, no limit')).toBeVisible();
  await expect((await openTier(page, 'Dormant')).getByLabel('10 projects, no limit')).toBeVisible();
});

test('a tier over its limit is marked', async ({page}) => {
  try {
    // Development is seeded exactly at its limit of fifteen, so one more project puts it over.
    sql(`insert into public.projects (org_id, name, tier) values ('${AM_STUDIO}', 'E2E Over The Line', 'development')`);
    await openBoard(page, E2E_ADMIN);

    const development = await openTier(page, 'Development');
    await expect(development).toContainText('16 / 15');
    await expect(development).toContainText('1 over');
  } finally {
    sql("delete from public.projects where name like 'E2E %'");
  }
});

test('a tier with nothing in it says so', async ({page}) => {
  try {
    // Every tier is occupied now, but a studio with nothing dormant is the normal case, not an edge one.
    sql("update public.projects set tier = 'response_awaited' where tier = 'dormant'");
    await openBoard(page, E2E_ADMIN);

    const dormant = await openTier(page, 'Dormant');
    await expect(dormant).toContainText('Nothing here');
    await expect(dormant.getByLabel('0 projects, no limit')).toBeVisible();
  } finally {
    // The dormant projects are the only AMS-24 codes in the seed.
    sql("update public.projects set tier = 'dormant' where code like 'AMS-24-%'");
  }
});

test('Athiq moves a project to another tier, and the board follows', async ({page}) => {
  try {
    await openBoard(page, E2E_ADMIN);
    // Tier and priority are changed on the project's own screen, which is the one place a phone can
    // change them: the list rows carry no controls, by the scope's choice.
    await openProject(page, 'Ready to Release', 'Kavoor Clinic');
    await page.getByLabel('Tier', {exact: true}).selectOption({label: 'Development'});
    await expect.poll(() => sql("select tier from public.projects where name = 'Kavoor Clinic'")).toBe('development');

    await page.goto('/projects');
    await expect(
      (await openTier(page, 'Development')).getByRole('listitem').filter({hasText: 'Kavoor Clinic'}),
    ).toBeVisible();
    // Ready to Release drops to nine, and Development is now one past its limit.
    await expect((await openTier(page, 'Ready to Release')).getByLabel('9 of 10 projects')).toBeVisible();
    await expect(await openTier(page, 'Development')).toContainText('1 over');
  } finally {
    sql("update public.projects set tier = 'ready_to_release' where name = 'Kavoor Clinic'");
  }
});

test('raising a project up the priority list re-orders the board — the Monday change', async ({page}) => {
  try {
    await openBoard(page, E2E_ADMIN);
    await openProject(page, 'Development', 'Madikeri Campus Block');

    // Madikeri is third. Make it most urgent and it leads Development.
    const priority = page.getByLabel('Priority', {exact: true});
    await priority.fill('1');
    // The header saves the moment a field is left, the way Settings does. Nothing is pressed.
    await priority.press('Tab');
    await expect.poll(() => sql("select priority from public.projects where name = 'Madikeri Campus Block'")).toBe('1');

    await page.goto('/projects');
    const development = await openTier(page, 'Development');
    await expect(development.getByRole('listitem').first()).toContainText('Madikeri Campus Block');

    // The projects nobody touched keep their own order behind it.
    const inOrder = await development.getByRole('listitem').allTextContents();
    expect(inOrder[1]).toContain('Mangala Residence');
    expect(inOrder[2]).toContain('Kadri Residence');
  } finally {
    sql("update public.projects set priority = 3 where name = 'Madikeri Campus Block'");
  }
});

test('Athiq adds a project, and it lands in the tier chosen for it', async ({page}) => {
  const name = `E2E Tower ${Date.now()}`;
  try {
    await openBoard(page, E2E_ADMIN);
    await page.getByRole('button', {name: 'Add project'}).click();

    const add = page.getByRole('dialog', {name: 'Add project'});
    await add.getByLabel('Name').fill(name);
    await add.getByLabel('Project code').fill('E2E-26-001');
    await add.getByLabel('Client').fill('E2E Client');
    await add.getByLabel('Tier').selectOption({label: 'Ready to Release'});
    await add.getByLabel('Priority').fill('9');
    await add.getByRole('button', {name: 'Add project'}).click();
    await expect(add).toBeHidden();

    const added = (await openTier(page, 'Ready to Release')).getByRole('listitem').filter({hasText: name});
    await expect(added).toContainText('E2E-26-001');

    // The client is on the project's own screen, not on the board card: the card carries the code, the
    // lead, the next package and the forecast finish, which is what the partners read it for. Opening it
    // from the card is also the only way into the register, so this covers both.
    await added.getByRole('link', {name}).click();
    await expect(page.getByRole('heading', {name, level: 1})).toBeVisible();
    await expect(page.getByText('E2E Client')).toBeVisible();
  } finally {
    sql(`delete from public.projects where name = '${name}'`);
  }
});

test('a duplicate project code is refused plainly', async ({page}) => {
  await openBoard(page, E2E_ADMIN);
  await page.getByRole('button', {name: 'Add project'}).click();

  const add = page.getByRole('dialog', {name: 'Add project'});
  await add.getByLabel('Name').fill('E2E Clash');
  await add.getByLabel('Project code').fill('AMS-26-014'); // Kadri Residence already has it
  await add.getByRole('button', {name: 'Add project'}).click();

  await expect(add.getByRole('alert')).toContainText('AMS-26-014');
});

test('a junior sees the board read-only', async ({page}) => {
  await openBoard(page, E2E_STAFF);

  // They need to see the plan — the scheduler reads capacity in their browser too.
  await expect(card(page, 'Kadri Residence')).toContainText('AMS-26-014');

  await expect(page.getByRole('button', {name: 'Add project'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Edit /})).toHaveCount(0);
  await expect(page.getByLabel(/^Tier for /)).toHaveCount(0);
  await expect(page.getByLabel(/^Priority for /)).toHaveCount(0);

  // And the project's own screen, where a phone changes a tier, offers them nothing either.
  await openProject(page, 'Development', 'Kadri Residence');
  await expect(page.getByLabel('Tier', {exact: true})).toHaveCount(0);
  await expect(page.getByLabel('Priority', {exact: true})).toHaveCount(0);
});

test('a junior cannot move a project directly', async () => {
  const db = await signInWithPassword(E2E_STAFF);

  const {data} = await db.from('projects').update({tier: 'dormant'}).eq('code', 'AMS-26-014').select('id');

  // Row-level security hides the row from the update rather than raising, so nothing changes.
  expect(data ?? []).toEqual([]);
  expect(sql("select tier from public.projects where code = 'AMS-26-014'")).toBe('development');
});

test("the project form's fields don't make an iPhone zoom in", async ({page}) => {
  await openBoard(page, E2E_ADMIN);
  await page.getByRole('button', {name: 'Add project'}).click();
  const add = page.getByRole('dialog', {name: 'Add project'});

  // iPhones zoom the page when a field smaller than 16px gets focus, and stay zoomed.
  for (const field of ['Name', 'Project code', 'Client', 'Tier', 'Priority', 'Project Architect', 'Target date']) {
    await expect(add.getByLabel(field, {exact: true}), field).toHaveCSS('font-size', '16px');
  }
});
