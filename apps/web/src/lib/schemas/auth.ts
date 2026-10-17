import {z} from 'zod';
import {emailSchema} from '@/lib/schemas/email';

/** Day-to-day sign-in. The password is checked as typed: no trimming. */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, {error: 'Enter your password.'}),
});

/** Asks for a 6-digit code to set a first password or reset a forgotten one. */
export const sendCodeSchema = z.object({email: emailSchema});

/** The code as typed or pasted: "123 456" and "123-456" both count. */
const tokenSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, {error: 'The code is the 6 digits in the email.'}));

/** A new password. 72 is bcrypt's limit, which Supabase Auth enforces. */
const passwordSchema = z
  .string()
  .min(8, {error: 'Use at least 8 characters.'})
  .max(72, {error: 'Use at most 72 characters.'});

export const setPasswordSchema = z.object({email: emailSchema, token: tokenSchema, password: passwordSchema});

export type SignInInput = z.input<typeof signInSchema>;
export type SendCodeInput = z.input<typeof sendCodeSchema>;
export type SetPasswordInput = z.input<typeof setPasswordSchema>;
