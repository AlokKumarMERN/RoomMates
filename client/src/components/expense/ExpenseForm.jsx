import { useState } from 'react';

import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import SplitEditor, { buildParticipants, emptySplit, splitProblem } from './SplitEditor.jsx';
import { CATEGORIES } from '../../utils/categories.js';
import { fieldErrorsFrom } from '../../utils/formErrors.js';
import { toPaise, toRupees } from '../../utils/money.js';

/**
 * The expense form, shared by Add and Edit.
 *
 * One component rather than two near-identical ones: an amount field, a split
 * editor and a payer picker that had to be kept in step across two files would
 * drift, and the half that drifted would be the one nobody tested.
 *
 * It holds its own state and never resets it. A parent that needs a fresh form
 * — because the room changed, or a different expense loaded — remounts it with
 * a `key`. That is simpler than an effect watching for changes, and it cannot
 * wipe a half-filled form because an unrelated refetch produced new object
 * identities.
 */

const today = () => new Date().toISOString().slice(0, 10);

/** `YYYY-MM-DD` for the date input, which will not accept an ISO timestamp. */
const dateInputValue = (value) => new Date(value).toISOString().slice(0, 10);

/**
 * Turn a stored expense back into form state.
 *
 * A PERCENTAGE SPLIT COMES BACK AS AMOUNTS. Only the resolved shares are
 * stored, never the percentages that produced them — and they do not reliably
 * invert: 33.33% of ₹1,000 is stored as ₹333.34 after the leftover paise are
 * handed out, which reads back as 33.334%. Rather than show percentages that
 * are subtly wrong and re-split the expense on save, the exact stored amounts
 * are loaded as a custom split. Not a rupee moves; only the label changes, and
 * the form says so.
 */
export function formStateFrom(expense) {
  const isPercentage = expense.splitType === 'percentage';

  return {
    amount: String(toRupees(expense.amount)),
    description: expense.description,
    category: expense.category,
    date: dateInputValue(expense.date),
    notes: expense.notes ?? '',
    paidBy: expense.paidBy[0]?.user?.id ?? '',
    split: {
      splitType: isPercentage ? 'custom' : expense.splitType,
      participantIds: expense.shares.map((share) => share.user?.id),
      amounts: Object.fromEntries(
        expense.shares.map((share) => [share.user?.id, String(toRupees(share.amount))]),
      ),
      percentages: {},
    },
    wasPercentage: isPercentage,
  };
}

/** A blank form for a new expense. */
export function blankFormState({ memberIds = [], userId = '' } = {}) {
  return {
    amount: '',
    description: '',
    category: 'food',
    date: today(),
    notes: '',
    paidBy: userId,
    split: emptySplit(memberIds),
    wasPercentage: false,
  };
}

export default function ExpenseForm({
  members,
  initial,
  currentUserId,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
  /** Edit only: the money block is locked when the form cannot represent it. */
  moneyLocked = false,
  moneyLockedReason,
}) {
  const [amount, setAmount] = useState(initial.amount);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [date, setDate] = useState(initial.date);
  const [paidBy, setPaidBy] = useState(initial.paidBy);
  const [notes, setNotes] = useState(initial.notes);
  const [split, setSplit] = useState(initial.split);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountPaise = toPaise(amount);
  const isAmountValid = Number.isInteger(amountPaise) && amountPaise > 0;
  const problem = moneyLocked ? null : splitProblem(split, isAmountValid ? amountPaise : null);
  const canSubmit =
    (moneyLocked || isAmountValid) && description.trim().length >= 2 && !problem;

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
      await onSubmit({
        description: description.trim(),
        category,
        date,
        notes: notes.trim(),
        // Omitted entirely when locked, so a PATCH carries only what it may change.
        ...(moneyLocked
          ? {}
          : {
              amount: amountPaise,
              splitType: split.splitType,
              participants: buildParticipants(split, amountPaise),
              paidBy,
            }),
      });
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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      {formError && (
        <p role="alert" className="rounded-lg bg-negative-50 px-3.5 py-2.5 text-sm text-negative-700">
          {formError}
        </p>
      )}

      {moneyLocked && (
        <p className="rounded-lg bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
          {moneyLockedReason}
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
          disabled={moneyLocked}
          autoFocus={!moneyLocked}
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

        {!moneyLocked && (
          <Select
            label="Paid by"
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            error={fieldErrors.paidBy}
            options={members.map((member) => ({
              value: member.user.id,
              label:
                member.user.id === currentUserId ? `${member.user.name} (you)` : member.user.name,
            }))}
          />
        )}
      </div>

      {!moneyLocked && (
        <>
          {initial.wasPercentage && (
            <p className="rounded-lg bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
              This was split by percentage. The exact shares are shown as amounts, so nothing
              rounds differently when you save — switch back to percentages if you would rather
              redo the split.
            </p>
          )}

          <SplitEditor
            members={members}
            value={split}
            onChange={setSplit}
            amountPaise={isAmountValid ? amountPaise : null}
            currentUserId={currentUserId}
          />
        </>
      )}

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
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
