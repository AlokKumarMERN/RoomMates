/**
 * What changed between two versions of an expense.
 *
 * Pure, like everything else in `calculation/`: plain objects in, plain objects
 * out, no Mongoose and no clock. The audit trail is only as trustworthy as this
 * function — a comparison that reports a change nobody made, or misses one
 * somebody did, produces a history that quietly lies — so it is unit-tested
 * rather than eyeballed.
 */

/** The fields a person can edit. Nothing derived, nothing automatic. */
export const EDITABLE_FIELDS = [
  'amount',
  'description',
  'category',
  'date',
  'notes',
  'splitType',
  'paidBy',
  'shares',
];

const idOf = (value) => String(value?._id ?? value);

/**
 * Rows of `{user, amount}` compared as a set, not a list.
 *
 * The split resolver returns participants in whatever order the client sent
 * them, so reordering the same people with the same amounts is not an edit and
 * must not be recorded as one. Comparing the arrays positionally would log a
 * change every time the form rebuilt its list.
 */
function sameRows(before = [], after = []) {
  if (before.length !== after.length) return false;

  const map = new Map(before.map((row) => [idOf(row.user), row.amount]));

  return after.every((row) => map.get(idOf(row.user)) === row.amount);
}

/** Rows normalised for storage, so a revision never holds a Mongoose document. */
function plainRows(rows = []) {
  return rows.map((row) => ({ user: idOf(row.user), amount: row.amount }));
}

function sameDate(before, after) {
  const beforeTime = before ? new Date(before).getTime() : null;
  const afterTime = after ? new Date(after).getTime() : null;
  return beforeTime === afterTime;
}

/** An absent note and an empty note are the same thing to a reader. */
function normaliseNote(value) {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' || trimmed == null ? null : trimmed;
}

/**
 * Compare two expense states.
 *
 * @param {object} before The expense as stored.
 * @param {object} after  The expense as it will be stored.
 * @returns {{changedFields: string[], previousData: object, newData: object}}
 *   `changedFields` is empty when nothing moved — the caller uses that to skip
 *   writing a revision, so re-saving an unchanged form does not litter the
 *   history with entries that show nothing.
 */
export function diffExpense(before, after) {
  const changedFields = [];
  const previousData = {};
  const newData = {};

  const record = (field, previous, next) => {
    changedFields.push(field);
    previousData[field] = previous;
    newData[field] = next;
  };

  for (const field of EDITABLE_FIELDS) {
    // A field the caller did not send is a field they did not touch.
    if (!(field in after)) continue;

    if (field === 'paidBy' || field === 'shares') {
      if (!sameRows(before[field], after[field])) {
        record(field, plainRows(before[field]), plainRows(after[field]));
      }
      continue;
    }

    if (field === 'date') {
      if (!sameDate(before.date, after.date)) {
        record('date', before.date ?? null, after.date ?? null);
      }
      continue;
    }

    if (field === 'notes') {
      const previous = normaliseNote(before.notes);
      const next = normaliseNote(after.notes);
      if (previous !== next) record('notes', previous, next);
      continue;
    }

    if (before[field] !== after[field]) {
      record(field, before[field] ?? null, after[field] ?? null);
    }
  }

  return { changedFields, previousData, newData };
}
