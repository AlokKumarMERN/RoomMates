import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { formatExpenseDate } from '../components/expense/ExpenseRow.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import * as expenseApi from '../services/expense.service.js';
import { categoryOf } from '../utils/categories.js';
import { formatINR } from '../utils/money.js';

const SPLIT_LABELS = {
  equal: 'Split equally',
  custom: 'Split by amount',
  percentage: 'Split by percentage',
};

export default function ExpenseDetails() {
  const { expenseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await expenseApi.getExpense(expenseId);
      setExpense(data.expense);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-base font-medium text-slate-900">Expense not found</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {error ?? 'It may have been removed, or belong to a room you are not in.'}
        </p>
        <Button className="mt-6" onClick={() => navigate('/expenses')}>
          Back to expenses
        </Button>
      </div>
    );
  }

  const category = categoryOf(expense.category);
  const myShare = expense.shares.find((share) => share.user?.id === user?.id)?.amount ?? 0;
  const iPaid = expense.paidBy
    .filter((row) => row.user?.id === user?.id)
    .reduce((total, row) => total + row.amount, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/expenses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Expenses
      </Link>

      <header className="mt-4 flex items-start gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-100 text-xl"
          aria-hidden="true"
        >
          {category.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            {expense.description}
            {expense.isEdited && (
              <span className="ml-2 align-middle rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                Edited
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {category.label} · {formatExpenseDate(expense.date)} ·{' '}
            {SPLIT_LABELS[expense.splitType] ?? 'Split'}
          </p>
        </div>
        <p className="tabular shrink-0 text-2xl font-semibold text-slate-900">
          {formatINR(expense.amount)}
        </p>
      </header>

      {expense.isDeleted && (
        <p className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          This expense was removed. It is kept for the record and is not counted in any total.
        </p>
      )}

      {/* What this means for the person reading it, before the detail. */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">You</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Your share</p>
            <p className="tabular mt-0.5 text-lg font-semibold text-slate-900">
              {formatINR(myShare)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">You paid</p>
            <p className="tabular mt-0.5 text-lg font-semibold text-slate-900">
              {formatINR(iPaid)}
            </p>
          </div>
        </div>
        {myShare === 0 && iPaid === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            You were not part of this one — it does not affect what you owe.
          </p>
        )}
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Paid by
          </h2>
          <ul className="divide-y divide-slate-100">
            {expense.paidBy.map((row) => (
              <PersonAmountRow
                key={row.user?.id}
                person={row.user}
                amount={row.amount}
                isMe={row.user?.id === user?.id}
              />
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Split between
          </h2>
          <ul className="divide-y divide-slate-100">
            {expense.shares.map((share) => (
              <PersonAmountRow
                key={share.user?.id}
                person={share.user}
                amount={share.amount}
                isMe={share.user?.id === user?.id}
              />
            ))}
          </ul>
        </section>
      </div>

      {expense.notes && (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Note</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{expense.notes}</p>
        </section>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Added by {expense.createdBy?.id === user?.id ? 'you' : expense.createdBy?.name} on{' '}
        {new Date(expense.createdAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        . This split was fixed when the expense was created and will not change if someone joins or
        leaves the room.
      </p>

      {expense.createdBy?.id === user?.id && (
        <p className="mt-2 text-xs text-slate-500">
          Editing and removing your own expenses — with the previous values kept on record — arrives
          in Phase 7.
        </p>
      )}
    </div>
  );
}

function PersonAmountRow({ person, amount, isMe }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700"
        aria-hidden="true"
      >
        {person?.name?.[0]?.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
        {person?.name ?? 'Unknown'}
        {isMe && <span className="ml-1.5 text-slate-400">(you)</span>}
      </span>
      <span className="tabular shrink-0 text-sm font-medium text-slate-900">
        {formatINR(amount)}
      </span>
    </li>
  );
}
