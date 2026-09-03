/**
 * Turning the API's sparse breakdowns into something a chart can plot.
 *
 * The server returns only days that actually have expenses — it has no business
 * deciding the window you are drawing. These functions fill that in.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` for a date, in UTC — the same bucketing the server uses. */
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Past this many days a daily chart becomes a picket fence: hundreds of
 * one-pixel bars where the reader can only see the shape, not the days. Group
 * into months instead.
 */
const MAX_DAILY_POINTS = 62;

/**
 * Fill the gaps in a daily series so a quiet week reads as a flat stretch
 * rather than two adjacent points with a line drawn between them.
 *
 * @param {Array<{date: string, total: number}>} byDay Sparse, oldest first.
 * @param {{from?: string|Date, to?: string|Date}} [window] Defaults to the span
 *   the data itself covers.
 * @returns {Array<{date: string, total: number}>} Dense, one entry per day.
 */
export function densifyDaily(byDay = [], window = {}) {
  if (byDay.length === 0) return [];

  const totals = new Map(byDay.map((row) => [row.date, row.total]));

  const start = new Date(`${window.from ? dayKey(window.from) : byDay[0].date}T00:00:00Z`);
  const end = new Date(
    `${window.to ? dayKey(window.to) : byDay[byDay.length - 1].date}T00:00:00Z`,
  );

  const dense = [];

  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const key = new Date(time).toISOString().slice(0, 10);
    dense.push({ date: key, total: totals.get(key) ?? 0 });
  }

  return dense;
}

/** Roll a daily series up into calendar months. */
export function groupByMonth(daily = []) {
  const totals = new Map();

  for (const row of daily) {
    const key = row.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + row.total);
  }

  return [...totals.entries()]
    .map(([month, total]) => ({ date: `${month}-01`, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The series the timeline chart should actually draw, at whichever granularity
 * stays readable.
 *
 * @returns {{points: Array<{date: string, total: number}>, granularity: 'day'|'month'}}
 */
export function timeline(byDay = [], window = {}) {
  const daily = densifyDaily(byDay, window);

  if (daily.length > MAX_DAILY_POINTS) {
    return { points: groupByMonth(daily), granularity: 'month' };
  }

  return { points: daily, granularity: 'day' };
}

/**
 * Keep the largest few rows and fold the rest into one "Other".
 *
 * Past roughly seven classes adjacent bars stop being distinguishable at a
 * glance and the chart turns into a badly-formatted table. Folding the tail
 * keeps the shape readable; the full numbers stay in the card's table view, so
 * nothing is hidden — only summarised.
 *
 * @param {Array<{total: number}>} rows Sorted largest first.
 * @param {number} limit How many to keep before folding.
 * @param {(row) => string} labelOf
 */
export function foldTail(rows = [], limit, labelOf) {
  if (rows.length <= limit) {
    return rows.map((row) => ({ label: labelOf(row), total: row.total }));
  }

  const kept = rows.slice(0, limit).map((row) => ({ label: labelOf(row), total: row.total }));
  const rest = rows.slice(limit).reduce((sum, row) => sum + row.total, 0);

  return [...kept, { label: `Other (${rows.length - limit})`, total: rest }];
}
