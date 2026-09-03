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

  /**
   * Free text over the description and the note. Trimmed, and an empty string
   * is dropped rather than treated as a filter that matches nothing — a search
   * box the user has just cleared should show everything again.
   */
  search: z
    .string()
    .trim()
    .max(120, 'Search for something shorter.')
    .transform((value) => value || undefined)
    .optional(),

  minAmount: z.coerce.number().int().nonnegative().max(MAX_AMOUNT_PAISE).optional(),
  maxAmount: z.coerce.number().int().nonnegative().max(MAX_AMOUNT_PAISE).optional(),

  splitType: z.enum(SPLIT_TYPES).optional(),

  /** Only expenses that have been edited, or only those that have not. */
  edited: z.enum(['yes', 'no']).optional(),

  /**
   * Removed expenses are hidden by default, because that is what every other
   * screen means by "the expenses". History is the one place they can be
   * summoned — `include` shows them alongside the rest, `only` shows the
   * removals on their own.
   */
  deleted: z.enum(['exclude', 'include', 'only']).default('exclude'),

  sort: z.enum(['date', '-date', 'amount', '-amount']).default('-date'),
});

/**
 * An edit.
 *
 * Every field is optional — a PATCH that only fixes a typo should not have to
 * resend the whole expense — but the four money fields move as a set.
 *
 * That grouping is not fussiness. A new total with the old custom split leaves
 * shares that no longer sum to it, and the server cannot guess whose share
 * should absorb the difference. Rather than invent an answer, it asks for the
 * whole money block whenever any part of it changes. The edit form sends all
 * four anyway.
 */
const MONEY_FIELDS = ['amount', 'splitType', 'participants', 'paidBy'];

export const updateExpenseSchema = z
  .object({
    amount: paiseAmount.optional(),

    description: z
      .string()
      .trim()
      .min(2, 'Give this expense a short description.')
      .max(120, 'Description must be 120 characters or fewer.')
      .optional(),

    category: z.enum(EXPENSE_CATEGORIES).optional(),
    date: expenseDate.optional(),

    // An emptied note is a cleared note, stored as null rather than "" so the
    // record and its revision agree on what "no note" looks like.
    notes: z
      .string()
      .trim()
      .max(500, 'Note must be 500 characters or fewer.')
      .transform((value) => (value === '' ? null : value))
      .optional(),

    splitType: z
      .enum(SPLIT_TYPES, { errorMap: () => ({ message: 'Choose how to split this expense.' }) })
      .optional(),

    participants: z
      .array(participant)
      .min(1, 'Choose at least one person to split this between.')
      .max(50, 'A split can cover at most 50 people.')
      .optional(),

    paidBy: z.union([objectId, z.array(payer).min(1, 'Choose who paid for this.')]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' })
  .refine(
    (body) => {
      const present = MONEY_FIELDS.filter((field) => body[field] !== undefined);
      return present.length === 0 || present.length === MONEY_FIELDS.length;
    },
    {
      message:
        'Changing the amount, the split or who paid means sending all four together — amount, splitType, participants and paidBy.',
      path: ['amount'],
    },
  )
  .transform((body) => ({
    ...body,
    paidBy:
      typeof body.paidBy === 'string' ? [{ user: body.paidBy, amount: body.amount }] : body.paidBy,
  }));
