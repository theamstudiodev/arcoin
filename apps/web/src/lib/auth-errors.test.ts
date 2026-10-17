import {describe, expect, it} from 'vitest';
import {sendCodeErrorMessage, verifyCodeErrorMessage} from '@/lib/auth-errors';

describe('sendCodeErrorMessage', () => {
  it('names the team list when the database refuses the sign-up', () => {
    // What Supabase Auth returns when the allowlist trigger on auth.users raises (probed against local GoTrue).
    const refusal = {status: 500, code: 'unexpected_failure', message: 'Database error saving new user'};
    expect(sendCodeErrorMessage(refusal)).toBe("This email isn't on the AM Studio team list. Ask Athiq to add you.");
  });

  it('does not blame the team list for other server errors', () => {
    expect(sendCodeErrorMessage({status: 500, code: 'unexpected_failure', message: 'Error sending magic link email'}))
      .toBe("Couldn't send the code. Check your connection and try again.");
  });

  it('asks to wait when rate-limited', () => {
    expect(sendCodeErrorMessage({status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded'}))
      .toBe('Too many codes asked for. Wait a minute, then try again.');
  });
});

describe('verifyCodeErrorMessage', () => {
  it('says plainly when a code is wrong or expired', () => {
    expect(verifyCodeErrorMessage({status: 403, code: 'otp_expired', message: 'Token has expired or is invalid'}))
      .toBe('That code is wrong or has expired. Check the latest email, or send a new code.');
  });

  it('asks to wait after too many tries', () => {
    expect(verifyCodeErrorMessage({status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached'}))
      .toBe('Too many tries. Wait a few minutes, then send a new code.');
  });

  it('falls back to the connection when the service cannot be reached', () => {
    expect(verifyCodeErrorMessage({message: 'fetch failed'}))
      .toBe("Couldn't check the code. Check your connection and try again.");
  });
});
