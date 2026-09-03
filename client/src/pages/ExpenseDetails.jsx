import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ConfirmButton from '../components/ConfirmButton.jsx';
import { formatExpenseDate } from '../components/expense/ExpenseRow.jsx';
import RevisionHistory from '../components/expense/RevisionHistory.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import useToast from '../hooks/useToast.js';
import * as expenseApi from '../services/expense.service.js';
import { categoryOf } from '../utils/categories.js';
import { formatINR } from '../utils/money.js';

const SPLIT_LABELS = {
  equal: 'Split equally',
  custom: 'Split by amount',
  percentage: 'Split by percentage',
};

const timestamp = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ExpenseDetails() {
  const { expenseId } = useParams();
  const { user } = useAuth();
  const { activeRoom } = useRoom();
  const toast = useToast();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [revisions, setRevisions] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  // Fetched on demand, not with the expense: most people never open the
  // history, and an audit query on every page view would be wasted work.
  const toggleHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    setShowHistory(true);
    if (revisions) return;

    setIsLoadingHistory(true);
    try {
      const data = await expenseApi.getExpenseHistory(expenseId);
      setRevisions(data.revisions);
    } catch (historyError) {
      setActionError(historyError.message);
      setShowHistory(false);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    setIsDeleting(true);

    try {
      const data = await expenseApi.deleteExpense(expenseId);
      setExpense(data.expense);
      toast.success('Removed. The record is kept and it no longer counts towards any total.');
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const isCreator = expense.createdBy?.id === user?.id;

  // Editing is creator-only; removing is also open to a room admin (spec §9).
  // The API decides either way — this only governs which buttons are worth
  // showing. The admin check needs the room, which is only to hand when the
  // expense belongs to the room currently selected.
  const isAdminHere =
    activeRoom?.id === expense.room &&
    activeRoom?.members?.find((member) => member.user?.id === user?.id)?.role === 'admin';

  const canEdit = isCreator && !expense.isDeleted;
  const canDelete = (isCreator || isAdminHere) && !expense.isDeleted;

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
          Removed
          {expense.deletedBy && (
            <> by {expense.deletedBy === user?.id ? 'you' : 'a room admin'}</>
          )}
          {expense.deletedAt && <> on {timestamp(expense.deletedAt)}</>}. It is kept for the record
          and is not counted in any total.
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700"
        >
          {actionError}
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

      {/* items-start: a one-payer card should not be stretched to the height
          of a three-way split beside it. */}
      <div className="mt-5 grid items-start gap-5 sm:grid-cols-2">
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

      {(canEdit || canDelete) && (
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <ConfirmButton
              onConfirm={handleDelete}
              isLoading={isDeleting}
              confirmLabel="Yes, remove it"
            >
              Remove
            </ConfirmButton>
          )}
          {/* Removing keeps the record, so say so before they click, not after. */}
          <span className="text-xs text-slate-500">
            Removing keeps the record and stops it counting towards any total.
          </span>
        </div>
      )}

      {expense.isEdited && (
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={toggleHistory}
            aria-expanded={showHistory}
            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <span>
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Edit history
              </span>
              {expense.editedAt && (
                <span className="ml-2 text-xs text-slate-500">
                  last edited {timestamp(expense.editedAt)}
                </span>
              )}
            </span>
            <span className="text-sm font-medium text-brand-600">
              {showHistory ? 'Hide' : 'Show'}
            </span>
          </button>

          {showHistory &&
            (isLoadingHistory ? (
              <div className="flex justify-center border-t border-slate-200 py-8">
                <Spinner className="size-6 text-brand-500" />
              </div>
            ) : (
              <div className="border-t border-slate-200">
                <RevisionHistory revisions={revisions ?? []} currentUserId={user?.id} />
              </div>
            ))}
        </section>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Added by {isCreator ? 'you' : expense.createdBy?.name} on {timestamp(expense.createdAt)}.
        This split was fixed when the expense was created and will not change if someone joins or
        leaves the room.
      </p>
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
