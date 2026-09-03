import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCompactINR } from '../../utils/money.js';
import { GRID, SERIES, SERIES_WASH, TICK } from './chartTheme.js';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Room spending over time — one series, so an area rather than a line: the
 * wash under the curve reads as accumulated spend without needing a second
 * colour or a legend.
 *
 * The series arrives already densified and, over long ranges, rolled up into
 * months (see utils/series.js). Drawing a straight line between two points a
 * fortnight apart would invent a fortnight of steady spending that never
 * happened.
 */

const DAY_LABEL = { day: 'numeric', month: 'short' };
const MONTH_LABEL = { month: 'short', year: '2-digit' };

function formatTick(value, granularity) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    ...(granularity === 'month' ? MONTH_LABEL : DAY_LABEL),
  });
}

export default function SpendOverTimeChart({ points, granularity = 'day' }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        {/* Horizontal only, hairline, solid — the y values are what need reading
            off; vertical rules would just add ink. */}
        <CartesianGrid vertical={false} stroke={GRID} />

        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatTick(value, granularity)}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          // Let Recharts drop ticks rather than overlap them.
          minTickGap={28}
        />
        <YAxis
          tickFormatter={formatCompactINR}
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={56}
        />

        <Tooltip
          content={
            <ChartTooltip labelFormatter={(value) => formatTick(value, granularity)} />
          }
          cursor={{ stroke: GRID, strokeWidth: 1 }}
          isAnimationActive={false}
        />

        <Area
          type="monotone"
          dataKey="total"
          stroke={SERIES}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={SERIES_WASH}
          // A dot per day is noise at 60 points; the tooltip carries the values.
          dot={false}
          activeDot={{ r: 4, fill: SERIES, stroke: '#ffffff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
