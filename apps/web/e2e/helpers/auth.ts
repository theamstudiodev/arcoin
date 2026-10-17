import {expect, type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '../../src/lib/database.types';
import {supabaseEnv} from './local';
import {mailpitIds, waitForCode} from './mailpit';

/** The password the tests give the team members they sign in as. Local database only. */
export const TEST_PASSWORD = 'arcoin-e2e-password';

/** A Supabase client holding only the publishable key: what anyone on the internet can call. */
export function publicClient() {
  const {url, key} = supabaseEnv();
  return createClient<Database>(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
}

/** Signs in on the login screen with email and password, and waits for People. */
export async function signInThroughUi(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', {exact: true}).fill(password);
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);
}

/** Asks for a code on the login screen and reads it from the email, leaving the code step open. */
export async function askForCodeThroughUi(page: Page, email: string): Promise<string> {
  await page.goto('/login');
  await page.getByRole('button', {name: 'Set a password'}).click();
  await page.getByLabel('Email').fill(email);
  const before = await mailpitIds(email);
  await page.getByRole('button', {name: 'Send code'}).click();
  const {code, subject} = await waitForCode(email, before);
  expect(subject).toBe('Set your Arcoin password');
  return code;
}

/** Finishes the open code step with `code` and a new password, and waits for People. */
export async function setPasswordWithCode(page: Page, code: string, password = TEST_PASSWORD): Promise<void> {
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('New password').fill(password);
  await page.getByRole('button', {name: 'Set password', exact: true}).click();
  await expect(page).toHaveURL(/\/people$/);
}

/** Sets a password with the emailed code, the way a new team member does, and waits for People. */
export async function setPasswordThroughUi(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await setPasswordWithCode(page, await askForCodeThroughUi(page, email), password);
}

/** A Supabase client signed in as `email`, standing in for another device or a direct API caller. */
export async function signInWithPassword(email: string, password = TEST_PASSWORD) {
  const supabase = publicClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) throw new Error(`Couldn't sign in as ${email}: ${error.message}`);
  return supabase;
}

/** Makes sure a team member can sign in with `password`, setting it through the code flow if not. */
export async function ensurePassword(email: string, password = TEST_PASSWORD): Promise<void> {
  const supabase = publicClient();
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
