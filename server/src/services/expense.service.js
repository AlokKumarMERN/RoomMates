import Expense from '../models/Expense.js';
import ExpenseRevision from '../models/ExpenseRevision.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { dateRangeFilter } from '../utils/dates.js';
import { formatINR } from '../utils/money.js';
import { diffExpense } from './calculation/diff.js';
import { notifyRoom, safely } from './notification.service.js';
import { resolvePaidBy, resolveShares } from './calculation/split.js';

const USER_FIELDS = 'name email avatar';

/** Populate the three user refs an expense carries, in one place. */
const POPULATE = [
  { path: 'createdBy', select: USER_FIELDS },
  { path: 'paidBy.user', select: USER_FIELDS },
  { path: 'shares.user', select: USER_FIELDS },
];

const SORT_FIELDS = {
  date: { date: 1, createdAt: 1 },
  '-date': { date: -1, createdAt: -1 },
  amount: { amount: 1 },
  '-amount': { amount: -1 },
};

/**
 * Everyone who may appear on a new expense: the room's *active* members.
 *
 * Past members are deliberately excluded. Their names still render on the
 * expenses they were part of — that history is untouchable — but they cannot be
 * added to a new one, because they are no longer in the room and would have no
 * way to settle it.
 */
function activeMemberIds(room) {
  return new Set(
    room.members
      .filter((member) => member.isActive)
      .map((member) => String(member.user?._id ?? member.user)),
  );
}

function assertAllInRoom({ rows, memberIds, field }) {
  const stranger = rows.find((row) => !memberIds.has(String(row.user)));

  if (stranger) {
    throw ApiError.validation('Everyone on an expense has to be a current member of the room.', [
      { field, message: 'That person is not a current member of this room.' },
    ]);
  }
}

/**
 * Create an expense and freeze its split.
 *
 * The order matters: membership is checked first (so an error names the real
 * problem rather than complaining about arithmetic), then the split is
 * resolved, and only then is anything written. The `shares` array the resolver
 * returns is stored verbatim and never recalculated — see the note on the model.
 */
export async function createExpense({ room, userId, input }) {
  if (room.isArchived) {
    throw ApiError.badRequest(
      'This room is archived, so no new expenses can be added.',
      'ROOM_ARCHIVED',
    );
  }

  const memberIds = activeMemberIds(room);

  assertAllInRoom({ rows: input.paidBy, memberIds, field: 'paidBy' });
  assertAllInRoom({ rows: input.participants, memberIds, field: 'participants' });

  const paidBy = resolvePaidBy({ amount: input.amount, paidBy: input.paidBy });
  const shares = resolveShares({
    amount: input.amount,
    splitType: input.splitType,
    participants: input.participants,
  });

  const expense = await Expense.create({
    room: room._id,
    createdBy: userId,
    amount: input.amount,
    description: input.description,
    category: input.category,
    date: input.date,
    notes: input.notes,
    receiptUrl: input.receiptUrl,
    splitType: input.splitType,
    paidBy,
    shares,
  });

  await expense.populate(POPULATE);

  await safely(() =>
    notifyRoom({
      room,
      actorId: userId,
      type: 'expense_added',
      entity: { type: 'expense', id: expense._id },
      messageFor: (recipient) => {
        const share = expense.shares.find((row) => String(row.user?._id ?? row.user) === recipient);

        // The number that matters to the reader is their share, not the total —
        // "Aman added ₹4,000 (your share ₹800)" answers the question they would
        // otherwise open the expense to ask.
        return share
          ? `${actorName(expense.createdBy)} added ${formatINR(expense.amount)} for "${expense.description}" — your share is ${formatINR(share.amount)}.`
          : `${actorName(expense.createdBy)} added ${formatINR(expense.amount)} for "${expense.description}". You are not in this one.`;
      },
    }),
  );

  return expense;
}

/** The actor's first name, or a neutral fallback if the ref is not populated. */
function actorName(user) {
  return user?.name?.split(' ')[0] ?? 'Someone';
}

