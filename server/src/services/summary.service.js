import Expense from '../models/Expense.js';
import { dateRangeFilter } from '../utils/dates.js';
import { summarise } from './calculation/balance.js';
import { byCategory, byDay } from './calculation/breakdown.js';
import { settleUp, settlementsFor } from './calculation/settlement.js';
import { confirmedTransfers } from './settlement.service.js';

/**
 * The room summary: one query, one pass through the calculation engine, and the
 * whole computed picture the dashboard and the Settle Up page need.
 *
 * Everything numerical happens in `calculation/` — pure functions with no
 * database and no request (spec §28). This file does the two things those
 * functions deliberately cannot: fetch the rows, and put names back on the ids.
 */

const idOf = (value) => String(value?._id ?? value);

/**
 * Name and avatar for every id the engine might hand back.
 *
 * Built from the room's own roster, which keeps departed members — their
 * membership is deactivated, never deleted (spec §29) — so a settlement that
 * involves someone who moved out last month still renders with their name
 * rather than a bare ObjectId.
 */
function profileIndex(room) {
  const index = new Map();

  for (const member of room.members) {
    const user = member.user;

    index.set(idOf(user), {
      id: idOf(user),
      name: user?.name ?? null,
      email: user?.email ?? null,
      avatar: user?.avatar ?? null,
    });
  }

  return index;
}

/**
 * Compute a room's totals, per-member standing, and suggested settlements.
 *
 * @param {object} input
 * @param {object} input.room   The room, already loaded and access-checked by
 *   `requireRoomMember`, with `members.user` populated.
 * @param {*} input.userId      The caller — the `you` block is their slice of it.
 * @param {{from?: Date, to?: Date}} [input.query] Optional reporting window.
 */
export async function getRoomSummary({ room, userId, query = {} }) {
  const filter = { room: room._id, isDeleted: false };

  // Soft-deleted expenses stay in the collection for the audit trail and must
  // never reach a total — the filter above is the only thing standing between a
  // deleted dinner and everybody's balance.
  const dateRange = dateRangeFilter(query.from, query.to);
  if (dateRange) filter.date = dateRange;

  // Only the fields the engine reads. A room with years of history should not
  // drag its descriptions, notes and receipt links across the wire to produce a
  // handful of numbers.
  const [expenses, settlements] = await Promise.all([
    Expense.find(filter).select('amount category date paidBy shares').lean(),

    // Confirmed settlements only, and deliberately NOT filtered by the date
    // window. The window scopes what was *spent* in a period; the balance is
    // always the balance as it stands now, and a payment made last week would
    // otherwise vanish from a report on last month and resurrect a debt that
    // has been paid.
    confirmedTransfers(room._id),
  ]);

  const { totals, members } = summarise({
    expenses,
    settlements,
    members: room.members.map((member) => ({
      user: member.user,
      isActive: member.isActive,
    })),
  });

  const payments = settleUp(members);
  const profiles = profileIndex(room);

  // A row can only be missing if an expense names someone the roster has never
  // heard of, which membership rules make impossible — but a summary endpoint is
  // the wrong place to throw over it, so it degrades to an anonymous row.
  const profile = (id) => profiles.get(id) ?? { id, name: null, email: null, avatar: null };

  const hydrate = (payment) => ({
    from: profile(payment.from),
    to: profile(payment.to),
    amount: payment.amount,
  });

  const mine = settlementsFor(payments, userId);
  const myRow = members.find((row) => row.user === idOf(userId));

  return {
    range: {
      from: query.from ?? null,
      to: query.to ?? null,
    },

    totals,

    members: members.map((row) => ({ ...row, user: profile(row.user) })),

    /**
     * The chart series. Both read `amount` — what the room spent — rather than
     * anyone's share, so "we spent ₹4,000 on groceries" reads the same whoever
     * is looking at it. Spend *by member* is already on the member rows above,
     * as `paid`.
     */
    byCategory: byCategory(expenses),
    byDay: byDay(expenses),

    /**
     * Suggested payments, fewest-first. Phase 8 turns these into recordable
     * Settlement documents; for now they are advice, recomputed from the
     * expenses every time and stored nowhere.
     */
    settlements: payments.map(hydrate),

    /** The caller's own slice — spec §12's "You owe" and "You will receive". */
    you: {
      paid: myRow?.paid ?? 0,
      owed: myRow?.owed ?? 0,
      settled: myRow?.settled ?? 0,
      balance: myRow?.balance ?? 0,
      difference: myRow?.difference ?? 0,
      owes: mine.owes.map(hydrate),
      receives: mine.receives.map(hydrate),
      totalOwed: mine.totalOwed,
      totalToReceive: mine.totalToReceive,
    },
  };
}
