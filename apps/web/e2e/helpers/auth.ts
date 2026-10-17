import {expect, type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '../../src/lib/database.types';
import {supabaseEnv} from './local';
import {mailpitIds, waitForCode} from './mailpit';

/** The password the tests give the team members they sign in as. Local database only. */
export const TEST_PASSWORD = 'arcoin-e2e-password';

/** Signs in on the login screen with email and password, and waits for People. */
export async function signInThroughUi(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', {exact: true}).fill(password);
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);
}

/** Sets a password with the emailed code, the way a new team member does, and waits for People. */
export async function setPasswordThroughUi(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  const before = await mailpitIds(email);
  await page.getByRole('button', {name: 'Send code'}).click();
  const {code} = await waitForCode(email, before);
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('New password').fill(password);
  await page.getByRole('button', {name: 'Set password', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);
}

/** A Supabase client signed in as `email`, standing in for another device or a direct API caller. */
export async function signInWithPassword(email: string, password = TEST_PASSWORD) {
  const {url, key} = supabaseEnv();
  const supabase = createClient<Database>(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) throw new Error(`Couldn't sign in as ${email}: ${error.message}`);
  return supabase;
}

/** Makes sure a seeded team member can sign in with `password`, setting it through the code flow if not. */
export async function ensurePassword(email: string, password = TEST_PASSWORD): Promise<void> {
  const {url, key} = supabaseEnv();
  const supabase = createClient<Database>(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
  if (!(await supabase.auth.signInWithPassword({email, password})).error) return;

  const before = await mailpitIds(email);
  const sent = await supabase.auth.signInWithOtp({email, options: {shouldCreateUser: true}});
  if (sent.error) throw new Error(`Couldn't send a code to ${email}: ${sent.error.message}`);
  const {code} = await waitForCode(email, before);
  const verified = await supabase.auth.verifyOtp({email, token: code, type: 'email'});
  if (verified.error) throw new Error(`Couldn't verify the code for ${email}: ${verified.error.message}`);
  const updated = await supabase.auth.updateUser({password});
  if (updated.error) throw new Error(`Couldn't set the password for ${email}: ${updated.error.message}`);
}