/**
 * Characters that mean something to a regex, neutralised.
 *
 * Without this, a search for "500 (rent)" throws an "unmatched parenthesis"
 * error at the database, and a search for ".*" quietly matches everything.
 * User input is a string to find, never a pattern to run.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** How the `deleted` query option maps onto the stored flag. */
function deletedFilter(mode) {
  if (mode === 'include') return {};
  if (mode === 'only') return { isDeleted: true };
  return { isDeleted: false };
}

/**
 * One page of a room's expenses.
 *
 * Soft-deleted rows are excluded by default, and unconditionally from every
 * calculation. They stay in the collection for the audit trail (spec §9) and
 * the history page can summon them with `deleted=include|only` — but nothing
 * that adds up money ever sees them.
 */
export async function listExpenses({ roomId, query }) {
  const filter = { room: roomId, ...deletedFilter(query.deleted) };

  if (query.category) filter.category = query.category;
  if (query.splitType) filter.splitType = query.splitType;
  if (query.edited) filter.isEdited = query.edited === 'yes';

  const dateRange = dateRangeFilter(query.from, query.to);
  if (dateRange) filter.date = dateRange;

  if (query.minAmount != null || query.maxAmount != null) {
    filter.amount = {};
    if (query.minAmount != null) filter.amount.$gte = query.minAmount;
    if (query.maxAmount != null) filter.amount.$lte = query.maxAmount;
  }

  // "Involving this person" is either side of the transaction: they put money
  // in, or they owe part of it.
  if (query.member) {
    filter.$or = [{ 'paidBy.user': query.member }, { 'shares.user': query.member }];
  }

  if (query.search) {
    const term = new RegExp(escapeRegex(query.search), 'i');
    const matchesText = [{ description: term }, { notes: term }];

    // $or is a top-level key, so a member filter and a search filter would
    // overwrite each other. $and keeps both, and means what a reader expects:
    // involving this person AND matching this text.
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: matchesText }];
      delete filter.$or;
    } else {
      filter.$or = matchesText;
    }
  }

  const { page, limit } = query;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort(SORT_FIELDS[query.sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Expense.countDocuments(filter),
  ]);

  return { expenses, total, page, limit };
}

/**
 * Load an expense together with its room, proving the caller is in it.
 *
 * Every single-expense operation needs both — the expense to act on, and the
 * room to decide whether the caller may. Doing it in one place means the access
 * rule cannot drift between reading, editing and deleting.
 *
 * Someone outside the room gets "not found", never "forbidden", so expense ids
 * cannot be probed for existence — the same rule as room access.
 */
async function loadForUser({ expenseId, userId }) {
  const expense = await Expense.findById(expenseId).populate(POPULATE);

  if (!expense) {
    throw ApiError.notFound('Expense not found.', 'EXPENSE_NOT_FOUND');
  }

  const room = await Room.findById(expense.room);

  if (!room || !room.isMember(userId)) {
    throw ApiError.notFound('Expense not found.', 'EXPENSE_NOT_FOUND');
  }

  return { expense, room };
}

/**
 * A single expense, if the caller is in its room.
 *
 * A soft-deleted expense is still returned — it carries `isDeleted` and the UI
 * renders it as removed with its history intact. Hiding it entirely would break
 * links from the audit trail to the record they describe.
 */
export async function getExpenseForUser({ expenseId, userId }) {
  const { expense } = await loadForUser({ expenseId, userId });
  return expense;
}

/**
 * Who may appear on this expense after an edit.
 *
 * The room's current active members, PLUS everyone already on the expense.
 *
 * That second half matters more than it looks. An expense from three months ago
 * may involve someone who has since moved out. Without them in the allowed set,
 * fixing a typo in its description would be rejected because a person the edit
 * never touched is no longer a member — the history would become read-only by
 * accident. Adding a *new* departed member is still impossible: they are
 * neither active nor already on the expense.
 */
function editableParticipantIds({ room, expense }) {
  const allowed = activeMemberIds(room);

  for (const row of [...expense.paidBy, ...expense.shares]) {
    allowed.add(String(row.user?._id ?? row.user));
  }

  return allowed;
}

