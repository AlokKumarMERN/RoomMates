import { describe, expect, it } from 'vitest';

import { allocate } from './split.js';
import { settleUp } from './settlement.js';
import { standing, summarise } from './balance.js';

/**
 * The engine is the code most likely to be wrong and least likely to announce
 * it: a room whose balances quietly stop summing to zero looks perfectly normal
 * on every screen and simply never settles. So the invariant that matters —
 * balances sum to zero, always — is tested against randomised rooms rather than
 * a handful of tidy numbers.
 */

const MEMBERS = ['alok', 'rahul', 'aman', 'rohit'];

const roster = (...ids) => ids.map((user) => ({ user, isActive: true }));

/** One expense, paid entirely by `payer`, split equally between `participants`. */
const equalExpense = (amount, payer, participants) => ({
  amount,
  paidBy: [{ user: payer, amount }],
  shares: allocate(
    amount,
    participants.map(() => 1),
  ).map((share, index) => ({ user: participants[index], amount: share })),
});

/** The spec §5 room: four people, four expenses, everything split four ways. */
const specExample = () => ({
  members: roster(...MEMBERS),
  expenses: [
    equalExpense(40000, 'alok', MEMBERS),
    equalExpense(20000, 'rahul', MEMBERS),
    equalExpense(60000, 'aman', MEMBERS),
    equalExpense(80000, 'rohit', MEMBERS),
  ],
});

const rowFor = (summary, user) => summary.members.find((row) => row.user === user);

describe('summarise — the spec §5 worked example', () => {
  const summary = summarise(specExample());

  it('totals ₹2000 across four expenses', () => {
    expect(summary.totals.total).toBe(200000);
    expect(summary.totals.expenseCount).toBe(4);
  });

  it('averages ₹500 per person', () => {
    expect(summary.totals.memberCount).toBe(4);
    expect(summary.totals.average).toBe(50000);
  });

  it('reproduces the §11 comparison table exactly', () => {
    expect(rowFor(summary, 'alok')).toMatchObject({ paid: 40000, difference: -10000 });
    expect(rowFor(summary, 'rahul')).toMatchObject({ paid: 20000, difference: -30000 });
    expect(rowFor(summary, 'aman')).toMatchObject({ paid: 60000, difference: 10000 });
    expect(rowFor(summary, 'rohit')).toMatchObject({ paid: 80000, difference: 30000 });
  });

  it('reproduces the plan §3.1 balances', () => {
    expect(rowFor(summary, 'alok').balance).toBe(-10000);
    expect(rowFor(summary, 'rahul').balance).toBe(-30000);
    expect(rowFor(summary, 'aman').balance).toBe(10000);
    expect(rowFor(summary, 'rohit').balance).toBe(30000);
  });

  it('everyone owes an equal quarter', () => {
    for (const user of MEMBERS) {
      expect(rowFor(summary, user).owed).toBe(50000);
    }
  });

  it('lists creditors before debtors', () => {
    expect(summary.members.map((row) => row.user)).toEqual(['rohit', 'aman', 'alok', 'rahul']);
  });
});

describe('summarise — membership', () => {
  it('gives a member with no expenses an honest zero row', () => {
    const summary = summarise({
      members: roster('alok', 'rahul'),
      expenses: [],
    });

    expect(summary.members).toHaveLength(2);
    expect(rowFor(summary, 'alok')).toMatchObject({ paid: 0, owed: 0, balance: 0 });
    expect(summary.totals.average).toBe(0);
  });

  it('keeps a departed member who still owes money', () => {
    // Rahul left, but he ate the dinner Alok paid for. Dropping his row would
    // lose ₹250 and the room could never settle.
    const summary = summarise({
      members: [
        { user: 'alok', isActive: true },
        { user: 'rahul', isActive: false },
      ],
      expenses: [equalExpense(50000, 'alok', ['alok', 'rahul'])],
    });

    expect(rowFor(summary, 'rahul')).toMatchObject({ isActive: false, balance: -25000 });
    expect(rowFor(summary, 'alok').balance).toBe(25000);
  });

  it('counts only active members in the average', () => {
    const summary = summarise({
      members: [
        { user: 'alok', isActive: true },
        { user: 'rahul', isActive: false },
      ],
      expenses: [equalExpense(50000, 'alok', ['alok', 'rahul'])],
    });

    expect(summary.totals.memberCount).toBe(1);
    expect(summary.totals.average).toBe(50000);
  });

  it('still counts someone who is on an expense but not on the roster', () => {
    const summary = summarise({
      members: roster('alok'),
      expenses: [equalExpense(50000, 'alok', ['alok', 'ghost'])],
    });

    expect(rowFor(summary, 'ghost')).toMatchObject({ isActive: false, balance: -25000 });
  });

  it('accepts populated user refs as well as bare ids', () => {
    const summary = summarise({
      members: [{ user: { _id: 'alok' }, isActive: true }],
      expenses: [
        {
          amount: 10000,
          paidBy: [{ user: { _id: 'alok' }, amount: 10000 }],
          shares: [{ user: { _id: 'alok' }, amount: 10000 }],
        },
      ],
    });

    expect(rowFor(summary, 'alok')).toMatchObject({ paid: 10000, owed: 10000, balance: 0 });
  });
});

