import { z } from 'zod';

import { MAX_AMOUNT_PAISE } from '../utils/expense.constants.js';

/**
 * Shape only. Whether these two people are in this room, and whether the caller
 * is allowed to move a settlement to this state, is decided by the service —
 * those rules need the room and the record, which a schema cannot see.
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'That does not look like a valid person.');

export const createSettlementSchema = z.object({
  payer: objectId,
  receiver: objectId,

  amount: z
    .number()
    .int('Amounts are sent in whole paise — ₹500.50 is 50050.')
    .positive('Enter an amount greater than zero.')
    .max(MAX_AMOUNT_PAISE, 'That amount is larger than this app supports.'),

  note: z.string().trim().max(200, 'Note must be 200 characters or fewer.').optional(),
});

/**
 * `pending` is missing on purpose: it is where a settlement starts, not
 * somewhere it can be moved back to. Un-sending a payment is a cancellation.
 */
export const updateSettlementSchema = z.object({
  status: z.enum(['paid', 'confirmed', 'cancelled'], {
    errorMap: () => ({ message: 'Choose paid, confirmed or cancelled.' }),
  }),
});

/**
 * Paginated like every other list. A room that has been settling up for two
 * years has a long history, and the Settle Up page only ever shows the top of
 * it — sending the whole thing to render twenty rows is the kind of thing that
 * is fine until suddenly it is not.
 */
export const listSettlementsSchema = z.object({
  status: z.enum(['pending', 'paid', 'confirmed', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'At most 100 per page.').default(20),
});
