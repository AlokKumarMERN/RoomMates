import { useId, useState } from 'react';

import { formatINR } from '../../utils/money.js';

/**
 * The frame every chart sits in.
 *
 * Its real job is the table toggle. A tooltip must never be the only way to
 * read a value — someone using a keyboard, a screen reader, or a printout has
 * no hover — so every chart here ships with a table twin carrying the same
 * numbers. It is a toggle rather than a permanently visible table because the
 * chart is the point; the table is the guarantee.
 */
export default function ChartCard({
  title,
  hint,
  rows = [],
  valueHeading = 'Amount',
  labelHeading = 'Name',
  children,
  emptyMessage = 'Nothing to show yet.',
}) {
  const [showTable, setShowTable] = useState(false);
  const bodyId = useId();

  const isEmpty = rows.length === 0;

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={() => setShowTable((shown) => !shown)}
            aria-expanded={showTable}
            aria-controls={bodyId}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>

      <div id={bodyId} className="mt-4 flex-1">
        {isEmpty ? (
          <p className="py-10 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 font-medium text-slate-500">{labelHeading}</th>
                  <th className="pb-2 text-right font-medium text-slate-500">{valueHeading}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 text-slate-700">{row.label}</td>
                    <td className="tabular py-2 text-right font-medium text-slate-900">
                      {formatINR(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
