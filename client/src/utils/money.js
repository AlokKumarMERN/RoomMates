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

/**
 * "+₹300.00" / "−₹300.00" — for balances, where the sign carries the meaning.
 * Takes the same options as formatINR so a screen can show signed and unsigned
 * amounts at matching precision.
 */
export function formatSignedINR(paise, options) {
  const sign = paise > 0 ? '+' : paise < 0 ? '−' : '';
  return `${sign}${formatINR(Math.abs(paise), options)}`;
}

/**
 * Short form for axis ticks and tight spaces: 250000 → "₹2.5k", 12000000 → "₹1.2L".
 *
 * Lakhs rather than millions, because the rest of the app formats in en-IN and
 * a reader who sees ₹1,20,000 in a table should not meet "₹120k" on the axis
 * beside it. Full precision always stays available in the tooltip and the
 * table view — this is for labels that must not wrap.
 */
export function formatCompactINR(paise) {
  const rupees = Math.round(toRupees(paise ?? 0));

  if (Math.abs(rupees) >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (Math.abs(rupees) >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (Math.abs(rupees) >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;

  return `₹${rupees}`;
}