/**
 * Edit an expense, keeping what it used to say.
 *
 * ONLY THE CREATOR (spec §8). Not the room admin, not the person who paid — an
 * expense is a claim about what someone spent, and letting anyone else rewrite
 * it turns a shared ledger into an argument. This is enforced here, in the
 * service, so hiding the button on the client stays a convenience rather than
 * the control.
 *
 * The split is RE-RESOLVED and re-frozen when the money changes, so the new
 * shares are as fixed as the old ones were. Nothing is ever recomputed from
 * current membership at read time, before or after an edit (spec §29).
 */
export async function updateExpense({ expenseId, userId, input }) {
  const { expense, room } = await loadForUser({ expenseId, userId });

  if (String(expense.createdBy?._id ?? expense.createdBy) !== String(userId)) {
    throw ApiError.forbidden(
      'Only the person who added an expense can edit it.',
      'NOT_EXPENSE_CREATOR',
    );
  }

  if (expense.isDeleted) {
    throw ApiError.badRequest(
      'This expense was removed, so it can no longer be edited.',
      'EXPENSE_DELETED',
    );
  }

  if (room.isArchived) {
    throw ApiError.badRequest(
      'This room is archived, so its expenses can no longer be edited.',
      'ROOM_ARCHIVED',
    );
  }

  // The proposed state: only the fields the caller actually sent.
  const after = {};

  for (const field of ['description', 'category', 'date', 'notes']) {
    if (input[field] !== undefined) after[field] = input[field];
  }

  // Amount, split type, participants and payers move together — the validator
  // enforces that they arrive as a set, because re-resolving a custom split
  // against a new total without new participant amounts is not something the
  // server can guess.
  if (input.amount !== undefined) {
    const allowed = editableParticipantIds({ room, expense });

    assertAllInRoom({ rows: input.paidBy, memberIds: allowed, field: 'paidBy' });
    assertAllInRoom({ rows: input.participants, memberIds: allowed, field: 'participants' });

    after.amount = input.amount;
    after.splitType = input.splitType;
    after.paidBy = resolvePaidBy({ amount: input.amount, paidBy: input.paidBy });
    after.shares = resolveShares({
      amount: input.amount,
      splitType: input.splitType,
      participants: input.participants,
    });
  }

  const { changedFields, previousData, newData } = diffExpense(expense, after);

  // Re-saving an unchanged form is not an edit. Recording it would fill the
  // history with rows that show nothing, and stamp "Edited" on an expense
  // nobody edited.
  if (changedFields.length === 0) return expense;

  await ExpenseRevision.create({
    expense: expense._id,
    room: room._id,
    editedBy: userId,
    previousData,
    newData,
    changedFields,
  });

  Object.assign(expense, after);
  expense.isEdited = true;
  expense.editedAt = new Date();

  await expense.save();
  await expense.populate(POPULATE);

  await safely(() =>
    notifyRoom({
      room,
      actorId: userId,
      type: 'expense_edited',
      entity: { type: 'expense', id: expense._id },
      messageFor: (recipient) => {
        const isTheirs = recipient === String(expense.createdBy?._id ?? expense.createdBy);
        const what = changedFields.includes('amount')
          ? `${formatINR(previousData.amount)} → ${formatINR(newData.amount)}`
          : changedFields.join(', ');

        // Only the creator can edit, so "your expense" can only mean the
        // recipient IS the creator — which the rules make impossible here. Kept
        // anyway: the day an admin override appears, this line is already right.
        return isTheirs
          ? `${actorName(expense.createdBy)} edited your expense "${expense.description}" (${what}).`
          : `${actorName(expense.createdBy)} edited "${expense.description}" (${what}).`;
      },
    }),
  );

  return expense;
}

