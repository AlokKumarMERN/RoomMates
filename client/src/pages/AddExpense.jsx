import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SplitEditor, {
  buildParticipants,
  emptySplit,
  splitProblem,
} from '../components/expense/SplitEditor.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import * as expenseApi from '../services/expense.service.js';
import { CATEGORIES } from '../utils/categories.js';
import { fieldErrorsFrom } from '../utils/formErrors.js';
import { toPaise } from '../utils/money.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function AddExpense() {
  const { user } = useAuth();
  const { activeRoom } = useRoom();
  const navigate = useNavigate();

  const activeMembers = useMemo(
    () => activeRoom?.members.filter((member) => member.isActive) ?? [],
    [activeRoom],
  );

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(today);
  const [paidBy, setPaidBy] = useState(user?.id ?? '');
  const [notes, setNotes] = useState('');
  const [split, setSplit] = useState(() => emptySplit());

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Members arrive with the room, which may still be loading on first paint —
  // and switching rooms mid-form must not leave the previous room's people
  // selected. Both are the same reset.
  //
  // It keys off the member ids themselves, not the room object: the rooms list
  // is refetched after several actions, and every refetch produces new object
  // identities. Depending on those would clear a half-filled form for no reason.
  const memberIdKey = activeMembers.map((member) => member.user.id).join(',');

  useEffect(() => {
    setSplit(emptySplit(memberIdKey ? memberIdKey.split(',') : []));
    setPaidBy(user?.id ?? '');
  }, [memberIdKey, user?.id]);

  const amountPaise = toPaise(amount);
  const isAmountValid = Number.isInteger(amountPaise) && amountPaise > 0;
  const problem = splitProblem(split, isAmountValid ? amountPaise : null);
  const canSubmit = isAmountValid && description.trim().length >= 2 && !problem;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!canSubmit) {
      // The button is disabled, so this is the keyboard-submit path.
      setFormError(problem ?? 'Add an amount and a short description first.');
      return;
    }

    setIsSubmitting(true);

    try {
      await expenseApi.createExpense(activeRoom.id, {
        amount: amountPaise,
        description: description.trim(),
        category,
        date,
        notes: notes.trim() || undefined,
        splitType: split.splitType,
        participants: buildParticipants(split, amountPaise),
        paidBy,
      });

      navigate('/expenses', { replace: true });
    } catch (error) {
      const details = fieldErrorsFrom(error);
      setFieldErrors(details);

      // Split problems come back keyed to a participant row ("participants.2.amount"),
      // which no single input on this form owns. Surface those at the top
      // rather than silently dropping them.
      const unattached = Object.entries(details).filter(([field]) => field.includes('.'));
      setFormError(unattached[0]?.[1] ?? details.participants ?? details.paidBy ?? error.message);
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Add an expense</h1>
      <p className="mt-1.5 text-slate-600">
        Adding to <span className="font-medium text-slate-900">{activeRoom.name}</span>
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-negative-50 px-3.5 py-2.5 text-sm text-negative-700"
          >
            {formError}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Amount"
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="500.50"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={fieldErrors.amount}
            hint="In rupees"
            autoFocus
            required
          />

          <div>
            <label htmlFor="expense-date" className="block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
            <p className="mt-1.5 text-sm text-slate-500">When it was spent</p>
          </div>
        </div>

        <Input
          label="Description"
          name="description"
          placeholder="Dinner at the corner place"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={fieldErrors.description}
          maxLength={120}
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            error={fieldErrors.category}
            options={CATEGORIES.map((item) => ({
              value: item.value,
              label: `${item.icon}  ${item.label}`,
            }))}
          />

          <Select
            label="Paid by"
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            error={fieldErrors.paidBy}
            options={activeMembers.map((member) => ({
              value: member.user.id,
              label: member.user.id === user?.id ? `${member.user.name} (you)` : member.user.name,
            }))}
          />
        </div>

        <SplitEditor
          members={activeMembers}
          value={split}
          onChange={setSplit}
          amountPaise={isAmountValid ? amountPaise : null}
          currentUserId={user?.id}
        />

        <Input
          label="Note"
          name="notes"
          placeholder="Optional — anything worth remembering"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={fieldErrors.notes}
          maxLength={500}
        />

        <div className="flex gap-2.5 pt-1">
          <Button type="submit" className="flex-1" isLoading={isSubmitting} disabled={!canSubmit}>
            {isSubmitting ? 'Saving…' : 'Add expense'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/expenses')}>
            Cancel
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        The split is recorded as it stands today. Someone joining the room later will not change
        this expense.
      </p>
    </div>
  );
}
