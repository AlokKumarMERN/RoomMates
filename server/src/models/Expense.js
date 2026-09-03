import mongoose from 'mongoose';

import { EXPENSE_CATEGORIES, MAX_AMOUNT_PAISE, SPLIT_TYPES } from '../utils/expense.constants.js';

/**
 * One row of "this person put in / owes this much", in integer paise.
 *
 * Used for both `paidBy` and `shares`. No `_id`: these are values, not entities
 * — nothing ever refers to one on its own.
 */
const amountRowSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Every amount must be at least one paise.'],
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole paise.',
      },
    },
  },
  { _id: false },
);

const expenseSchema = new mongoose.Schema(
  {
    // No `index: true` here: every compound index below starts with `room`, and
    // Mongo uses a compound index's prefix. A standalone one would be a second
    // structure to write on every insert, serving queries the others already do.
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Integer paise. Never rupees. See utils/money.js.
    amount: {
      type: Number,
      required: [true, 'An amount is required.'],
      min: [1, 'An expense must be more than zero.'],
      max: [MAX_AMOUNT_PAISE, 'That amount is larger than this app supports.'],
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole paise.',
      },
    },

    description: {
      type: String,
      required: [true, 'A description is required.'],
      trim: true,
      minlength: [2, 'Description must be at least 2 characters.'],
      maxlength: [120, 'Description must be 120 characters or fewer.'],
    },

    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other' },

    // When the money was actually spent, which is not when it was typed in —
    // people log yesterday's dinner this morning. Every report ranges on this.
    date: { type: Date, required: true, default: Date.now },

    /**
     * Who actually paid, and how much each of them put in. Sums to `amount`.
     * An array rather than a single ref because two people splitting the bill
     * at the counter is ordinary.
     */
    paidBy: {
      type: [amountRowSchema],
      required: true,
      validate: {
        validator: (rows) => rows.length > 0,
        message: 'Someone has to have paid.',
      },
    },

    /**
     * THE FROZEN SPLIT. Resolved once, at creation, and never recomputed.
     *
     * This is the single decision that makes historical accuracy automatic
     * (spec §3, §29; plan §2.1). Because each expense carries its own
     * participant list, a fifth person joining the room next month cannot
     * change what last month's dinner cost the four people who ate it. If
     * shares were derived from *current* membership at read time, every past
     * report would silently rewrite itself.
     *
     * Sums to `amount`, guaranteed by services/calculation/split.js.
     */
    shares: {
      type: [amountRowSchema],
      required: true,
      validate: {
        validator: (rows) => rows.length > 0,
        message: 'An expense has to be split between at least one person.',
      },
    },

    // Kept for display and for pre-filling the edit form. The shares above are
    // the truth; this only records how they were arrived at.
    splitType: { type: String, enum: SPLIT_TYPES, required: true },

    notes: { type: String, trim: true, maxlength: [500, 'Note must be 500 characters or fewer.'] },
    receiptUrl: { type: String, default: null },

    // Set in Phase 7, alongside the ExpenseRevision records. Declared now so
    // every query written in this phase already filters on them and no list
    // has to be revisited later to start hiding deleted rows.
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

/**
 * The room expense list — "this room, not deleted, newest first" — is the
 * single hottest query in the app. The compound index covers the filter and the
 * sort together.
 *
 * `createdAt` is in here because it is the sort's TIEBREAKER, not decoration.
 * Two expenses dated the same day need a stable order, so the list sorts by
 * `{date, createdAt}` — and an index that stops at `date` can satisfy the
 * filter but not that second key, which sends the whole matching set through an
 * in-memory sort. With 1,000 expenses `.explain()` showed 961 documents
 * examined to return 20; with `createdAt` appended it is 20. Past 32MB of
 * matches Mongo stops sorting in memory and fails the query outright, so this
 * is a correctness cliff and not only a speed one.
 *
 * One index serves both directions: Mongo walks a descending index backwards
 * for `{date: 1, createdAt: 1}`.
 */
expenseSchema.index({ room: 1, isDeleted: 1, date: -1, createdAt: -1 });

// "Expenses involving this person" is an $or over both sides of the
// transaction, and an $or is only as fast as its slowest branch — so both
// branches get an index rather than just the one.
expenseSchema.index({ room: 1, 'paidBy.user': 1, date: -1 });
expenseSchema.index({ room: 1, 'shares.user': 1, date: -1 });

// Sorting by amount is one of the four orders the history page offers. Without
// this, "largest first" filters on the date index and then sorts in memory,
// which Mongo refuses outright past 32MB. Serves both directions.
expenseSchema.index({ room: 1, isDeleted: 1, amount: -1 });

/**
 * There is deliberately NO text index.
 *
 * A `$text` search matches whole stemmed words, so typing "din" finds nothing
 * and "dinner" finds everything — which is unusable behind a box that searches
 * as you type. The history page uses a case-insensitive regex instead, run
 * inside the room filter above: the compound index narrows to one room's
 * expenses first, and the scan happens across those rather than the collection.
 * An index that nothing queries is not free — it costs a write on every
 * expense — so it is gone rather than left behind a comment promising it will
 * be used later.
 *
 * NOTE FOR ANY EXISTING DATABASE: removing an index from a schema does not drop
 * it from Mongo. A database created before this change still carries
 * `description_text_notes_text` and needs
 * `db.expenses.dropIndex('description_text_notes_text')` once, by hand.
 */

/** Total paid by one member on this expense (0 if they did not pay). */
expenseSchema.methods.paidByUser = function paidByUser(userId) {
  const target = String(userId);
  return this.paidBy
    .filter((row) => String(row.user?._id ?? row.user) === target)
    .reduce((total, row) => total + row.amount, 0);
};

/** This member's share of this expense (0 if they were not part of the split). */
expenseSchema.methods.shareOfUser = function shareOfUser(userId) {
  const target = String(userId);
  return this.shares
    .filter((row) => String(row.user?._id ?? row.user) === target)
    .reduce((total, row) => total + row.amount, 0);
};

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
