import { useMemo } from 'react';

import { formatINR, toPaise } from '../../utils/money.js';
import { previewEqualShares, previewPercentageShares } from '../../utils/split.js';

/**
 * Who shares an expense, and how it divides between them.
 *
 * The whole split lives in one `value` object owned by the parent form:
 *
 *   { splitType, participantIds: [], amounts: {userId: "500.50"}, percentages: {userId: "33.33"} }
 *
 * `amounts` and `percentages` are kept as the strings the user typed, not
 * numbers. Storing them parsed would mean "0." or "33." — halfway through
 * typing — either vanishing or becoming 0 under the cursor.
 *
 * Every figure shown here is a preview. The server re-resolves the split when
 * it stores the expense, and its answer is the one that counts; this mirrors
 * the same allocation so the two always agree.
 */

const SPLIT_METHODS = [
  { value: 'equal', label: 'Equally', hint: 'Same share each' },
  { value: 'custom', label: 'By amount', hint: 'Type each person’s share' },
  { value: 'percentage', label: 'By percent', hint: 'Split by percentage' },
];

/** The empty split: everyone in, divided equally. */
export function emptySplit(memberIds = []) {
  return {
    splitType: 'equal',
    participantIds: memberIds,
    amounts: {},
    percentages: {},
  };
}

/**
 * Turn the editor's state into the `participants` array the API expects.
 * Returns null when the split is not yet complete enough to send.
 */
export function buildParticipants(value, amountPaise) {
  if (!value.participantIds.length || !amountPaise) return null;

  if (value.splitType === 'equal') {
    return value.participantIds.map((user) => ({ user }));
  }

  if (value.splitType === 'custom') {
    return value.participantIds.map((user) => ({
      user,
      amount: toPaise(value.amounts[user] ?? '') ?? 0,
    }));
  }

  return value.participantIds.map((user) => ({
    user,
    percentage: Number(value.percentages[user] ?? 0),
  }));
}

/**
 * What is still wrong with the split, in the user's terms — or null if it is
 * ready to submit. The server checks all of this again; doing it here as well
 * is what lets the form say "₹50 left to assign" instead of bouncing a request.
 */
export function splitProblem(value, amountPaise) {
  if (!value.participantIds.length) return 'Choose at least one person to split this between.';
  if (!amountPaise) return null;

  if (value.splitType === 'custom') {
    const assigned = value.participantIds.reduce(
      (total, user) => total + (toPaise(value.amounts[user] ?? '') ?? 0),
      0,
    );
    const difference = amountPaise - assigned;

    if (difference > 0) return `${formatINR(difference)} still to assign.`;
    if (difference < 0) return `${formatINR(-difference)} more than the total.`;
  }

  if (value.splitType === 'percentage') {
    const total = value.participantIds.reduce(
      (sum, user) => sum + (Number(value.percentages[user]) || 0),
      0,
    );
    // Compare on basis points: 33.33 + 33.33 + 33.34 is not exactly 100 in
    // floating point, and refusing a split that adds up would be maddening.
    const basisPoints = Math.round(total * 100);

    if (basisPoints !== 10000) {
      return `Percentages add up to ${Math.round(total * 100) / 100}%, not 100%.`;
    }
  }

  return null;
}