/**
 * Soft-delete an expense.
 *
 * Nothing is destroyed (spec §9): the row stays, marked, and every calculation
 * already filters on `isDeleted`. What is kept is the point — the record of
 * what was claimed, and who withdrew it.
 *
 * CREATOR OR ROOM ADMIN, deliberately wider than editing. Editing rewrites what
 * someone said they spent, so only they may do it. Deleting only withdraws the
 * claim, and an admin needs to be able to clear a duplicate or a mistaken entry
 * when whoever added it has stopped responding — spec §9 allows exactly this.
 */
export async function deleteExpense({ expenseId, userId }) {
  const { expense, room } = await loadForUser({ expenseId, userId });

  const isCreator = String(expense.createdBy?._id ?? expense.createdBy) === String(userId);

  if (!isCreator && !room.isAdmin(userId)) {
    throw ApiError.forbidden(
      'Only the person who added an expense, or a room admin, can remove it.',
      'NOT_EXPENSE_CREATOR',
    );
  }

  // Deleting twice is the same as deleting once — a double-tap on a slow
  // connection should not be an error.
  if (expense.isDeleted) return expense;

  if (room.isArchived) {
    throw ApiError.badRequest(
      'This room is archived, so its expenses can no longer be changed.',
      'ROOM_ARCHIVED',
    );
  }

  expense.isDeleted = true;
  expense.deletedAt = new Date();
  expense.deletedBy = userId;

  await expense.save();
  await expense.populate(POPULATE);

  await safely(() =>
    notifyRoom({
      room,
      actorId: userId,
      type: 'expense_removed',
      entity: { type: 'expense', id: expense._id },
      messageFor: (recipient) =>
        recipient === String(expense.createdBy?._id ?? expense.createdBy)
          ? `A room admin removed your expense "${expense.description}" (${formatINR(expense.amount)}). It no longer counts towards any total.`
          : `"${expense.description}" (${formatINR(expense.amount)}) was removed and no longer counts towards any total.`,
    }),
  );

  return expense;
}

/** The revision fields whose values are arrays of `{user, amount}` rows. */
const ROW_FIELDS = ['paidBy', 'shares'];

/**
 * Put names on the user ids inside a revision's stored data.
 *
 * Revisions deliberately store bare ids — an audit row must not go stale
 * because somebody changed their display name afterwards. But "6a99…cd09 owed
 * ₹250" is unreadable, so the names are resolved here, at read time, from the
 * current user records. One query for the whole page of revisions.
 *
 * Looked up from `User` rather than the room roster, because a revision can
 * name someone who has since left, and the point of history is that it still
 * renders.
 */
async function withUserNames(revisions) {
  const ids = new Set();

  for (const revision of revisions) {
    for (const field of ROW_FIELDS) {
      for (const data of [revision.previousData, revision.newData]) {
        for (const row of data?.[field] ?? []) ids.add(String(row.user));
      }
    }
  }

  if (ids.size === 0) return revisions.map((revision) => revision.toJSON());

  const users = await User.find({ _id: { $in: [...ids] } }).select(USER_FIELDS);
  const byId = new Map(users.map((user) => [String(user._id), user]));

  const name = (id) => byId.get(String(id))?.name ?? 'Someone who has left';

  const label = (data) => {
    if (!data) return data;
    const labelled = { ...data };

    for (const field of ROW_FIELDS) {
      if (!labelled[field]) continue;
      labelled[field] = labelled[field].map((row) => ({
        user: String(row.user),
        name: name(row.user),
        amount: row.amount,
      }));
    }

    return labelled;
  };

  return revisions.map((revision) => ({
    ...revision.toJSON(),
    previousData: label(revision.previousData),
    newData: label(revision.newData),
  }));
}

/**
 * This expense's edit history, newest first.
 *
 * Readable by anyone in the room, not only the creator: the point of an audit
 * trail is that the people affected by a change can see it.
 */
export async function listRevisions({ expenseId, userId }) {
  await loadForUser({ expenseId, userId });

  const revisions = await ExpenseRevision.find({ expense: expenseId })
    .sort({ createdAt: -1 })
    .populate({ path: 'editedBy', select: USER_FIELDS });

  return withUserNames(revisions);
}
