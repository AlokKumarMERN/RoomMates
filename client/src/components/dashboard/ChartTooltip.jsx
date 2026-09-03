import { formatINR } from '../../utils/money.js';

/**
 * One tooltip for every chart on the dashboard, so a hover reads the same
 * wherever it happens.
 *
 * Recharts renders this itself; `active` and `payload` come from it.
 */
export default function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const heading = labelFormatter ? labelFormatter(label, point.payload) : label;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{heading}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-slate-900">
        {formatINR(point.value)}
      </p>
      {point.payload?.count != null && (
        <p className="mt-0.5 text-xs text-slate-500">
          {point.payload.count} {point.payload.count === 1 ? 'expense' : 'expenses'}
        </p>
      )}
    </div>
  );
}
