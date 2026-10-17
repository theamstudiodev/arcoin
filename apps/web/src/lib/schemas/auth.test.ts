import {describe, expect, it} from 'vitest';
import {sendCodeSchema, verifyCodeSchema} from '@/lib/schemas/auth';

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

describe('verifyCodeSchema', () => {
  it.each(['123 456', '123-456', ' 123456 '])('keeps only the digits of a pasted code: %j', (token) => {
    expect(verifyCodeSchema.parse({email: 'a@b.co', token}).token).toBe('123456');
  });

  it('rejects a 5-digit code', () => {
    const result = verifyCodeSchema.safeParse({email: 'a@b.co', token: '12345'});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('The code is the 6 digits in the email.');
  });
});
