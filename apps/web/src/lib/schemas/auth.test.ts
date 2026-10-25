import {describe, expect, it} from 'vitest';
import {sendCodeSchema, setPasswordSchema, signInSchema} from '@/lib/schemas/auth';

describe('sendCodeSchema', () => {
  it('trims and lower-cases the email', () => {
    expect(sendCodeSchema.parse({email: ' Athiq@AMStudio.test '}).email).toBe('athiq@amstudio.test');
  });

  it('refuses something that is not an email, saying what to do', () => {
    const result = sendCodeSchema.safeParse({email: 'athiq'});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter your full email address.');
  });
});

describe('signInSchema', () => {
  it('trims and lower-cases the email but keeps the password exactly as typed', () => {
    expect(signInSchema.parse({email: ' Athiq@AMStudio.test ', password: ' Secret pass '}))
      .toEqual({email: 'athiq@amstudio.test', password: ' Secret pass '});
  });

  it('asks for the password when it is empty', () => {
    const result = signInSchema.safeParse({email: 'a@b.co', password: ''});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter your password.');
  });
});

describe('setPasswordSchema', () => {
  const valid = {email: 'a@b.co', token: '123456', password: 'drawings-2026'};

  it.each(['123 456', '123-456', ' 123456 '])('keeps only the digits of a pasted code: %j', (token) => {
    expect(setPasswordSchema.parse({...valid, token}).token).toBe('123456');
  });

  it('rejects a 5-digit code', () => {
    const result = setPasswordSchema.safeParse({...valid, token: '12345'});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('The code is the 6 digits in the email.');
  });

  it('refuses a password shorter than 8 characters', () => {
    const result = setPasswordSchema.safeParse({...valid, password: 'abc1234'});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Use at least 8 characters.');
  });

  it('accepts 8 characters and keeps spaces in the password', () => {
    expect(setPasswordSchema.parse({...valid, password: ' abc 123'}).password).toBe(' abc 123');
  });

  it('refuses a password longer than 72 characters', () => {
    const result = setPasswordSchema.safeParse({...valid, password: 'x'.repeat(73)});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Use at most 72 characters.');
  });
});
