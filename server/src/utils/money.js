/**
 * Money handling for RoomMates.
 *
 * THE RULE: every amount in the database, in the API, and in the calculation
 * engine is an INTEGER NUMBER OF PAISE. ₹500.50 is stored as 50050.
 *
 * Why: JavaScript numbers are binary floats and cannot represent 0.1 exactly.
 * A percentage split of ₹1000 three ways in floating point leaves stray
 * fractions that accumulate until member balances no longer sum to zero and the
 * settlement page shows ₹0.01 debts nobody owes. Integers make that impossible.
 *
 * Rupees exist only at the two edges: parsing user input, and formatting for
 * display. Everything in between is paise.
 */

export const PAISE_PER_RUPEE = 100;

/**
 * Parse a user-entered rupee amount into integer paise.
 * Accepts a number or a string ("1,250.75"). Returns null if it isn't a usable amount.
 */
export function toPaise(rupees) {
  const numeric = typeof rupees === 'string' ? Number(rupees.replace(/,/g, '').trim()) : rupees;

  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return null;

  // Round rather than truncate so 0.1 + 0.2 style input errors resolve sensibly.
  return Math.round(numeric * PAISE_PER_RUPEE);
}

/**
 * Convert paise back to a rupee number. For display and charts only —
 * never feed the result back into a calculation.
 */
export function toRupees(paise) {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Format paise as Indian currency, e.g. 250075 → "₹2,500.75".
 */
export function formatINR(paise, { showDecimals = true } = {}) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(toRupees(paise));
}

/**
 * True if the value is a valid stored amount: a positive whole number of paise.
 */
export function isValidAmount(paise) {
  return Number.isInteger(paise) && paise > 0;
}
