import { Link } from 'react-router-dom';

import { categoryOf } from '../../utils/categories.js';
import { formatINR } from '../../utils/money.js';

/** "12 Sep" for this year, "12 Sep 2025" for anything older. */
export function formatExpenseDate(value) {
  const date = new Date(value);
  const isThisYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
  });
}

/** Names of the payers, joined the way a person would say them. */
function payerNames(expense, currentUserId) {
  const names = expense.paidBy.map((row) =>
    row.user?.id === currentUserId ? 'You' : (row.user?.name?.split(' ')[0] ?? 'Someone'),
  );

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} others`;
}

export default function ExpenseRow({ expense, currentUserId }) {
  const category = categoryOf(expense.category);
  const myShare = expense.shares.find((share) => share.user?.id === currentUserId)?.amount ?? 0;
  const iPaid = expense.paidBy.some((row) => row.user?.id === currentUserId);

  return (
    <li>
      <Link
        to={`/expenses/${expense.id}`}
        // A removed expense is dimmed rather than hidden. The history page can
        // summon these, and a row that looked identical to a live one would be
        // actively misleading about what still counts.
        className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-slate-50 ${
          expense.isDeleted ? 'opacity-60' : ''
        }`}
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-base"
          aria-hidden="true"
          title={category.label}
        >
          {category.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {expense.description}
            {expense.isEdited && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                Edited
              </span>
            )}
            {expense.isDeleted && (
              <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-600 uppercase">
                Removed
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {payerNames(expense, currentUserId)} paid · {formatExpenseDate(expense.date)} ·{' '}
            {expense.shares.length} {expense.shares.length === 1 ? 'share' : 'ways'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`tabular text-sm font-semibold ${
              expense.isDeleted ? 'text-slate-500 line-through' : 'text-slate-900'
            }`}
          >
            {formatINR(expense.amount)}
          </p>
          <p className="tabular mt-0.5 text-xs text-slate-500">
            {expense.isDeleted ? (
              <>not counted</>
            ) : myShare > 0 ? (
              <>your share {formatINR(myShare)}</>
            ) : iPaid ? (
              <>not your split</>
            ) : (
              <>you’re not in this</>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}