describe('summarise — subset splits', () => {
  it('does not charge someone who was left out of the split', () => {
    // The spec §7 veg-dinner case: three of four people share a meal.
    const summary = summarise({
      members: roster(...MEMBERS),
      expenses: [equalExpense(30000, 'alok', ['alok', 'rahul', 'aman'])],
    });

    expect(rowFor(summary, 'rohit')).toMatchObject({ paid: 0, owed: 0, balance: 0 });
    expect(rowFor(summary, 'alok').balance).toBe(20000);
  });

  it('separates the comparison figure from the ledger figure', () => {
    // Rohit was in no split at all, so he owes nothing — but the room average
    // still says he has put in less than the others. Two different questions.
    const summary = summarise({
      members: roster(...MEMBERS),
      expenses: [equalExpense(30000, 'alok', ['alok', 'rahul', 'aman'])],
    });

    expect(rowFor(summary, 'rohit').balance).toBe(0);
    expect(rowFor(summary, 'rohit').difference).toBe(-7500);
  });
});

describe('summarise — the sum-to-zero invariant', () => {
  it('holds for randomised rooms', () => {
    for (let run = 0; run < 1000; run += 1) {
      const size = 2 + Math.floor(Math.random() * 6);
      const people = Array.from({ length: size }, (unused, index) => `user${index}`);

      const expenses = Array.from({ length: 1 + Math.floor(Math.random() * 12) }, () => {
        const amount = 1 + Math.floor(Math.random() * 5_000_000);

        // A random non-empty subset splits it; a random non-empty subset paid.
        const participants = people.filter(() => Math.random() < 0.7);
        const payers = people.filter(() => Math.random() < 0.4);
        if (participants.length === 0) participants.push(people[0]);
        if (payers.length === 0) payers.push(people[0]);

        const shares = allocate(
          amount,
          participants.map(() => 1),
        );
        const paid = allocate(
          amount,
          payers.map(() => 1),
        );

        return {
          amount,
          paidBy: payers.map((user, index) => ({ user, amount: paid[index] })),
          shares: participants.map((user, index) => ({ user, amount: shares[index] })),
        };
      });

      const summary = summarise({ members: roster(...people), expenses });

      const net = summary.members.reduce((sum, row) => sum + row.balance, 0);
      const owed = summary.members.reduce((sum, row) => sum + row.owed, 0);
      const paid = summary.members.reduce((sum, row) => sum + row.paid, 0);

      expect(net).toBe(0);
      expect(owed).toBe(summary.totals.total);
      expect(paid).toBe(summary.totals.total);
    }
  });
});

describe('standing', () => {
  it('bands anything within 5% of the average as near', () => {
    expect(standing(4000, 100000)).toBe('near');
    expect(standing(-5000, 100000)).toBe('near');
    expect(standing(5001, 100000)).toBe('above');
    expect(standing(-5001, 100000)).toBe('below');
  });

  it('treats an empty room as settled rather than dividing by zero', () => {
    expect(standing(0, 0)).toBe('near');
  });
});

