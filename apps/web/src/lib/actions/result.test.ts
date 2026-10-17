import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {fieldErrorsOf} from '@/lib/actions/result';

describe('fieldErrorsOf', () => {
  it('keeps the first message for each field that failed', () => {
    const schema = z.object({
      name: z.string().min(1, 'Give the person a name.').max(3, 'Too long.'),
      email: z.email('Enter your full email address.'),
      role: z.string(),
    });
    const result = schema.safeParse({name: '', email: 'nope', role: 'junior'});
    expect(fieldErrorsOf(result.error!)).toEqual({
      name: 'Give the person a name.',
      email: 'Enter your full email address.',
    });
  });
});
