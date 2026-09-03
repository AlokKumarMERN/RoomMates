import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'That does not look like a valid id.');

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50, 'At most 50 per page.').default(20),

  // Query strings have no booleans. "?unread=true" is what a URL can carry.
  unread: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),

  room: objectId.optional(),
});