export default function SplitEditor({ members, value, onChange, amountPaise, currentUserId }) {
  const memberIds = members.map((member) => member.user.id);

  const tags = useMemo(() => {
    const all = members.flatMap((member) => member.tags ?? []);
    return [...new Set(all)];
  }, [members]);

  const selected = new Set(value.participantIds);

  const update = (patch) => onChange({ ...value, ...patch });

  const setParticipants = (ids) => {
    // Keep the room's own order rather than click order, so the list does not
    // reshuffle as people are ticked and unticked.
    update({ participantIds: memberIds.filter((id) => ids.includes(id)) });
  };

  const toggle = (userId) => {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setParticipants([...next]);
  };

  const preview = useMemo(() => {
    if (!amountPaise) return {};

    if (value.splitType === 'equal') {
      return previewEqualShares(amountPaise, value.participantIds);
    }

    if (value.splitType === 'percentage') {
      return previewPercentageShares(
        amountPaise,
        Object.fromEntries(
          value.participantIds.map((user) => [user, Number(value.percentages[user]) || 0]),
        ),
      );
    }

    return Object.fromEntries(
      value.participantIds.map((user) => [user, toPaise(value.amounts[user] ?? '') ?? 0]),
    );
  }, [amountPaise, value]);

  const problem = splitProblem(value, amountPaise);

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Split</legend>

      {/* Method */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
        {SPLIT_METHODS.map((method) => {
          const isActive = value.splitType === method.value;
          return (
            <button
              key={method.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => update({ splitType: method.value })}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {method.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {SPLIT_METHODS.find((method) => method.value === value.splitType)?.hint}
      </p>

      {/* Shortcuts. Tags are what make the veg / non-veg case a two-click job
          rather than five clicks and a mistake. */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <ShortcutButton
          label="Everyone"
          isActive={selected.size === memberIds.length}
          onClick={() => setParticipants(memberIds)}
        />
        <ShortcutButton
          label="Only me"
          isActive={selected.size === 1 && selected.has(currentUserId)}
          onClick={() => setParticipants([currentUserId])}
        />
        {tags.map((tag) => {
          const tagged = members
            .filter((member) => member.tags?.includes(tag))
            .map((member) => member.user.id);

          return (
            <ShortcutButton
              key={tag}
              label={tag}
              isActive={tagged.length === selected.size && tagged.every((id) => selected.has(id))}
              onClick={() => setParticipants(tagged)}
            />
          );
        })}
      </div>

      {/* Members */}
      <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
        {members.map((member) => {
          const userId = member.user.id;
          const isSelected = selected.has(userId);

          return (
            <li
              key={userId}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${isSelected ? 'bg-white' : 'bg-slate-50'}`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(userId)}
                  className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700"
                  aria-hidden="true"
                >
                  {member.user.name?.[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 truncate text-sm text-slate-700">
                  {member.user.name}
                  {userId === currentUserId && <span className="ml-1 text-slate-400">(you)</span>}
                </span>
              </label>

              {isSelected && (
                <div className="flex shrink-0 items-center gap-2">
                  {value.splitType === 'custom' && (
                    <SmallAmountInput
                      prefix="₹"
                      label={`${member.user.name}'s share in rupees`}
                      value={value.amounts[userId] ?? ''}
                      onChange={(next) =>
                        update({ amounts: { ...value.amounts, [userId]: next } })
                      }
                    />
                  )}

                  {value.splitType === 'percentage' && (
                    <SmallAmountInput
                      suffix="%"
                      label={`${member.user.name}'s percentage`}
                      value={value.percentages[userId] ?? ''}
                      onChange={(next) =>
                        update({ percentages: { ...value.percentages, [userId]: next } })
                      }
                    />
                  )}

                  <span className="tabular w-20 text-right text-sm font-medium text-slate-900">
                    {amountPaise ? formatINR(preview[userId] ?? 0) : '—'}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className={`mt-2 text-sm ${problem ? 'text-negative-700' : 'text-slate-500'}`}>
        {problem ??
          (selected.size > 0 &&
            `${selected.size} ${selected.size === 1 ? 'person' : 'people'} sharing this.`)}
      </p>
    </fieldset>
  );
}

function ShortcutButton({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-brand-50 text-brand-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

/** Narrow numeric field used inside a member row. Labelled for screen readers only. */
function SmallAmountInput({ value, onChange, label, prefix, suffix }) {
  return (
    <span className="flex items-center rounded-md border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      {prefix && <span className="pl-2 text-xs text-slate-500">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="tabular w-16 bg-transparent px-1.5 py-1 text-right text-sm text-slate-900 focus:outline-none"
      />
      {suffix && <span className="pr-2 text-xs text-slate-500">{suffix}</span>}
    </span>
  );
}
