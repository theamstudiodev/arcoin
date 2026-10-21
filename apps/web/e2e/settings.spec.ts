import {expect, type Page, test} from '@playwright/test';
import {signInThroughUi, signInWithPassword} from './helpers/auth';
import {AM_STUDIO, sql} from './helpers/db';

// The rules the partners agreed, as the seed starts the studio on them. Every test that changes one puts it
// back: the Projects board asserts the two tier limits, and hours and working days move every date the
// timeline draws.
const SEEDED_RULES = [
  ['Production hours per person per day', '6'],
  ['Packages in production, studio-wide', '5'],
  ['Packages in production per Project Architect', '2'],
  ['Development limit', '15'],
  ['Ready to Release limit', '10'],
  ['Days before Dormant', '60'],
] as const;

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const rules = (page: Page) => page.getByRole('region', {name: 'Studio rules'});
const calendar = (page: Page) => page.getByRole('region', {name: 'Calendar'});
const rule = (page: Page, label: string) => rules(page).getByLabel(label, {exact: true});

async function openSettings(page: Page, email: string): Promise<void> {
  await signInThroughUi(page, email);
  await page.goto('/settings');
  await expect(page.getByRole('heading', {name: 'Settings', level: 1})).toBeVisible();
}

test('Athiq sees the six rules the studio runs on', async ({page}) => {
  await openSettings(page, 'athiq@amstudio.test');

  for (const [label, value] of SEEDED_RULES) {
    await expect(rule(page, label), label).toHaveValue(value);
  }
});

test('the calendar shows a Monday to Saturday week and the holidays the studio closes for', async ({page}) => {
  await openSettings(page, 'athiq@amstudio.test');

  for (const name of WORKING_DAYS) {
    await expect(calendar(page).getByRole('button', {name, pressed: true}), name).toBeVisible();
  }
  await expect(calendar(page).getByRole('button', {name: 'Sunday', pressed: false})).toBeVisible();

  // Dates read as YYYY-MM-DD in mono, with the name the studio knows the day by.
  await expect(calendar(page).getByText('2026-11-01')).toBeVisible();
  await expect(calendar(page).getByText('Kannada Rajyotsava')).toBeVisible();
  await expect(calendar(page).getByText('2026-12-25')).toBeVisible();
  await expect(calendar(page).getByText('2027-01-26')).toBeVisible();
});

test('a rule saves the moment the field is left, and the card says so', async ({page}) => {
  try {
    await openSettings(page, 'athiq@amstudio.test');
    const field = rule(page, 'Days before Dormant');
    await field.fill('45');
    await field.blur();

    await expect(rules(page).getByText('Saved')).toBeVisible();
    await expect.poll(() => sql('select dormant_days from public.settings')).toBe('45');

    // What the field shows is the database's answer, not its own: a reload says the same thing.
    await page.reload();
    await expect(rule(page, 'Days before Dormant')).toHaveValue('45');
  } finally {
    sql('update public.settings set dormant_days = 60');
  }
});

test('more than twelve production hours a day is refused in plain words', async ({page}) => {
  try {
    await openSettings(page, 'athiq@amstudio.test');
    const field = rule(page, 'Production hours per person per day');
    await field.fill('14');
    await field.blur();

    await expect(rules(page).getByRole('alert')).toHaveText(
      'Production hours per person per day are from 0.5 to 12, in half-hour steps.',
    );
    expect(sql('select hours_per_day from public.settings')).toBe('6.0');
  } finally {
    sql('update public.settings set hours_per_day = 6');
  }
});

test('turning Sunday on saves the new week', async ({page}) => {
  try {
    await openSettings(page, 'athiq@amstudio.test');
    await calendar(page).getByRole('button', {name: 'Sunday'}).click();

    await expect(calendar(page).getByText('Saved')).toBeVisible();
    await expect(calendar(page).getByRole('button', {name: 'Sunday', pressed: true})).toBeVisible();
    await expect.poll(() => sql('select workdays from public.settings')).toBe('{1,2,3,4,5,6,7}');
  } finally {
    sql("update public.settings set workdays = '{1,2,3,4,5,6}'");
  }
});

