/**
 * Chart tokens.
 *
 * Recharts takes concrete colours, not Tailwind classes, so the handful the
 * charts need are mirrored here from `src/index.css`. Keep them in step with
 * the `@theme` block — these are the same values, not a second palette.
 *
 * WHY EVERY CHART IS A SINGLE SERIES. Spend by member, spend by category and
 * spend over time each plot one measure. That makes the colour job *sequential*
 * — one hue — not categorical, so there is no palette of eight to tell apart
 * and no legend to read: the card's title already names what is plotted. It also
 * sidesteps the trap of colouring each bar darker-where-bigger, which would
 * double-encode bar length as hue and spend the only free channel restating
 * something the chart already shows.
 *
 * The brand blue is deliberately low-chroma (see index.css — "a calm steel
 * blue"). For a categorical palette that would be a problem, because slots have
 * to stay apart from each other; for a lone series it only has to clear contrast
 * against the card, which it does at 4.4:1.
 */

/** The one data hue. brand-500. */
export const SERIES = '#3878a6';

/** A wash, never a saturated block — the area fill under the line. */
export const SERIES_WASH = 'rgba(56, 120, 166, 0.10)';

/** Money semantics, matching the rest of the app: owed to you / you owe. */
export const POSITIVE = '#0f7b57';
export const NEGATIVE = '#b91c1c';

/** Chrome. Hairline, solid, one step off the surface — never dashed. */
export const GRID = '#e2e8f0';
export const AXIS_TEXT = '#64748b';
export const SURFACE = '#ffffff';

/** Axis and tick text. Tabular figures so ticks line up. */
export const TICK = {
  fill: AXIS_TEXT,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

/** Bars never fill their band — the leftover is air (max 24px thick). */
export const MAX_BAR_SIZE = 22;
