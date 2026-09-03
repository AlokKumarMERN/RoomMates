import { formatINR } from '../../utils/money.js';

/**
 * The five headline numbers (plan §6).
 *
 * A KPI row of stat tiles rather than a chart: five unrelated scalars have no
 * shared axis, and a grouped bar chart of "total" beside "average per person"
 * would invite a comparison that means nothing.
 *
 * Values use the font's default proportional figures. `tabular-nums` is for
 * columns that have to line up vertically — on a large standalone number it
 * gives every digit the width of a zero and makes 121 look gappy.
 */

const TONES = {
  neutral: 'text-slate-900',
  positive: 'text-positive-700',
  negative: 'text-negative-700',
};

function StatTile({ label, value, hint, tone = 'neutral' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${TONES[tone]}`}>{value}</p>
      {/* Reserved even when empty so the five tiles keep a common baseline. */}
      <p className="mt-0.5 truncate text-xs text-slate-500">{hint || ' '}</p>
    </div>
  );
}

/** "to Aman", "to Aman and 2 others" — who the money actually goes to. */
function counterparties(payments, direction) {
  if (payments.length === 0) return '';

  const names = payments.map((payment) =>
    (direction === 'to' ? payment.to : payment.from)?.name?.split(' ')[0] ?? 'someone',
  );

  const preposition = direction === 'to' ? 'to' : 'from';

  if (names.length === 1) return `${preposition} ${names[0]}`;
  if (names.length === 2) return `${preposition} ${names[0]} and ${names[1]}`;
  return `${preposition} ${names[0]} and ${names.length - 1} others`;
}

export default function SummaryCards({ summary }) {
  const { totals, you } = summary;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile
        label="Total spent"
        value={formatINR(totals.total, { showDecimals: false })}
        hint={`${totals.expenseCount} ${totals.expenseCount === 1 ? 'expense' : 'expenses'}`}
      />
      <StatTile
        label="Your spending"
        value={formatINR(you.paid, { showDecimals: false })}
        hint={`your share ${formatINR(you.owed, { showDecimals: false })}`}
      />
      <StatTile
        label="Average per person"
        value={formatINR(totals.average, { showDecimals: false })}
        hint={`across ${totals.memberCount} ${totals.memberCount === 1 ? 'member' : 'members'}`}
      />
      <StatTile
        label="You owe"
        value={formatINR(you.totalOwed, { showDecimals: false })}
        hint={counterparties(you.owes, 'to')}
        tone={you.totalOwed > 0 ? 'negative' : 'neutral'}
      />
      <StatTile
        label="Owed to you"
        value={formatINR(you.totalToReceive, { showDecimals: false })}
        hint={counterparties(you.receives, 'from')}
        tone={you.totalToReceive > 0 ? 'positive' : 'neutral'}
      />
    </div>
  );
}
