import mongoose from 'mongoose';

/**
 * One edit, recorded.
 *
 * Spec §8 is emphatic: an edited expense must keep its previous value, and a
 * reader must be able to see the old amount, the new amount, who changed it and
 * when. This collection is that record. Nothing here is ever updated or deleted
 * — a revision that could be revised would not be an audit trail.
 *
 * WHAT IS STORED. Only the fields that actually changed, in `previousData` and
 * `newData`, rather than two full copies of the expense. A description fix on a
 * year-old expense should cost one small row, not two snapshots of a nine-field
 * document. The full state at any past point is still recoverable — replay the
 * revisions backwards from the current expense — because every change writes
 * one of these, so nothing can slip through unrecorded.
 *
 * DELETIONS ARE NOT REVISIONS. A soft delete does not change any of the values
 * this collection describes; it is recorded on the expense itself, in
 * `isDeleted` / `deletedAt` / `deletedBy` (spec §9). Folding both into one
 * collection would mean a row type where every data field is empty.
 */
const expenseRevisionSchema = new mongoose.Schema(
  {
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
      index: true,
    },

    // Denormalised from the expense so a future room-wide activity feed
    // (spec §9's "expense edit history") does not have to join through every
    // expense to find the room's edits.
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },

    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /**
     * The changed fields, before and after. Keys match the expense's own field
     * names, and the two objects always carry the same keys as
     * `changedFields`. Mixed because the shape follows whatever was edited —
     * a number for `amount`, an array of rows for `shares`.
     */
    previousData: { type: mongoose.Schema.Types.Mixed, required: true },
    newData: { type: mongoose.Schema.Types.Mixed, required: true },

    /** Field names, so the UI can summarise an edit without diffing it again. */
    changedFields: {
      type: [String],
      required: true,
      validate: {
        validator: (fields) => fields.length > 0,
        message: 'A revision has to record at least one changed field.',
      },
    },
  },
  {
    // `createdAt` is the "edited at" the spec asks for. There is no `updatedAt`:
    // these rows are written once and never touched again.
    timestamps: { createdAt: true, updatedAt: false },
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

// The history drawer's only query: this expense's edits, newest first.
expenseRevisionSchema.index({ expense: 1, createdAt: -1 });

const ExpenseRevision = mongoose.model('ExpenseRevision', expenseRevisionSchema);

export default ExpenseRevision;
