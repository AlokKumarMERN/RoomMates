/**
 * Client-side mirror of server/src/utils/money.js.
 *
 * The API sends and receives INTEGER PAISE. Rupees exist only in the input the
 * user types and the text they read — never in anything sent to the server.
 * See the server module for why.
 */

export const PAISE_PER_RUPEE = 100;

/** Parse what the user typed into integer paise. Returns null if unusable. */
export function toPaise(rupees) {
  const numeric = typeof rupees === 'string' ? Number(rupees.replace(/,/g, '').trim()) : rupees;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return null;
  return Math.round(numeric * PAISE_PER_RUPEE);
}

export function toRupees(paise) {
  return paise / PAISE_PER_RUPEE;
}

/** 250075 → "₹2,500.75" */
export function formatINR(paise, { showDecimals = true } = {}) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(toRupees(paise ?? 0));
}

/** "+₹300.00" / "−₹300.00" — for balances, where the sign carries the meaning. */
export function formatSignedINR(paise) {
  const sign = paise > 0 ? '+' : paise < 0 ? '−' : '';
  return `${sign}${formatINR(Math.abs(paise))}`;
}
