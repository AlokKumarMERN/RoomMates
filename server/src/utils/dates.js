/**
 * Date handling for queries that range over expenses.
 *
 * Every report — the expense list, the dashboard, the settlement page — filters
 * on the same `date` field with the same two optional bounds, so the rule for
 * turning those bounds into a Mongo filter lives here rather than in each
 * service.
 */

/**
 * The last instant of the day a date falls on.
 *
 * A `to` bound arrives as midnight, but the person who picked it meant "up to
 * the end of that day". Comparing against midnight silently drops everything
 * logged on the final day of the range — the kind of bug that only shows up as
 * a total being slightly too small, which nobody notices.
 */
export function endOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Build the `date` clause for an expense query.
 *
 * @param {Date} [from] Inclusive lower bound.
 * @param {Date} [to]   Inclusive upper bound, extended to the end of that day.
 * @returns {{$gte?: Date, $lte?: Date}|undefined} Undefined when neither bound
 *   is set, so the caller can spread it away and query the whole history.
 */
export function dateRangeFilter(from, to) {
  if (!from && !to) return undefined;

  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = endOfDay(to);

  return range;
}
