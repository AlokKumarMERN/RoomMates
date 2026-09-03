/**
 * The events a room can raise (spec §20).
 *
 * Kept as data so the model, the validators and the client's icon map all read
 * from one list, and adding an event is one line in three places rather than a
 * hunt through the services.
 */
export const NOTIFICATION_TYPES = [
  'expense_added',
  'expense_edited',
  'expense_removed',
  'member_joined',
  'member_left',
  'settlement_recorded',
  'settlement_paid',
  'settlement_confirmed',
  'settlement_cancelled',
];

/**
 * How long a notification is kept.
 *
 * Notifications are not the audit trail — expenses keep their own revisions and
 * settlements keep their own stamps, and both of those are permanent. This is
 * the "what have I missed" list, which nobody scrolls back through for a year.
 * A TTL index means it prunes itself rather than growing without limit.
 */
export const NOTIFICATION_TTL_DAYS = 90;
