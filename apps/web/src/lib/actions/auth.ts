'use server';

import {redirect, RedirectType} from 'next/navigation';
import {type ActionResult, invalidInput} from '@/lib/actions/result';
import {sendCodeErrorMessage, verifyCodeErrorMessage} from '@/lib/auth-errors';
import {type SendCodeInput, sendCodeSchema, type VerifyCodeInput, verifyCodeSchema} from '@/lib/schemas/auth';
import {createClient} from '@/lib/supabase/server';

// Sign-in runs on the server so the session cookie arrives by Set-Cookie: Safari caps cookies written by page
// scripts at 7 days, which would cut the 90-day session short on iPhones.

/** Emails a 6-digit sign-in code. The database refuses any email that isn't on the team list. */
export async function sendCode(input: SendCodeInput): Promise<ActionResult<{email: string}>> {
  const parsed = sendCodeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const {email} = parsed.data;
  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithOtp({email, options: {shouldCreateUser: true}});
  if (error) return {ok: false, error: sendCodeErrorMessage(error)};
  return {ok: true, data: {email}};
}

/** Checks the emailed code and starts the session on this device, then opens People. */
export async function verifyCode(input: VerifyCodeInput): Promise<ActionResult> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const {error} = await supabase.auth.verifyOtp({...parsed.data, type: 'email'});
  if (error) return {ok: false, error: verifyCodeErrorMessage(error)};
  // Replace, so Back doesn't return to the code step.
  redirect('/people', RedirectType.replace);
}

/** Signs out on this device only: signing out on the laptop leaves the phone signed in. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({scope: 'local'});
  redirect('/login', RedirectType.replace);
}
