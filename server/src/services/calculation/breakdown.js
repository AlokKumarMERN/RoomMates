/**
 * Breakdowns — the same expenses sliced by category and by day, for the
 * dashboard's charts.
 *
 * Pure functions, like the rest of `calculation/`: plain data in, plain data
 * out, no database and no clock. Keeping the aggregation here rather than in a
 * React component is spec §28's rule, and it means the numbers behind a chart
 * are unit-testable instead of only inspectable by eye.
 *
 * These read `amount` — what the room spent — not `shares`. "We spent ₹4,000 on
 * groceries this month" is a fact about the room, and it should not change
 * depending on who is looking at it.
 */

/**
 * The calendar day an expense belongs to, as `YYYY-MM-DD`.
 *
 * Bucketed on UTC parts. Almost every expense carries a date the user picked
 * from a date field, which arrives as midnight UTC and lands on the intended
 * day. The exception is an expense left to default to "now" and logged between
 * midnight and 05:30 IST, which buckets to the previous day. Fixing that
 * properly means storing the room's timezone, which is a real feature and not
 * this phase's — so it is a known, bounded edge rather than a hidden one.
 */
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Total spend per category, largest first.
 *
 * @param {Array<{amount: number, category: string}>} expenses
 * @returns {Array<{category: string, total: number, count: number}>} Only
 *   categories that actually occur — an empty category is not a data point, and
 *   a chart full of zero-height bars says nothing.
 */
export function byCategory(expenses = []) {
  const totals = new Map();

  for (const expense of expenses) {
    const key = expense.category ?? 'other';
    const row = totals.get(key) ?? { category: key, total: 0, count: 0 };

    row.total += expense.amount;
    row.count += 1;
    totals.set(key, row);
  }

  // Ties break on the category name so the bar order is stable between loads.
  return [...totals.values()].sort(
    (a, b) => b.total - a.total || a.category.localeCompare(b.category),
  );
}

/**
 * Total spend per day, oldest first.
 *
 * Only days with expenses appear. The client fills the gaps, because only the
 * client knows the window it is drawing — a room with two expenses a month
 * apart should render as a month-wide chart with a flat middle, and the server
 * has no business deciding that.
 *
 * @param {Array<{amount: number, date: Date|string}>} expenses
 * @returns {Array<{date: string, total: number, count: number}>}
 */
export function byDay(expenses = []) {
  const totals = new Map();

  for (const expense of expenses) {
    const key = dayKey(expense.date);
    const row = totals.get(key) ?? { date: key, total: 0, count: 0 };

    row.total += expense.amount;
    row.count += 1;
    totals.set(key, row);
  }

  // ISO day strings sort lexicographically, which is the whole reason for the
  // format.
  return [...totals.values()].sort((a, b) => a.date.localeCompare(b.date));
}
