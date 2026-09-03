/**
 * Balances — turning a room's frozen expense rows into "who is up, who is down".
 *
 * Pure functions only: no Mongoose, no Express, no clock. Everything here takes
 * plain objects of strings and integers and returns the same, so the money model
 * can be tested without a database or a server (plan §4, spec §28).
 *
 * The engine reads `shares[]` and `paidBy[]` exactly as they were frozen when
 * each expense was written. It never re-splits anything from *current*
 * membership — that is the whole reason a fifth person joining today cannot
 * change what last month's dinner cost the four people who ate it (spec §29).
 *
 * TWO NUMBERS THAT LOOK ALIKE AND ARE NOT.
 *
 *   balance    = paid − owed + settled.  What this person is actually up or
 *                down. This is the ledger. Settlements are built from it, and
 *                across everyone it always sums to exactly zero.
 *
 *   difference = paid − average.  A *spending comparison* for the §11 table:
 *                "you put in ₹100 less than the typical person here". It is a
 *                display figure. Nothing settles against it, and it does not
 *                sum to zero once anyone has been left out of a split.
 *
 * They coincide only when every expense was split equally between everybody.
 * Conflating them is how a dashboard ends up telling someone they owe a number
 * that the Settle Up page has never heard of.
 */

/**
 * How close to the average still counts as "about average" in the §11 table.
 * Without a band, a room where everyone paid within a rupee of each other
 * renders as a wall of red and green arrows and tells the reader nothing.
 */
const NEAR_AVERAGE_TOLERANCE = 0.05;

const idOf = (value) => String(value?._id ?? value);

/**
 * Where one member sits relative to the room average.
 *
 * @param {number} difference paid − average, in paise. May be negative.
 * @param {number} average    Room average, in paise.
 * @returns {'below'|'near'|'above'}
 */
export function standing(difference, average) {
  const tolerance = Math.round(Math.abs(average) * NEAR_AVERAGE_TOLERANCE);

  if (Math.abs(difference) <= tolerance) return 'near';
  return difference > 0 ? 'above' : 'below';
}

/**
 * The whole computed picture for one room, over one set of expenses.
 *
 * WHO GETS A ROW. Every active member, plus anyone who appears in any of these
 * expenses even if they have since left the room. Leaving does not cancel a
 * debt: a departed member's shares are frozen on expenses that already
 * happened, so they still owe (or are owed) real money. Reporting only active
 * members would drop those rows, balances would stop summing to zero, and the
 * room could never fully settle. Each row carries `isActive` so the UI can say
 * "former member" — but the money is counted either way.
 *
 * WHAT DIVIDES INTO THE AVERAGE. Active members only. The average answers "what
 * is a normal amount to be putting in around here?", which is a question about
 * the people currently living together. It is display-only and never touches a
 * balance, so keeping a long-departed member in the denominator would skew
 * today's comparison table for no gain.
 *
 * SETTLEMENTS MOVE THE BALANCE, NOT THE EXPENSES (spec §12). Handing somebody
 * ₹300 does not change what last month's dinner cost — it changes what is
 * outstanding between you. So a confirmed settlement is added to the ledger as
 * a transfer and nothing about any expense is touched: `paid` and `owed` stay
 * strictly what the expenses say, which is what the charts and the "spending"
 * figures mean, and `settled` carries the transfers.
 *
 * Only CONFIRMED settlements belong here. One that is merely recorded, or that
 * the payer says they have sent, is a claim; until the person receiving it says
 * the money arrived, moving the balance would let anyone clear a debt by
 * asserting they had paid it.
 *
 * @param {object} input
 * @param {Array<{amount: number, paidBy: Array<{user: *, amount: number}>,
 *                shares: Array<{user: *, amount: number}>}>} input.expenses
 *   Active (non-deleted) expenses only. Soft-deleted rows stay in the
 *   collection for the audit trail and must never reach a total.
 * @param {Array<{user: *, isActive: boolean}>} input.members The room's roster.
 * @param {Array<{from: *, to: *, amount: number}>} [input.settlements]
 *   Confirmed settlements only.
 * @returns {{
 *   totals: {total: number, expenseCount: number, memberCount: number, average: number},
 *   members: Array<{user: string, isActive: boolean, paid: number, owed: number,
 *                   settledOut: number, settledIn: number, settled: number,
 *                   balance: number, difference: number, standing: string}>
 * }}
 */
export function summarise({ expenses = [], members = [], settlements = [] }) {
  const ledger = new Map();

  const rowFor = (user) => {
    const key = idOf(user);
    let row = ledger.get(key);

    if (!row) {
      row = { user: key, isActive: false, paid: 0, owed: 0, settledOut: 0, settledIn: 0 };
      ledger.set(key, row);
    }

    return row;
  };

  // Seed from the roster first, so a member who has joined but not yet been on
  // an expense shows an honest ₹0 row rather than vanishing from the table.
  for (const member of members) {
    rowFor(member.user).isActive = Boolean(member.isActive);
  }

  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;

    for (const payer of expense.paidBy) {
      rowFor(payer.user).paid += payer.amount;
    }

    for (const share of expense.shares) {
      rowFor(share.user).owed += share.amount;
    }
  }

  // Paying somebody counts for you exactly as putting money in does; being paid
  // counts against you exactly as owing a share does. That symmetry is why the
  // ledger still sums to zero once settlements are in it.
  for (const settlement of settlements) {
    rowFor(settlement.from).settledOut += settlement.amount;
    rowFor(settlement.to).settledIn += settlement.amount;
  }

  const memberCount = members.filter((member) => member.isActive).length;

  // Integer paise in, integer paise out. The average is the one figure here
  // that cannot divide evenly, and it is the one figure nothing settles
  // against — so rounding it is safe in a way that rounding a share is not.
  const average = memberCount > 0 ? Math.round(total / memberCount) : 0;

  const rows = [...ledger.values()].map((row) => {
    // `difference` compares SPENDING, so it deliberately ignores settlements:
    // paying somebody back is not spending, and counting it here would tell
    // someone who settled up that they now spend below average.
    const difference = row.paid - average;
    const settled = row.settledOut - row.settledIn;

    return {
      ...row,
      settled,
      balance: row.paid - row.owed + settled,
      difference,
      standing: standing(difference, average),
    };
  });

  // Creditors first, then debtors — the order both the comparison table and the
  // settlement list want. Ties break on user id so the same room always renders
  // in the same order, however Mongo happened to return the documents.
  rows.sort((a, b) => b.balance - a.balance || a.user.localeCompare(b.user));

  return {
    totals: {
      total,
      expenseCount: expenses.length,
      memberCount,
      average,
    },
    members: rows,
  };
}
