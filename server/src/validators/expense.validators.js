import { z } from 'zod';

import { EXPENSE_CATEGORIES, MAX_AMOUNT_PAISE, SPLIT_TYPES } from '../utils/expense.constants.js';

/**
 * Shape validation only. Whether the numbers actually add up, and whether these
 * people are in this room, is decided by the split resolver and the expense
 * service — those rules need the room, and a schema has no access to it.
 *
 * The division is deliberate: Zod rejects requests that are malformed, the
 * service rejects requests that are wrong.
 */

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'That does not look like a valid member.');

const paiseAmount = z
  .number()
  .int('Amounts are sent in whole paise — ₹500.50 is 50050.')
  .positive('Enter an amount greater than zero.')
  .max(MAX_AMOUNT_PAISE, 'That amount is larger than this app supports.');

/**
 * A participant may be sent as a bare member id when the split needs no extra
 * numbers, so an equal split reads as `["id", "id"]` instead of
 * `[{ "user": "id" }, { "user": "id" }]`.
 */
const participant = z.union([
  objectId.transform((user) => ({ user })),
  z.object({
    user: objectId,
    amount: paiseAmount.optional(),
    percentage: z.number().positive('Percentages must be above zero.').max(100).optional(),
  }),
]);

const payer = z.object({ user: objectId, amount: paiseAmount });

// A date typed as next year is a typo, not a plan. A day of slack covers people
// in timezones ahead of the server.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const expenseDate = z.coerce
  .date({ invalid_type_error: 'That date could not be read.' })
  .refine((value) => value.getTime() <= Date.now() + ONE_DAY_MS, {
    message: 'An expense cannot be dated in the future.',
  });

export const createExpenseSchema = z
  .object({
    amount: paiseAmount,

    description: z
      .string()
      .trim()
      .min(2, 'Give this expense a short description.')
      .max(120, 'Description must be 120 characters or fewer.'),

    category: z.enum(EXPENSE_CATEGORIES).default('other'),
    date: expenseDate.default(() => new Date()),
    notes: z.string().trim().max(500, 'Note must be 500 characters or fewer.').optional(),
    receiptUrl: z.string().url('That receipt link is not a valid URL.').optional(),

    splitType: z.enum(SPLIT_TYPES, {
      errorMap: () => ({ message: 'Choose how to split this expense.' }),
    }),

    participants: z
      .array(participant)
      .min(1, 'Choose at least one person to split this between.')
      .max(50, 'A split can cover at most 50 people.'),

    // Accepts a single member id, which is what almost every expense is: one
    // person paid the whole thing.
    paidBy: z.union([objectId, z.array(payer).min(1, 'Choose who paid for this.')]),
  })
  .transform((body) => ({
    ...body,
    paidBy: typeof body.paidBy === 'string' ? [{ user: body.paidBy, amount: body.amount }] : body.paidBy,
  }));

/**
 * Query parameters arrive as strings, so everything here coerces. Unknown keys
 * are dropped rather than rejected — a stale bookmark with a removed filter
 * should still load the list.
 */
export const listExpensesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'At most 100 per page.').default(20),

  category: z.enum(EXPENSE_CATEGORIES).optional(),

  // "Expenses involving this person" — either they paid, or they owe a share.
  member: objectId.optional(),

  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),

  sort: z.enum(['date', '-date', 'amount', '-amount']).default('-date'),
});
