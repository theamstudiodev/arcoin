'use server';

import {redirect, RedirectType} from 'next/navigation';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import {
  isCodeRecentlySent,
  isSamePassword,
  sendCodeErrorMessage,
  setPasswordErrorMessage,
  signInErrorMessage,
  verifyCodeErrorMessage,
} from '@/lib/auth-errors';
import {
  type SendCodeInput,
  sendCodeSchema,
  type SetPasswordInput,
  setPasswordSchema,
  type SignInInput,
  signInSchema,
} from '@/lib/schemas/auth';
import {createClient} from '@/lib/supabase/server';

// These run on the server so the session cookie arrives by Set-Cookie: Safari caps cookies written by page
// scripts at 7 days, which would cut the 90-day session short on iPhones.

/** Day-to-day sign-in with email and password, then opens People. */
export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return {ok: false, error: signInErrorMessage(error)};
  // Replace, so Back doesn't return to the sign-in form.
  redirect('/people', RedirectType.replace);
}

/**
 * Emails a 6-digit code for setting a password — the first one, or a new one when it's forgotten. The first time,
 * this creates the account; the database refuses any email that isn't on the team list. `recent` means no new email
 * went out because one did less than a minute ago; its code still works.
 */
export async function sendCode(input: SendCodeInput): Promise<ActionResult<{email: string; recent: boolean}>> {
  const parsed = sendCodeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const {email} = parsed.data;
  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithOtp({email, options: {shouldCreateUser: true}});
  if (error && isCodeRecentlySent(error)) return {ok: true, data: {email, recent: true}};
  if (error) return {ok: false, error: sendCodeErrorMessage(error)};
  return {ok: true, data: {email, recent: false}};
}

/** Checks the emailed code, saves the new password and opens People, signed in. */
export async function setPassword(input: SetPasswordInput): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const {email, token, password} = parsed.data;
  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({email, token, type: 'email'});
  if (verified.error) {
    const error = verifyCodeErrorMessage(verified.error);
    return {ok: false, error, fieldErrors: {token: error}};
  }

  const updated = await supabase.auth.updateUser({password});
  if (updated.error && !isSamePassword(updated.error)) {
    // Don't leave someone signed in without the password they meant to set.
    await supabase.auth.signOut({scope: 'local'});
    const error = setPasswordErrorMessage(updated.error);
    return {ok: false, error, fieldErrors: {password: error}};
  }
  // Resetting a password is how someone takes back their account, e.g. from a lost phone: end every other
  // session. Supabase does this itself when the password changes, but not when it's set to the same one again.
  await supabase.auth.signOut({scope: 'others'});
  redirect('/people', RedirectType.replace);
}

/** Signs out on this device only: signing out on the laptop leaves the phone signed in. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({scope: 'local'});
  redirect('/login', RedirectType.replace);
}
