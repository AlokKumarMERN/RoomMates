import mongoose from 'mongoose';

import { NOTIFICATION_TTL_DAYS, NOTIFICATION_TYPES } from '../utils/notification.constants.js';

/**
 * One thing that happened, addressed to one person.
 *
 * ONE ROW PER RECIPIENT, not one row per event. Fan-out costs a handful of
 * small documents — a room of five produces four — and buys two things that
 * matter more than the saving. `read` belongs to a person, not to an event, so
 * a shared row would need a per-user read set anyway. And the wording is
 * personal: the same edit reads "Rahul edited your expense" to the person who
 * created it and "Rahul edited an expense" to everybody else.
 *
 * THE MESSAGE IS FROZEN AT WRITE TIME. It records what was true when it
 * happened — "Rahul added an expense of ₹500" stays correct after the expense
 * is edited to ₹650 or removed entirely, which is exactly what a notification
 * about that moment should say.
 */
const notificationSchema = new mongoose.Schema(
  {
    /** Who is being told. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

    /** Who did the thing. Null for anything the system itself raises. */
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [240, 'A notification must be shorter than that.'],
    },

    /**
     * What to open when it is clicked, as a type and an id rather than a URL.
     * Storing "/expenses/6a99…" would freeze today's routing into the database
     * and break every old notification the day a path changes.
     */
    entityType: { type: String, enum: ['expense', 'settlement', 'room'], default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  {
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

// The bell's list: mine, newest first.
notificationSchema.index({ user: 1, createdAt: -1 });

/**
 * The unread count, which the bell polls far more often than it opens the
 * list. `read` is in the key so the count is answered from the index alone
 * without touching a single document.
 */
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

/**
 * Old notifications prune themselves.
 *
 * These are the "what have I missed" list, not the audit trail — expenses keep
 * their own revisions and settlements their own stamps, both permanent. Without
 * a TTL this collection is the one thing in the app that grows for ever while
 * nobody ever reads the old end of it.
 */
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 },
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
