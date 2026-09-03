/**
 * Settlement — the fewest payments that zero everybody out.
 *
 * Pure functions only, same as balance.js and split.js: plain data in, plain
 * data out, no database and no server (plan §4).
 *
 * THE ALGORITHM (plan §3.1). Split members into creditors (balance > 0) and
 * debtors (balance < 0), sort both by magnitude largest-first, and repeatedly
 * pay the largest debtor's debt into the largest creditor's credit, transferring
 * min(debt, credit). Whichever side reaches zero drops out. Every transfer
 * retires at least one participant, so n members need at most n−1 payments, and
 * usually far fewer.
 *
 * A NOTE ON THE SPEC'S OWN EXAMPLE. Spec §5 sketches its worked case settling in
 * three payments (Rahul→Aman ₹200, Rahul→Rohit ₹100, Alok→Rohit ₹200). This
 * code settles the same balances in two (Rahul→Rohit ₹300, Alok→Aman ₹100).
 * Both drive every balance to zero; the greedy one needs one payment fewer,
 * which is what §5's own "minimize unnecessary transactions" asks for. The
 * illustration and the implementation differ here on purpose.
 *
 * This is not the provably minimal number of transactions — that problem is
 * NP-hard, and solving it exactly would mean subset-sum over the balances for a
 * saving of at most a payment or two. Greedy is the standard trade, and it is
 * what every settle-up app you have used is doing.
 */

/**
 * Build the payment list for a set of balances.
 *
 * @param {Array<{user: string, balance: number}>} balances Integer paise;
 *   positive means "should receive". Must sum to zero — see below.
 * @returns {Array<{from: string, to: string, amount: number}>} Payments, in the
 *   order they were matched. Empty when everyone is already square.
 */
export function settleUp(balances = []) {
  const debtors = [];
  const creditors = [];

  for (const { user, balance } of balances) {
    if (balance > 0) creditors.push({ user: String(user), amount: balance });
    else if (balance < 0) debtors.push({ user: String(user), amount: -balance });
  }

  const owed = creditors.reduce((sum, entry) => sum + entry.amount, 0);
  const owing = debtors.reduce((sum, entry) => sum + entry.amount, 0);

  // Balances that do not sum to zero cannot be settled by any set of payments,
  // and the shortfall would silently become someone's phantom debt. Since every
  // expense's shares and payments each sum to its amount, a non-zero total here
  // means a bug upstream, not bad user input — so it throws rather than
  // returning a plausible-looking list. Not an ApiError: there is nothing the
  // caller could have done differently, and the error handler will treat it as
  // the 500 it is.
  if (owed !== owing) {
    throw new Error(
      `Balances do not sum to zero (credits ${owed} vs debts ${owing}); refusing to build a settlement.`,
    );
  }

  // Largest first on both sides. Ties break on user id, so the same room always
  // produces the same payment list — a settlement that reshuffled between two
  // page loads would be impossible to act on.
  const byAmount = (a, b) => b.amount - a.amount || a.user.localeCompare(b.user);
  debtors.sort(byAmount);
  creditors.sort(byAmount);

  const payments = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    payments.push({ from: debtor.user, to: creditor.user, amount });

    debtor.amount -= amount;
    creditor.amount -= amount;

    // At least one of these fires every iteration — that is what bounds the
    // loop at n−1 payments and guarantees it terminates.
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return payments;
}

/**
 * One person's view of a settlement list: what they have to pay, and what is
 * coming to them. Spec §12's "You owe" and "You will receive".
 *
 * @param {Array<{from: string, to: string, amount: number}>} payments
 * @param {string} userId
 */
export function settlementsFor(payments, userId) {
  const target = String(userId);

  const owes = payments.filter((payment) => payment.from === target);
  const receives = payments.filter((payment) => payment.to === target);

  return {
    owes,
    receives,
    totalOwed: owes.reduce((sum, payment) => sum + payment.amount, 0),
    totalToReceive: receives.reduce((sum, payment) => sum + payment.amount, 0),
  };
}
