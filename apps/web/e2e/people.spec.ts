import {expect, test} from '@playwright/test';
import {signInThroughUi} from './helpers/auth';
import {addTeamMember, sql} from './helpers/db';

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
