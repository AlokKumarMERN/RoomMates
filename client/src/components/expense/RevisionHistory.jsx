import { categoryOf } from '../../utils/categories.js';
import { formatINR } from '../../utils/money.js';
import { formatExpenseDate } from './ExpenseRow.jsx';

/**
 * What this expense used to say.
 *
 * Spec §8 asks for the original value, the new value, who changed it and when.
 * Each revision carries only the fields that actually moved, so the list reads
 * as a sequence of small, specific statements rather than two full copies of
 * the expense with the reader left to spot the difference.
 */

const FIELD_LABELS = {
  amount: 'Amount',
  description: 'Description',
  category: 'Category',
  date: 'Date',
  notes: 'Note',
  splitType: 'Split method',
  paidBy: 'Paid by',
  shares: 'Split between',
};

const SPLIT_LABELS = {
  equal: 'Equally',
  custom: 'By amount',
  percentage: 'By percentage',
};

/** One field's value, rendered the way that field is normally read. */
function FieldValue({ field, value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic">nothing</span>;
  }

  if (field === 'amount') {
    return <span className="tabular font-medium">{formatINR(value)}</span>;
  }

  if (field === 'date') {
    return <span>{formatExpenseDate(value)}</span>;
  }

  if (field === 'category') {
    const category = categoryOf(value);
    return (
      <span>
        {category.icon} {category.label}
      </span>
    );
  }

  if (field === 'splitType') {
    return <span>{SPLIT_LABELS[value] ?? value}</span>;
  }

  if (field === 'paidBy' || field === 'shares') {
    return (
      <ul className="space-y-0.5">
        {value.map((row) => (
          <li key={row.user} className="flex justify-between gap-3">
            <span className="truncate">{row.name ?? 'Someone'}</span>
            <span className="tabular shrink-0">{formatINR(row.amount)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <span className="break-words">{String(value)}</span>;
}

function timestamp(value) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RevisionHistory({ revisions, currentUserId }) {
  if (revisions.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-sm text-slate-500">
        This expense has not been edited.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-slate-100">
      {revisions.map((revision) => (
        <li key={revision.id} className="px-5 py-4">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">
              {revision.editedBy?.id === currentUserId
                ? 'You'
                : (revision.editedBy?.name ?? 'Someone')}
            </span>{' '}
            changed{' '}
            {revision.changedFields
              .map((field) => (FIELD_LABELS[field] ?? field).toLowerCase())
              .join(', ')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{timestamp(revision.createdAt)}</p>

          <dl className="mt-3 space-y-2.5">
            {revision.changedFields.map((field) => (
              <div key={field}>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  {FIELD_LABELS[field] ?? field}
                </dt>
                <dd className="mt-1 grid gap-1.5 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-3">
                  {/* The old value stays legible rather than being struck
                      through — it is the record, not a mistake to cross out. */}
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500">
                    <FieldValue field={field} value={revision.previousData?.[field]} />
                  </div>
                  <span className="hidden self-center text-slate-400 sm:block" aria-hidden="true">
                    →
                  </span>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-900">
                    <FieldValue field={field} value={revision.newData?.[field]} />
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}