describe('summarise — confirmed settlements', () => {
  /** The plan §3.1 room: Alok −₹100, Rahul −₹300, Aman +₹100, Rohit +₹300. */
  const room = () => specExample();

  it('leaves the expenses alone (spec §12)', () => {
    // Paying somebody back does not change what the dinner cost.
    const summary = summarise({
      ...room(),
      settlements: [{ from: 'rahul', to: 'rohit', amount: 30000 }],
    });

    expect(summary.totals.total).toBe(200000);
    expect(rowFor(summary, 'rahul').paid).toBe(20000);
    expect(rowFor(summary, 'rahul').owed).toBe(50000);
    expect(rowFor(summary, 'rohit').paid).toBe(80000);
  });

  it('moves the balance instead', () => {
    const summary = summarise({
      ...room(),
      settlements: [{ from: 'rahul', to: 'rohit', amount: 30000 }],
    });

    expect(rowFor(summary, 'rahul').balance).toBe(0);
    expect(rowFor(summary, 'rohit').balance).toBe(0);
    // The pair who did not settle are untouched.
    expect(rowFor(summary, 'alok').balance).toBe(-10000);
    expect(rowFor(summary, 'aman').balance).toBe(10000);
  });

  it('reports what was paid out and taken in', () => {
    const summary = summarise({
      ...room(),
      settlements: [{ from: 'rahul', to: 'rohit', amount: 30000 }],
    });

    expect(rowFor(summary, 'rahul')).toMatchObject({
      settledOut: 30000,
      settledIn: 0,
      settled: 30000,
    });
    expect(rowFor(summary, 'rohit')).toMatchObject({
      settledOut: 0,
      settledIn: 30000,
      settled: -30000,
    });
  });

  it('settles the whole room when every suggestion is paid', () => {
    const summary = summarise({
      ...room(),
      settlements: [
        { from: 'rahul', to: 'rohit', amount: 30000 },
        { from: 'alok', to: 'aman', amount: 10000 },
      ],
    });

    expect(summary.members.every((member) => member.balance === 0)).toBe(true);
    expect(settleUp(summary.members)).toEqual([]);
  });

  it('handles a partial payment', () => {
    const summary = summarise({
      ...room(),
      settlements: [{ from: 'rahul', to: 'rohit', amount: 10000 }],
    });

    expect(rowFor(summary, 'rahul').balance).toBe(-20000);
    expect(rowFor(summary, 'rohit').balance).toBe(20000);
  });

  it('adds up several settlements for the same person', () => {
    const summary = summarise({
      ...room(),
      settlements: [
        { from: 'rahul', to: 'rohit', amount: 10000 },
        { from: 'rahul', to: 'rohit', amount: 20000 },
      ],
    });

    expect(rowFor(summary, 'rahul').settledOut).toBe(30000);
    expect(rowFor(summary, 'rahul').balance).toBe(0);
  });

  it('leaves the spending comparison alone', () => {
    // Settling up is not spending. Counting it would tell someone who paid
    // their debt that they now spend below average.
    const settled = summarise({
      ...room(),
      settlements: [{ from: 'rahul', to: 'rohit', amount: 30000 }],
    });

    expect(rowFor(settled, 'rahul').difference).toBe(-30000);
    expect(rowFor(settled, 'rohit').difference).toBe(30000);
  });

  it('still sums to zero, whatever the settlements', () => {
    for (let run = 0; run < 500; run += 1) {
      const people = ['alok', 'rahul', 'aman', 'rohit'];
      const settlements = Array.from({ length: Math.floor(Math.random() * 6) }, () => {
        const [from, to] = [...people].sort(() => Math.random() - 0.5);
        return { from, to, amount: 1 + Math.floor(Math.random() * 100000) };
      });

      const summary = summarise({ ...room(), settlements });

      expect(summary.members.reduce((sum, member) => sum + member.balance, 0)).toBe(0);
      // And whatever state they are in, a settlement plan still closes them out.
      expect(settleUp(summary.members).length).toBeLessThanOrEqual(people.length - 1);
    }
  });

  it('gives a settlement-only participant a row', () => {
    // Somebody who was in no expense but received a payment is still on the
    // ledger — dropping them would lose the money.
    const summary = summarise({
      members: roster('alok', 'rahul'),
      expenses: [],
      settlements: [{ from: 'alok', to: 'rahul', amount: 5000 }],
    });

    expect(rowFor(summary, 'alok').balance).toBe(5000);
    expect(rowFor(summary, 'rahul').balance).toBe(-5000);
  });
});
