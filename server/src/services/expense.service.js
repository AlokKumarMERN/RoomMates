import Expense from '../models/Expense.js';
import Room from '../models/Room.js';
import ApiError from '../utils/ApiError.js';
import { dateRangeFilter } from '../utils/dates.js';
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

  return expense.populate(POPULATE);
}

/**
 * One page of a room's expenses.
 *
 * Soft-deleted rows are excluded here and in every calculation. They stay in
 * the collection for the audit trail (spec §9) but must never reach a total.
 */
export async function listExpenses({ roomId, query }) {
  const filter = { room: roomId, isDeleted: false };

  if (query.category) filter.category = query.category;

  const dateRange = dateRangeFilter(query.from, query.to);
  if (dateRange) filter.date = dateRange;

  // "Involving this person" is either side of the transaction: they put money
  // in, or they owe part of it.
  if (query.member) {
    filter.$or = [{ 'paidBy.user': query.member }, { 'shares.user': query.member }];
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
 * A single expense, if the caller is in its room.
 *
 * A soft-deleted expense is still returned — it carries `isDeleted` and Phase 7
 * renders it as removed with its history intact. Hiding it entirely would break
 * links from the audit trail to the record they describe.
 */
export async function getExpenseForUser({ expenseId, userId }) {
  const expense = await Expense.findById(expenseId).populate(POPULATE);

  if (!expense) {
    throw ApiError.notFound('Expense not found.', 'EXPENSE_NOT_FOUND');
  }

  const room = await Room.findById(expense.room);

  // Same rule as room access: someone outside the room gets "not found", never
  // "forbidden", so expense ids cannot be probed for existence.
  if (!room || !room.isMember(userId)) {
    throw ApiError.notFound('Expense not found.', 'EXPENSE_NOT_FOUND');
  }

  return expense;
}
