import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ExpenseForm, { blankFormState } from '../components/expense/ExpenseForm.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import useToast from '../hooks/useToast.js';
import * as expenseApi from '../services/expense.service.js';

export default function AddExpense() {
  const { user } = useAuth();
  const { activeRoom, refreshRoom } = useRoom();
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * Confirm the roster before offering to split anything.
   *
   * The cached room can be minutes or hours old, and somebody may have joined
   * in that time. Splitting between "everyone" against a stale list writes an
   * expense that leaves a roommate out — real money, silently wrong — so this
   * page waits for a fresh answer rather than rendering a form built on a
   * guess.
   */
  const [isSyncingRoom, setIsSyncingRoom] = useState(true);
  const roomId = activeRoom?.id;

  useEffect(() => {
    if (!roomId) {
      setIsSyncingRoom(false);
      return undefined;
    }

    let cancelled = false;
    setIsSyncingRoom(true);

    refreshRoom(roomId).finally(() => {
      if (!cancelled) setIsSyncingRoom(false);
    });

    // Keyed on the id, not the room object: refreshing replaces that object,
    // and depending on it would re-run this effect for ever.
    return () => {
      cancelled = true;
    };
  }, [roomId, refreshRoom]);

  const activeMembers = useMemo(
    () => activeRoom?.members.filter((member) => member.isActive) ?? [],
    [activeRoom],
  );

  const initial = useMemo(
    () =>
      blankFormState({
        memberIds: activeMembers.map((member) => member.user.id),
        userId: user?.id ?? '',
      }),
    [activeMembers, user?.id],
  );

  if (isSyncingRoom && activeRoom) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-base font-medium text-slate-900">No room selected</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
          An expense belongs to a room. Pick one first.
        </p>
        <Link
          to="/rooms"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          My rooms
        </Link>
      </section>
    );
  }

  const handleSubmit = async (values) => {
    await expenseApi.createExpense(activeRoom.id, {
      ...values,
      notes: values.notes || undefined,
    });

    // The toast is the confirmation, because the page it happened on is gone.
    toast.success('Expense added. Everyone in the room has been notified.');
    navigate('/expenses', { replace: true });
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Add an expense</h1>
      <p className="mt-1.5 text-slate-600">
        Adding to <span className="font-medium text-slate-900">{activeRoom.name}</span>
      </p>

      {/*
        Keyed on the room, not on its members. Remounting on a roster change
        would wipe a half-filled form the moment somebody joined; instead the
        form stays put and the new person appears in the split list unticked,
        which is the honest default — nobody should be added to a split you are
        composing without you saying so.
      */}
      <ExpenseForm
        key={roomId}
        members={activeMembers}
        initial={initial}
        currentUserId={user?.id}
        submitLabel="Add expense"
        submittingLabel="Saving…"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/expenses')}
      />

      <p className="mt-6 text-center text-xs text-slate-500">
        The split is recorded as it stands today. Someone joining the room later will not change
        this expense.
      </p>
    </div>
  );
}
