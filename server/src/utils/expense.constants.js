/**
 * Values shared by the Expense model, its validators, and the split resolver.
 *
 * They live here rather than on the model so the pure calculation code can use
 * them without importing Mongoose — the split resolver has to stay testable
 * without a database (plan §4).
 */

/** Stored lowercase; the client owns the display labels and icons. */
export const EXPENSE_CATEGORIES = [
  'food',
  'groceries',
  'rent',
  'electricity',
  'water',
  'internet',
  'cleaning',
  'transport',
  'entertainment',
  'shopping',
  'other',
];

/**
 * How an expense is divided.
 *
 * There is deliberately no "subset" type. A subset split is any of these three
 * over a shorter participant list — the veg/non-veg case in spec §7 is an equal
 * split among three people rather than five, nothing more. Making it a separate
 * type would mean every calculation had to branch on it forever.
 */
export const SPLIT_TYPES = ['equal', 'custom', 'percentage'];

/**
 * ₹1,00,00,000. Not a business rule — a guard rail. It keeps a typo like
 * pasting a phone number into the amount field out of the ledger, and keeps
 * `amount × weight` inside the range where integer arithmetic stays exact.
 */
export const MAX_AMOUNT_PAISE = 1_000_000_000;
