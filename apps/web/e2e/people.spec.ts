import {expect, test} from '@playwright/test';
import {signInThroughUi, signInWithPassword} from './helpers/auth';
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
  await signInThroughUi(page, 'athiq@amstudio.test');
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

  await signInThroughUi(page, 'athiq@amstudio.test');
  await expect(page.getByRole('listitem').filter({hasText: name})).toContainText('Inactive');
});

test('Athiq adds a person, then changes their time on production', async ({page}) => {
  const n = Date.now();
  const name = `Ar. E2E ${n}`;
  await signInThroughUi(page, 'athiq@amstudio.test');

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
  await signInThroughUi(page, 'athiq@amstudio.test');
  await page.getByRole('button', {name: 'Add person'}).click();
  const add = page.getByRole('dialog', {name: 'Add person'});
  await add.getByLabel('Name').fill('Ar. Lilia again');
  await add.getByLabel('Email').fill('Lilia@AMStudio.test');
  await add.getByRole('button', {name: 'Add person'}).click();

  await expect(add.getByRole('alert')).toHaveText('lilia@amstudio.test is already on the team list.');
});

test('an email someone already signs in with is locked', async ({page}) => {
  await signInThroughUi(page, 'athiq@amstudio.test');
  await page.getByRole('listitem').filter({hasText: 'Ar. Bushra'}).getByRole('button', {name: 'Edit Ar. Bushra'}).click();

  const edit = page.getByRole('dialog', {name: 'Edit Ar. Bushra'});
  await expect(edit.getByLabel('Email')).toHaveValue('bushra@amstudio.test');
  await expect(edit.getByLabel('Email')).not.toBeEditable();
});

test("an admin can't remove their own admin access", async ({page}) => {
  try {
    await signInThroughUi(page, 'athiq@amstudio.test');
    await page.getByRole('listitem').filter({hasText: 'Ar. Athiq'}).getByRole('button', {name: 'Edit Ar. Athiq'}).click();
    const edit = page.getByRole('dialog', {name: 'Edit Ar. Athiq'});
    await edit.getByRole('switch', {name: 'Active'}).click();
    await edit.getByRole('button', {name: 'Save changes'}).click();

    await expect(edit.getByRole('alert')).toHaveText(
      "You can't remove your own admin access. Ask the other admin to make this change.",
    );
  } finally {
    // If the refusal ever breaks, don't leave the rest of the suite without its admin.
    sql("update public.people set active = true where email = 'athiq@amstudio.test' and not active");
  }
});

test('a junior sees the team read-only', async ({page}) => {
  await signInThroughUi(page, 'bushra@amstudio.test');
  await expect(page.getByRole('listitem').filter({hasText: 'Ar. Lilia'})).toContainText('Project Architect');

  await expect(page.getByRole('button', {name: 'Add person'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^Edit /})).toHaveCount(0);
});

test('a junior cannot add a person directly', async () => {
  const db = await signInWithPassword('bushra@amstudio.test');
  const email = `e2e-junior-${Date.now()}@amstudio.test`;

  const {error} = await db.from('people').insert({org_id: AM_STUDIO, email, name: 'Sneaky', role: 'junior'});
  expect(error?.code).toBe('42501');
  expect(sql(`select count(*) from public.people where email = '${email}'`)).toBe('0');
});
