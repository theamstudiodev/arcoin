import {describe, expect, it} from 'vitest';
import {
  isSamePassword,
  sendCodeErrorMessage,
  setPasswordErrorMessage,
  signInErrorMessage,
  verifyCodeErrorMessage,
} from '@/lib/auth-errors';

describe('signInErrorMessage', () => {
  it('says the email and password do not match, without saying which', () => {
    expect(signInErrorMessage({status: 400, code: 'invalid_credentials', message: 'Invalid login credentials'}))
      .toBe("That email and password don't match. Try again, or set a new password.");
  });

  it('asks to wait after too many tries', () => {
    expect(signInErrorMessage({status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached'}))
      .toBe('Too many tries. Wait a few minutes, then try again.');
  });

  it('falls back to the connection when the service cannot be reached', () => {
    expect(signInErrorMessage({message: 'fetch failed'})).toBe("Couldn't sign in. Check your connection and try again.");
  });
});

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

describe('setPasswordErrorMessage', () => {
  it('asks for a longer password when Supabase calls it weak', () => {
    expect(setPasswordErrorMessage({status: 422, code: 'weak_password', message: 'Password should be at least 8 characters.'}))
      .toBe('Choose a longer password: at least 8 characters.');
  });

  it('falls back to the connection otherwise', () => {
    expect(setPasswordErrorMessage({message: 'fetch failed'}))
      .toBe("Couldn't save your password. Check your connection and try again.");
  });
});

describe('isSamePassword', () => {
  it('recognises a new password that equals the current one', () => {
    const same = {status: 422, code: 'same_password', message: 'New password should be different from the old password.'};
    expect(isSamePassword(same)).toBe(true);
  });

  it('does not confuse other refusals with it', () => {
    expect(isSamePassword({status: 422, code: 'weak_password', message: 'Password is too weak'})).toBe(false);
  });
});
