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
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
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

// The room expense list — "this room, not deleted, newest first" — is the
// single hottest query in the app, and every dashboard figure is a scan of the
// same range. The compound index covers the filter and the sort together.
expenseSchema.index({ room: 1, isDeleted: 1, date: -1 });

// Supports "what did I pay for?" and the per-member drill-downs, without
// scanning the room's whole history.
expenseSchema.index({ room: 1, 'paidBy.user': 1, date: -1 });

// Phase 9's search box. Declared with the schema so the index exists well
// before anything queries it.
expenseSchema.index({ description: 'text', notes: 'text' });

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
