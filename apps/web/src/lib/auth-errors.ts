/** The parts of a Supabase Auth error the sign-in screen decides on. */
export type AuthErrorLike = {status?: number; code?: string; message: string};

export const NOT_ON_TEAM = "This email isn't on the AM Studio team list. Ask Athiq to add you.";

/** Never says which of the two was wrong, so the screen can't be used to find out who is on the team. */
export function signInErrorMessage(error: AuthErrorLike): string {
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return "That email and password don't match. Try again, or set a new password.";
  }
  if (error.status === 429) return 'Too many tries. Wait a few minutes, then try again.';
  return "Couldn't sign in. Check your connection and try again.";
}

/**
 * The sign-in allowlist is a trigger on auth.users (supabase/migrations/20261017000300_rules.sql). When it refuses
 * an email, Supabase Auth hides the trigger's own message and answers with this generic 500.
 */
function isAllowlistRefusal(error: AuthErrorLike): boolean {
  return error.status === 500 && error.message === 'Database error saving new user';
}

/**
 * Supabase sends one email per address per minute (once a second locally) and refuses a second within it. The code
 * that went out moments ago still works, so the screen should open the code step rather than show an error.
 */
export function isCodeRecentlySent(error: AuthErrorLike): boolean {
  return error.status === 429 && /only request this after/i.test(error.message);
}

export function sendCodeErrorMessage(error: AuthErrorLike): string {
  if (isAllowlistRefusal(error)) return NOT_ON_TEAM;
  if (error.status === 429) return 'Too many codes asked for. Wait a minute, then try again.';
  return "Couldn't send the code. Check your connection and try again.";
}

export function verifyCodeErrorMessage(error: AuthErrorLike): string {
  if (error.code === 'otp_expired' || error.status === 403) {
    return 'That code is wrong or has expired. Check the latest email, or send a new code.';
  }
  if (error.status === 429) return 'Too many tries. Wait a few minutes, then send a new code.';
  return "Couldn't check the code. Check your connection and try again.";
}

export function setPasswordErrorMessage(error: AuthErrorLike): string {
  if (error.code === 'weak_password') return 'Choose a longer password: at least 8 characters.';
  return "Couldn't save your password. Check your connection and try again.";
}

/** The new password is the current one. The person proved the email and knows the password, so that's fine. */
export function isSamePassword(error: AuthErrorLike): boolean {
  return error.code === 'same_password';
}
