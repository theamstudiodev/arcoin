import {z} from 'zod';
import {emailSchema} from '@/lib/schemas/email';

export const sendCodeSchema = z.object({email: emailSchema});

/** The code as typed or pasted: "123 456" and "123-456" both count. */
const tokenSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, {error: 'The code is the 6 digits in the email.'}));

export const verifyCodeSchema = z.object({email: emailSchema, token: tokenSchema});

export type SendCodeInput = z.input<typeof sendCodeSchema>;
export type VerifyCodeInput = z.input<typeof verifyCodeSchema>;
