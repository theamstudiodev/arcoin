import {expect, test} from '@playwright/test';
import {ensurePassword, signInThroughUi, signInWithPassword} from './helpers/auth';
import {E2E_ADMIN, E2E_ADMIN_NAME, E2E_STAFF, E2E_STAFF_NAME} from './helpers/accounts';
import {AM_STUDIO, addTeamMember, sql} from './helpers/db';

// The seeded team: name, role and time on production.
const TEAM = [
  ['Ar. Asif', 'Principal Architect', '25%'],
  ['Ar. Athiq', 'Studio Director', 'Half time'],
  ['Ar. Lilia', 'Project Architect', 'Full time'],
  ['Ar. Disha', 'Project Architect', 'Full time'],
  ['Ar. Bushra', 'Junior Architect', 'Full time'],
  ['Ar. Nashwa', 'Junior Architect', 'Full time'],
  ['Ar. Prapthi', 'Junior Architect', 'Full time'],
] as const;

test('Athiq sees the whole team', async ({page}) => {
  await signInThroughUi(page, E2E_ADMIN);
  await expect(page.getByRole('heading', {name: 'People', level: 1})).toBeVisible();

  // By name, not by count: other tests add people while the suite runs.
  for (const [name, role, time] of TEAM) {
    const person = page.getByRole('listitem').filter({hasText: name});
    await expect(person).toContainText(role);
    await expect(person).toContainText(time);
    await expect(person).toContainText('Active');
  }
});

test('someone made inactive stays on the list, marked Inactive', async ({page}) => {
  const name = `E2E Former ${Date.now()}`;
  addTeamMember(`e2e-former-${Date.now()}@amstudio.test`, name);
  sql(`update public.people set active = false where name = '${name}'`);

  await signInThroughUi(page, E2E_ADMIN);
  await expect(page.getByRole('listitem').filter({hasText: name})).toContainText('Inactive');
});

test('Athiq adds a person, then changes their time on production', async ({page}) => {
  const n = Date.now();
  const name = `Ar. E2E ${n}`;
  await signInThroughUi(page, E2E_ADMIN);

  await page.getByRole('button', {name: 'Add person'}).click();
  const add = page.getByRole('dialog', {name: 'Add person'});
  await add.getByLabel('Name').fill(name);
  await add.getByLabel('Email').fill(`e2e-${n}@amstudio.test`);
  await add.getByLabel('Role').selectOption({label: 'Junior Architect'});
  await add.getByLabel('Time on production').selectOption({label: 'Full time'});
  await add.getByRole('button', {name: 'Add person'}).click();
  await expect(add).toBeHidden();

  const person = page.getByRole('listitem').filter({hasText: name});
  await expect(person).toContainText('Junior Architect');
  await expect(person).toContainText('Full time');

  await person.getByRole('button', {name: `Edit ${name}`}).click();
  const edit = page.getByRole('dialog', {name: `Edit ${name}`});
  await edit.getByLabel('Time on production').selectOption({label: 'Half time'});
  await edit.getByRole('button', {name: 'Save changes'}).click();
  await expect(edit).toBeHidden();
  await expect(person).toContainText('Half time');
});

test('an email already on the team list is refused plainly', async ({page}) => {
  await signInThroughUi(page, E2E_ADMIN);
  await page.getByRole('button', {name: 'Add person'}).click();
  const add = page.getByRole('dialog', {name: 'Add person'});
  await add.getByLabel('Name').fill('Ar. Lilia again');
  await add.getByLabel('Email').fill('Lilia@AMStudio.test');
  await add.getByRole('button', {name: 'Add person'}).click();

  await expect(add.getByRole('alert')).toHaveText('lilia@amstudio.test is already on the team list.');
});

test('an email someone already signs in with is locked', async ({page}) => {
  await signInThroughUi(page, E2E_ADMIN);
  const staff = page.getByRole('listitem').filter({hasText: E2E_STAFF_NAME});
  await staff.getByRole('button', {name: `Edit ${E2E_STAFF_NAME}`}).click();

  const edit = page.getByRole('dialog', {name: `Edit ${E2E_STAFF_NAME}`});
  await expect(edit.getByLabel('Email')).toHaveValue(E2E_STAFF);
  await expect(edit.getByLabel('Email')).not.toBeEditable();
});

test("an admin can't remove their own admin access", async ({page}) => {
  try {
    await signInThroughUi(page, E2E_ADMIN);
    const me = page.getByRole('listitem').filter({hasText: E2E_ADMIN_NAME});
    await me.getByRole('button', {name: `Edit ${E2E_ADMIN_NAME}`}).click();
    const edit = page.getByRole('dialog', {name: `Edit ${E2E_ADMIN_NAME}`});
    await edit.getByRole('switch', {name: 'Active'}).click();
    await edit.getByRole('button', {name: 'Save changes'}).click();

    await expect(edit.getByRole('alert')).toHaveText(
      "You can't remove your own admin access. Ask the other admin to make this change.",
    );
  } finally {
    // If the refusal ever breaks, don't leave the rest of the suite without its admin.
    sql(`update public.people set active = true where email = '${E2E_ADMIN}' and not active`);
  }
});

test('a junior sees the team read-only', async ({page}) => {
  await signInThroughUi(page, E2E_STAFF);
  await expect(page.getByRole('listitem').filter({hasText: 'Ar. Lilia'})).toContainText('Project Architect');

  await expect(page.getByRole('button', {name: 'Add person'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Edit /})).toHaveCount(0);
});

test('a junior cannot add a person directly', async () => {
  const db = await signInWithPassword(E2E_STAFF);
  const email = `e2e-junior-${Date.now()}@amstudio.test`;

  const {error} = await db.from('people').insert({org_id: AM_STUDIO, email, name: 'Sneaky', role: 'junior'});
  expect(error?.code).toBe('42501');
  expect(sql(`select count(*) from public.people where email = '${email}'`)).toBe('0');
});

test('Athiq edits someone who has signed in, even if their email was typed with capitals', async ({page}) => {
  const n = Date.now();
  const name = `Ar. E2E Signed ${n}`;
  // Typed into SQL by hand, as the setup guide has the real team entered.
  const typed = `E2E-signed-${n}@AMStudio.test`;
  addTeamMember(typed, name);
  await ensurePassword(typed.toLowerCase(), 'signed-in-password-5'); // they've joined, so the email is locked

  await signInThroughUi(page, E2E_ADMIN);
  const person = page.getByRole('listitem').filter({hasText: name});
  await person.getByRole('button', {name: `Edit ${name}`}).click();
  const edit = page.getByRole('dialog', {name: `Edit ${name}`});
  await edit.getByLabel('Time on production').selectOption({label: '75%'});
  await edit.getByRole('button', {name: 'Save changes'}).click();

  await expect(edit).toBeHidden();
  await expect(person).toContainText('75%');
});

test("the person form's fields don't make an iPhone zoom in", async ({page}) => {
  await signInThroughUi(page, E2E_ADMIN);
  await page.getByRole('button', {name: 'Add person'}).click();
  const add = page.getByRole('dialog', {name: 'Add person'});

  // iPhones zoom the page when a field smaller than 16px gets focus, and stay zoomed.
  for (const field of ['Name', 'Email', 'Role', 'Time on production']) {
    await expect(add.getByLabel(field), field).toHaveCSS('font-size', '16px');
  }
});
