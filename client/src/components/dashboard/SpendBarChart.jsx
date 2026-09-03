import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCompactINR } from '../../utils/money.js';
import { MAX_BAR_SIZE, SERIES, TICK } from './chartTheme.js';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Horizontal bars for "how much, per thing" — used for spend by member and
 * spend by category, which are the same question asked of two dimensions.
 *
 * Horizontal rather than vertical because the labels are names ("Electricity",
 * "Priya Sharma"): on a column chart they would have to be rotated or
 * truncated, and a chart you tilt your head to read is a chart nobody reads.
 *
 * Every bar is the same colour. Shading each one darker-where-bigger would
 * double-encode length as hue and spend the only free channel restating what
 * the bar already shows.
 *
 * The value rides the tip of each bar, so there is no x-axis and no gridlines
 * to draw — direct labels before gridlines. That only works while the labels
 * stay sparse, which is what `foldTail` upstream guarantees.
 */

/** Rows are 34px apart; the container grows with them rather than scrolling. */
const ROW_HEIGHT = 34;
const MIN_HEIGHT = 120;

export default function SpendBarChart({ data, labelWidth = 96 }) {
  const height = Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT + 12);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 64, bottom: 4, left: 0 }}
        barCategoryGap="28%"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: '#f8fafc' }}
          // The row is a far bigger hit target than a 22px bar.
          isAnimationActive={false}
        />
        <Bar
          dataKey="total"
          fill={SERIES}
          // Rounded at the data end, square at the baseline.
          radius={[0, 4, 4, 0]}
          maxBarSize={MAX_BAR_SIZE}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="total"
            position="right"
            offset={8}
            formatter={formatCompactINR}
            style={{ fill: TICK.fill, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
