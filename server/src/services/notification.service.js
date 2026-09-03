import Notification from '../models/Notification.js';

/**
 * Raising and reading notifications (spec §20).
 *
 * EVERYTHING IS EMITTED FROM THE SERVICE LAYER, never from a controller. That
 * is the whole reason spec §30's real-time updates can be added later without
 * restructuring: whatever transport eventually pushes these — Socket.IO, SSE,
 * web push — subscribes here, at the one place that already knows an event
 * happened and who it concerns. A controller emitting them would mean every
 * new caller of a service silently stopped notifying anybody.
 *
 * WHY THERE ARE NO SOCKETS YET. The deployment target is Vercel, whose
 * serverless functions cannot hold an open WebSocket — a connection has nowhere
 * to live between invocations. So the client polls, which needs no persistent
 * process and costs one small indexed count per interval. See the README for
 * what changes if the API ever moves somewhere that can hold a connection.
 */

const USER_FIELDS = 'name email avatar';

const idOf = (value) => String(value?._id ?? value);

/**
 * Tell a room's active members that something happened.
 *
 * @param {object} input
 * @param {object} input.room        The room, with `members` loaded.
 * @param {*} [input.actorId]        Who did it. They are never told about their
 *   own action — a notification saying "you added an expense" is noise.
 * @param {string} input.type
 * @param {(recipientId: string, isActor: boolean) => string|null} input.messageFor
 *   The wording, per recipient. Returning null skips that person, which is how
 *   "your expense was edited" reaches only the person whose expense it was.
 * @param {{type: string, id: *}} [input.entity] What clicking it should open.
 */
export async function notifyRoom({ room, actorId, type, messageFor, entity }) {
  const actor = actorId ? String(actorId) : null;

  const documents = [];

  for (const member of room.members) {
    // Past members are not told about a room they have left.
    if (!member.isActive) continue;

    const recipient = idOf(member.user);
    if (recipient === actor) continue;

    const message = messageFor(recipient);
    if (!message) continue;

    documents.push({
      user: recipient,
      room: room._id,
      actor: actorId ?? null,
      type,
      message,
      entityType: entity?.type ?? null,
      entityId: entity?.id ?? null,
    });
  }

  if (documents.length === 0) return [];

  return Notification.insertMany(documents);
}

/**
 * Tell exactly one person.
 *
 * Used where the audience is a single side of a transaction rather than the
 * room — a settlement concerns the two people in it, and telling the other
 * three that Rahul marked something sent is noise about money that is not
 * theirs.
 */
export async function notifyUser({ userId, room, actorId, type, message, entity }) {
  if (!userId || String(userId) === String(actorId)) return null;

  return Notification.create({
    user: userId,
    room: room._id ?? room,
    actor: actorId ?? null,
    type,
    message,
    entityType: entity?.type ?? null,
    entityId: entity?.id ?? null,
  });
}

/**
 * Raise notifications without ever failing the thing that caused them.
 *
 * Adding an expense that succeeded must not report failure because a
 * notification insert timed out — the money is recorded, and the worst case is
 * that somebody misses a line in their bell menu. Swallowing errors is normally
 * wrong; here the alternative is worse.
 */
export async function safely(work) {
  try {
    return await work();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notifications] failed to raise:', error.message);
    return null;
  }
}

/** One page of somebody's notifications, newest first. */
export async function listForUser({ userId, query = {} }) {
  const filter = { user: userId };
  if (query.unread) filter.read = false;
  if (query.room) filter.room = query.room;

  const { page = 1, limit = 20 } = query;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'actor', select: USER_FIELDS })
      .populate({ path: 'room', select: 'name' }),
    Notification.countDocuments(filter),
    // Always the unread count for everything, not for this filter — it is what
    // the bell shows, and it must not change because the list is filtered.
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return { notifications, total, unread, page, limit };
}

/** Just the number on the bell. Answered from the index, no documents read. */
export async function unreadCount(userId) {
  return Notification.countDocuments({ user: userId, read: false });
}

/**
 * Mark one as read.
 *
 * Scoped to the caller in the query itself rather than fetched and then
 * checked: a notification belonging to somebody else simply does not match, so
 * there is no path where the wrong row could be updated.
 */
export async function markRead({ notificationId, userId }) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, read: false },
    { read: true, readAt: new Date() },
    { new: true },
  );
}

/** Mark everything read. Returns how many were actually unread. */
export async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() },
  );

  return result.modifiedCount ?? 0;
}
