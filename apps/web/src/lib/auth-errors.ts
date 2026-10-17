/** The parts of a Supabase Auth error the sign-in screen decides on. */
export type AuthErrorLike = {status?: number; code?: string; message: string};

export const NOT_ON_TEAM = "This email isn't on the AM Studio team list. Ask Athiq to add you.";

/**
 * The sign-in allowlist is a trigger on auth.users (supabase/migrations/20261017000300_rules.sql). When it refuses
 * an email, Supabase Auth hides the trigger's own message and answers with this generic 500.
 */
function isAllowlistRefusal(error: AuthErrorLike): boolean {
  return error.status === 500 && error.message === 'Database error saving new user';
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
