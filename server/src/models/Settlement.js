import mongoose from 'mongoose';

import { MAX_AMOUNT_PAISE } from '../utils/expense.constants.js';
import { SETTLEMENT_STATUSES } from '../utils/settlement.constants.js';

/**
 * One payment between two people, settling part of what is outstanding.
 *
 * A settlement NEVER touches an expense (spec §12). Handing somebody ₹300 does
 * not change what last month's dinner cost; it changes what is outstanding
 * between you. So this is a separate record, and the balance engine adds it as
 * a transfer — `paid` and `owed` stay strictly what the expenses say.
 *
 * THE LIFECYCLE, and why each step belongs to the person it does:
 *
 *   pending    Recorded. Either party may open it — the payer saying "I will
 *              send this", or the receiver saying "you still owe me this".
 *   paid       The PAYER marks it: "I have sent the money."
 *   confirmed  The RECEIVER marks it: "it arrived." Only now does any balance
 *              move. If the payer could confirm their own payment, anyone could
 *              clear a debt by asserting they had paid it.
 *   cancelled  Either party withdraws it, before it is confirmed.
 *
 * `confirmed` is terminal. A confirmation made in error is corrected the way
 * ledgers correct anything — by recording the opposite payment — not by
 * rewriting what was already agreed.
 */
const settlementSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },

    /** Who hands the money over. */
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /** Who receives it. */
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Integer paise, like every other amount in this app. See utils/money.js.
    amount: {
      type: Number,
      required: [true, 'A settlement needs an amount.'],
      min: [1, 'A settlement must be more than zero.'],
      max: [MAX_AMOUNT_PAISE, 'That amount is larger than this app supports.'],
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole paise.',
      },
    },

    status: { type: String, enum: SETTLEMENT_STATUSES, default: 'pending', required: true },

    /** Whoever opened the record — not necessarily the payer. */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    note: { type: String, trim: true, maxlength: [200, 'Note must be 200 characters or fewer.'] },

    // The audit trail: when each step happened. Kept as separate stamps rather
    // than one "updatedAt", because "he marked it paid on the 3rd and I
    // confirmed on the 5th" is exactly the question people ask about money.
    paidAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

// The Settle Up page's list: this room's settlements, newest first.
settlementSchema.index({ room: 1, createdAt: -1 });

// The balance engine's query: this room's confirmed settlements. Every summary
// runs it, so it gets its own index rather than filtering the list in memory.
settlementSchema.index({ room: 1, status: 1 });

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;