test('the studio cannot be set to work no days at all', async ({page}) => {
  try {
    // Already down to Monday, so the next toggle is the one that would empty the week.
    sql("update public.settings set workdays = '{1}'");
    await openSettings(page, 'athiq@amstudio.test');
    await calendar(page).getByRole('button', {name: 'Monday'}).click();

    await expect(calendar(page).getByRole('alert')).toContainText('at least one day a week');
    await expect(calendar(page).getByRole('button', {name: 'Monday', pressed: true})).toBeVisible();
    expect(sql('select workdays from public.settings')).toBe('{1}');
  } finally {
    sql("update public.settings set workdays = '{1,2,3,4,5,6}'");
  }
});

test('Athiq closes the studio for a day, then puts it back', async ({page}) => {
  const day = '2026-07-04';
  try {
    await openSettings(page, 'athiq@amstudio.test');
    await calendar(page).getByLabel('Date', {exact: true}).fill(day);
    await calendar(page).getByLabel('Holiday name', {exact: true}).fill('E2E Studio closed');
    await calendar(page).getByRole('button', {name: 'Add holiday'}).click();

    await expect(calendar(page).getByText(day)).toBeVisible();
    await expect(calendar(page).getByText('E2E Studio closed')).toBeVisible();
    await expect.poll(() => sql(`select label from public.holidays where day = '${day}'`)).toBe('E2E Studio closed');

    // There is no update policy on holidays, so a wrong date is taken off rather than corrected.
    await calendar(page).getByRole('button', {name: 'Remove 4 Jul 2026'}).click();
    await expect(calendar(page).getByText(day)).toHaveCount(0);
    await expect.poll(() => sql(`select count(*) from public.holidays where day = '${day}'`)).toBe('0');
  } finally {
    sql(`delete from public.holidays where day = '${day}'`);
  }
});

test('a junior sees the studio rules, with nothing to change them by', async ({page}) => {
  await openSettings(page, 'bushra@amstudio.test');

  for (const [label, value] of SEEDED_RULES) {
    await expect(rules(page).getByRole('listitem').filter({hasText: label}), label).toContainText(value);
  }
  await expect(calendar(page).getByText('2026-12-25')).toBeVisible();

  // The database refuses their writes, so the screen offers no control that cannot work.
  await expect(rules(page).getByRole('spinbutton')).toHaveCount(0);
  await expect(calendar(page).getByRole('button')).toHaveCount(0);
  await expect(calendar(page).getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText(/Only Asif or Athiq can change the studio/)).toBeVisible();
});

test('a junior cannot change the studio rules or the holidays directly', async () => {
  const db = await signInWithPassword('bushra@amstudio.test');

  const changed = await db.from('settings').update({hours_per_day: 8}).eq('org_id', AM_STUDIO).select('org_id');
  // Row-level security hides the row from the update rather than raising, so nothing changes.
  expect(changed.data ?? []).toEqual([]);
  expect(sql('select hours_per_day from public.settings')).toBe('6.0');

  const added = await db.from('holidays').insert({org_id: AM_STUDIO, day: '2026-08-15', label: 'E2E Sneaky'});
  expect(added.error?.code).toBe('42501');
  expect(sql("select count(*) from public.holidays where day = '2026-08-15'")).toBe('0');

  const removed = await db.from('holidays').delete().eq('org_id', AM_STUDIO).eq('day', '2026-12-25').select('day');
  expect(removed.data ?? []).toEqual([]);
  expect(sql("select count(*) from public.holidays where day = '2026-12-25'")).toBe('1');
});

test("the settings fields don't make an iPhone zoom in", async ({page}) => {
  await openSettings(page, 'athiq@amstudio.test');

  // iPhones zoom the page when a field smaller than 16px gets focus, and stay zoomed.
  for (const [label] of SEEDED_RULES) {
    await expect(rule(page, label), label).toHaveCSS('font-size', '16px');
  }
  for (const field of ['Date', 'Holiday name']) {
    await expect(calendar(page).getByLabel(field, {exact: true}), field).toHaveCSS('font-size', '16px');
  }
});
