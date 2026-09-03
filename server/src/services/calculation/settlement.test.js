import { describe, expect, it } from 'vitest';

import { settleUp, settlementsFor } from './settlement.js';

/**
 * A settlement list is only correct if paying every line in it leaves everybody
 * on zero. That is the property tested here, against randomised balances —
 * a list that looks sensible but leaves ₹0.01 behind is exactly the bug this
 * file exists to catch.
 */

const balances = (entries) =>
  Object.entries(entries).map(([user, balance]) => ({ user, balance }));

/** Apply a settlement to its balances. Everyone should land on zero. */
const applied = (input, payments) => {
  const result = new Map(input.map(({ user, balance }) => [user, balance]));

  for (const payment of payments) {
    result.set(payment.from, result.get(payment.from) + payment.amount);
    result.set(payment.to, result.get(payment.to) - payment.amount);
  }

  return [...result.values()];
};

describe('settleUp — the plan §3.1 worked example', () => {
  const input = balances({ alok: -10000, rahul: -30000, aman: 10000, rohit: 30000 });
  const payments = settleUp(input);

  it('settles in two payments, not the three spec §5 sketches', () => {
    expect(payments).toHaveLength(2);
  });

  it('pairs the largest debtor with the largest creditor', () => {
    expect(payments).toEqual([
      { from: 'rahul', to: 'rohit', amount: 30000 },
      { from: 'alok', to: 'aman', amount: 10000 },
    ]);
  });

  it('leaves everybody on zero', () => {
    expect(applied(input, payments).every((balance) => balance === 0)).toBe(true);
  });
});

describe('settleUp — edges', () => {
  it('asks for nothing when everyone is already square', () => {
    expect(settleUp(balances({ alok: 0, rahul: 0 }))).toEqual([]);
  });

  it('handles an empty room', () => {
    expect(settleUp()).toEqual([]);
    expect(settleUp([])).toEqual([]);
  });

  it('splits one debtor across several creditors', () => {
    const input = balances({ alok: -60000, rahul: 20000, aman: 40000 });

    expect(settleUp(input)).toEqual([
      { from: 'alok', to: 'aman', amount: 40000 },
      { from: 'alok', to: 'rahul', amount: 20000 },
    ]);
  });

  it('is stable when two people owe exactly the same amount', () => {
    // Ties break on user id, so the same room never reshuffles between loads.
    const input = balances({ zed: -5000, adam: -5000, mid: 10000 });

    expect(settleUp(input)).toEqual([
      { from: 'adam', to: 'mid', amount: 5000 },
      { from: 'zed', to: 'mid', amount: 5000 },
    ]);
  });

  it('carries a single paise rather than dropping it', () => {
    const input = balances({ alok: -1, rahul: 1 });
    expect(settleUp(input)).toEqual([{ from: 'alok', to: 'rahul', amount: 1 }]);
  });

  it('refuses to invent a settlement for balances that do not sum to zero', () => {
    // Not user input — this can only mean a bug upstream, and a plausible-looking
    // payment list would hide it behind someone's phantom debt.
    expect(() => settleUp(balances({ alok: -100, rahul: 50 }))).toThrow(/sum to zero/);
  });
});

describe('settleUp — invariants over randomised balances', () => {
  it('always zeroes everyone, in at most n−1 payments', () => {
    for (let run = 0; run < 2000; run += 1) {
      const size = 2 + Math.floor(Math.random() * 8);
      const raw = Array.from({ length: size }, (unused, index) => ({
        user: `user${index}`,
        balance: Math.floor(Math.random() * 2_000_000) - 1_000_000,
      }));

      // Force the sum to zero the way real expenses do, by absorbing the
      // remainder into the last person.
      const drift = raw.reduce((sum, row) => sum + row.balance, 0);
      raw[raw.length - 1].balance -= drift;

      const payments = settleUp(raw);

      expect(applied(raw, payments).every((balance) => balance === 0)).toBe(true);
      expect(payments.length).toBeLessThanOrEqual(size - 1);
      expect(payments.every((payment) => Number.isInteger(payment.amount) && payment.amount > 0)).toBe(
        true,
      );
      expect(payments.every((payment) => payment.from !== payment.to)).toBe(true);
    }
  });
});

describe('settlementsFor', () => {
  const payments = [
    { from: 'rahul', to: 'rohit', amount: 30000 },
    { from: 'alok', to: 'aman', amount: 10000 },
    { from: 'alok', to: 'rohit', amount: 5000 },
  ];

  it('splits one person view into what they pay and what they receive', () => {
    expect(settlementsFor(payments, 'alok')).toEqual({
      owes: [
        { from: 'alok', to: 'aman', amount: 10000 },
        { from: 'alok', to: 'rohit', amount: 5000 },
      ],
      receives: [],
      totalOwed: 15000,
      totalToReceive: 0,
    });
  });

  it('adds up what is coming to a creditor', () => {
    expect(settlementsFor(payments, 'rohit')).toMatchObject({
      totalOwed: 0,
      totalToReceive: 35000,
    });
  });

  it('reports nothing for someone who is already settled', () => {
    expect(settlementsFor(payments, 'nobody')).toEqual({
      owes: [],
      receives: [],
      totalOwed: 0,
      totalToReceive: 0,
    });
  });
});
