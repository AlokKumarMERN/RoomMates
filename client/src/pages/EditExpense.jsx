import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ExpenseForm, { formStateFrom } from '../components/expense/ExpenseForm.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import useToast from '../hooks/useToast.js';
import * as expenseApi from '../services/expense.service.js';

/**
 * Edit an expense you added.
 *
 * The creator check here is a courtesy, not the control — the API refuses
 * anyone else regardless. Someone who types the URL for another person's
 * expense gets a plain explanation rather than a form that would fail on save.
 */
export default function EditExpense() {
  const { expenseId } = useParams();
  const { user } = useAuth();
  const { activeRoom, refreshRoom } = useRoom();
  const toast = useToast();
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

  // Same reason as Add Expense: the split may be re-resolved on save, so the
  // roster it is resolved against has to be current rather than cached.
  useEffect(() => {
    if (activeRoom?.id) refreshRoom(activeRoom.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id, refreshRoom]);

  /**
   * Who may appear on the split after the edit: the room's current members,
   * plus anyone already on this expense. The server applies the same rule —
   * without the second half, an expense involving someone who has since moved
   * out could never be corrected again.
   */
  const members = useMemo(() => {
    if (!expense) return [];

    const byId = new Map();

    for (const member of activeRoom?.members ?? []) {
      if (member.isActive) byId.set(member.user.id, member);
    }

    for (const row of [...expense.shares, ...expense.paidBy]) {
      if (row.user?.id && !byId.has(row.user.id)) {
        byId.set(row.user.id, { user: row.user, isActive: false, tags: [] });
      }
    }

    return [...byId.values()];
  }, [expense, activeRoom]);

  const initial = useMemo(() => (expense ? formStateFrom(expense) : null), [expense]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!expense) {
    return (
      <Blocked
        title="Expense not found"
        message={error ?? 'It may have been removed, or belong to a room you are not in.'}
        onBack={() => navigate('/expenses')}
      />
    );
  }

  if (expense.createdBy?.id !== user?.id) {
    return (
      <Blocked
        title="Not your expense"
        message={`Only ${expense.createdBy?.name ?? 'the person who added it'} can edit this one. You can still see everything about it.`}
        onBack={() => navigate(`/expenses/${expense.id}`)}
        backLabel="View expense"
      />
    );
  }

  if (expense.isDeleted) {
    return (
      <Blocked
        title="This expense was removed"
        message="It is kept for the record and no longer counts towards any total, so it cannot be edited."
        onBack={() => navigate(`/expenses/${expense.id}`)}
        backLabel="View expense"
      />
    );
  }

  // The create form only ever produces a single payer, so it has one payer
  // picker. An expense with several payers cannot be represented in it, and
  // silently rewriting it to one payer would move real money — so the money
  // block is locked and everything else stays editable.
  const hasManyPayers = expense.paidBy.length > 1;

  const handleSubmit = async (values) => {
    await expenseApi.updateExpense(expense.id, values);
    toast.success('Saved. The previous values are kept in the edit history.');
    navigate(`/expenses/${expense.id}`, { replace: true });
  };

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to={`/expenses/${expense.id}`}
        className="text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        ← Back to expense
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Edit expense</h1>
      <p className="mt-1.5 text-slate-600">
        The previous values are kept on record, and the change is shown to everyone in the room.
      </p>

      <ExpenseForm
        key={expense.id}
        members={members}
        initial={initial}
        currentUserId={user?.id}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/expenses/${expense.id}`)}
        moneyLocked={hasManyPayers}
        moneyLockedReason="This expense was paid by more than one person. That split cannot be edited here yet — the description, category, date and note still can."
      />
    </div>
  );
}

function Blocked({ title, message, onBack, backLabel = 'Back to expenses' }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h1 className="text-base font-medium text-slate-900">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">{message}</p>
      <Button className="mt-6" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}
