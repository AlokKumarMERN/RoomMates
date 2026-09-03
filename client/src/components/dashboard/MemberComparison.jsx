import { formatINR, formatSignedINR } from '../../utils/money.js';

/**
 * The member comparison table (spec §11).
 *
 * TWO COLUMNS THAT LOOK ALIKE AND ARE NOT — the reason they are styled
 * differently rather than both in red and green:
 *
 *   Balance     paid − owed. Real money. Someone has to hand it over.
 *   vs average  paid − the room average. A description of spending habits.
 *               Nobody settles against it.
 *
 * They only agree when every expense was split equally between everybody. So
 * Balance wears the app's money semantics (green = owed to them, red = they
 * owe) and "vs average" wears a neutral deviation bar. Painting both in the
 * same red and green is how a dashboard ends up implying a debt that the
 * settlement never mentions.
 *
 * PAISE ARE SHOWN, not rounded away. Paid minus Their share is Balance, and a
 * reader will check that — round the first two and the row stops adding up
 * (₹35,270 − ₹12,251 is ₹23,019, but the balance is ₹23,018.85). Rounding is
 * fine on a headline card that nobody subtracts; it is not fine in a column
 * that invites the arithmetic.
 *
 * On a narrow screen the two middle columns drop out. Balance is what the
 * reader came for and it must never be the column that falls off the edge.
 */

const STANDING_LABEL = {
  above: 'Above average',
  near: 'About average',
  below: 'Below average',
};

/**
 * A bar growing left or right from a centre line, scaled against the largest
 * deviation in the room — so the widest bar is always full and the rest are
 * legible relative to it.
 */
function DeviationBar({ difference, scale, standing }) {
  const width = scale > 0 ? Math.min(100, (Math.abs(difference) / scale) * 100) : 0;
  const isAbove = difference > 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative hidden h-1.5 w-24 sm:block" aria-hidden="true">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
        {standing !== 'near' && (
          <span
            className={`absolute top-0 h-1.5 rounded-sm ${
              isAbove ? 'left-1/2 bg-brand-500' : 'right-1/2 bg-slate-400'
            }`}
            style={{ width: `${width / 2}%` }}
          />
        )}
      </div>
      <span className="tabular text-sm text-slate-600">
        {standing === 'near' ? '—' : formatSignedINR(difference)}
      </span>
    </div>
  );
}

function BalanceCell({ balance }) {
  if (balance === 0) {
    return <span className="text-sm text-slate-500">settled</span>;
  }

  const isCredit = balance > 0;

  return (
    <div className="flex flex-col items-end">
      <span
        // nowrap: on a narrow column the sign would otherwise break onto its
        // own line and read as a stray character above the amount.
        className={`tabular text-sm font-semibold whitespace-nowrap ${
          isCredit ? 'text-positive-700' : 'text-negative-700'
        }`}
      >
        {formatSignedINR(balance)}
      </span>
      <span className="text-xs text-slate-500">{isCredit ? 'is owed' : 'owes'}</span>
    </div>
  );
}

export default function MemberComparison({ members, currentUserId }) {
  const scale = Math.max(...members.map((row) => Math.abs(row.difference)), 0);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Who spent what</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Balance is real money owed. &ldquo;vs average&rdquo; only compares spending habits.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-5 py-2.5 font-medium text-slate-500">Member</th>
              <th className="px-5 py-2.5 text-right font-medium text-slate-500">Paid</th>
              <th className="hidden px-5 py-2.5 text-right font-medium text-slate-500 md:table-cell">
                Their share
              </th>
              <th className="hidden px-5 py-2.5 font-medium text-slate-500 sm:table-cell">
                vs average
              </th>
              <th className="px-5 py-2.5 text-right font-medium text-slate-500">Balance</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {members.map((row) => (
              <tr key={row.user.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700"
                      aria-hidden="true"
                    >
                      {row.user.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="font-medium text-slate-900">
                      {row.user.id === currentUserId ? 'You' : (row.user.name ?? 'Former member')}
                    </span>
                    {/* Someone who left still owes what they owed — spec §29. */}
                    {!row.isActive && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                        Left
                      </span>
                    )}
                  </div>
                </td>

                <td className="tabular px-5 py-3 text-right whitespace-nowrap text-slate-900">
                  {formatINR(row.paid)}
                </td>
                <td className="tabular hidden px-5 py-3 text-right text-slate-600 md:table-cell">
                  {formatINR(row.owed)}
                </td>

                <td className="hidden px-5 py-3 sm:table-cell">
                  <DeviationBar
                    difference={row.difference}
                    scale={scale}
                    standing={row.standing}
                  />
                  <span className="sr-only">{STANDING_LABEL[row.standing]}</span>
                </td>

                <td className="px-5 py-3 text-right">
                  <BalanceCell balance={row.balance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
