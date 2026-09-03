import { z } from 'zod';
import { normalizeRoomCode } from '../utils/roomCode.js';

const roomNameSchema = z
  .string()
  .trim()
  .min(2, 'Room name must be at least 2 characters.')
  .max(50, 'Room name must be 50 characters or fewer.');

const tagsSchema = z
  .array(z.string().trim().min(1).max(20))
  .max(5, 'A member can have at most 5 tags.');

export const createRoomSchema = z.object({
  name: roomNameSchema,
});

export const joinRoomSchema = z.object({
  // Normalising inside the schema means the controller only ever sees a
  // canonical `RM-XXXXXX`, whatever the user actually typed.
  code: z
    .string()
    .transform((value) => normalizeRoomCode(value))
    .refine((value) => value !== null, {
      message: 'That does not look like a room code. Codes look like RM-7X92AB.',
    }),
});

export const updateRoomSchema = z
  .object({
    name: roomNameSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  });

export const updateMemberSchema = z.object({
  tags: tagsSchema.optional(),
  role: z.enum(['admin', 'member']).optional(),
});

/**
 * The dashboard's reporting window. Both bounds are optional: with neither, the
 * summary covers the room's whole history, which is what a fresh dashboard
 * wants. Query parameters arrive as strings, so both coerce.
 */
export const roomSummarySchema = z.object({
  from: z.coerce.date({ invalid_type_error: 'That start date could not be read.' }).optional(),
  to: z.coerce.date({ invalid_type_error: 'That end date could not be read.' }).optional(),
});
