import { z } from 'zod';

/**
 * Password rules (spec §26). Deliberately modest: length does far more for
 * safety than symbol requirements, which mostly push people toward
 * "Password1!" and a sticky note.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(60, 'Name must be 60 characters or fewer.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // No strength rules here — an old password that predates a rule change must
  // still be able to sign in.
  password: z.string().min(1, 'Enter your password.'),
});
