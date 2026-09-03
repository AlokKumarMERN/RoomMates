import { describe, expect, it } from 'vitest';

import { MAX_AMOUNT_PAISE } from '../../utils/expense.constants.js';
import { allocate, resolvePaidBy, resolveShares } from './split.js';

/**
 * The split resolver is the code most likely to be wrong and least likely to
 * announce it: an off-by-one-paise bug produces a ledger that looks fine on
 * every screen and simply never settles. So the property that matters most —
 * shares sum to the total, always — is tested against randomised inputs rather
 * than a handful of tidy numbers.
 */

const users = (...ids) => ids.map((user) => ({ user }));
const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);

describe('allocate', () => {
  it('divides evenly when it can', () => {
    expect(allocate(200000, [1, 1, 1, 1])).toEqual([50000, 50000, 50000, 50000]);
  });

  it('hands out the leftover paise instead of losing them', () => {
    // ₹1000 ÷ 3 = 33333.33 paise each. Floors give 99999 — one paise short.
    expect(allocate(100000, [1, 1, 1])).toEqual([33334, 33333, 33333]);
    expect(sum(allocate(100000, [1, 1, 1]).map((amount) => ({ amount })))).toBe(100000);
  });

  it('gives the leftover to the largest fractional remainder', () => {
    // Weights 1:1:2 over 7 paise → 1.75, 1.75, 3.5. Bases 1,1,3 leave 2 over;
    // the two 0.75 fractions outrank the 0.5.
    expect(allocate(7, [1, 1, 2])).toEqual([2, 2, 3]);
  });

  it('sums to the total for any weights (randomised)', () => {
    for (let run = 0; run < 2000; run += 1) {
      const amount = 1 + Math.floor(Math.random() * MAX_AMOUNT_PAISE);
      const weights = Array.from(
        { length: 1 + Math.floor(Math.random() * 8) },
        () => 1 + Math.floor(Math.random() * 10000),
      );

      const parts = allocate(amount, weights);

      expect(parts.reduce((total, part) => total + part, 0)).toBe(amount);
      expect(parts.every((part) => Number.isInteger(part) && part >= 0)).toBe(true);
    }
  });
});

describe('resolveShares — equal', () => {
  it('reproduces the spec §5 example', () => {
    const shares = resolveShares({
      amount: 200000,
      splitType: 'equal',
      participants: users('alok', 'rahul', 'aman', 'rohit'),
    });

    expect(shares).toEqual([
      { user: 'alok', amount: 50000 },
      { user: 'rahul', amount: 50000 },
      { user: 'aman', amount: 50000 },
      { user: 'rohit', amount: 50000 },
    ]);
  });

  it('splits a subset of the room — the veg dinner case', () => {
    const shares = resolveShares({
      amount: 90000,
      splitType: 'equal',
      participants: users('a', 'b', 'c'),
    });

    expect(shares.map((share) => share.amount)).toEqual([30000, 30000, 30000]);
    expect(shares.some((share) => share.user === 'd')).toBe(false);
  });

  it('gives the same person the extra paise whatever order the client sends', () => {
    const forwards = resolveShares({
      amount: 100000,
      splitType: 'equal',
      participants: users('alok', 'rahul', 'aman'),
    });
    const backwards = resolveShares({
      amount: 100000,
      splitType: 'equal',
      participants: users('aman', 'rahul', 'alok'),
    });

    const byUser = (shares) =>
      Object.fromEntries(shares.map((share) => [share.user, share.amount]));

    expect(byUser(forwards)).toEqual(byUser(backwards));
    // …and each response keeps the order the caller asked for.
    expect(forwards.map((share) => share.user)).toEqual(['alok', 'rahul', 'aman']);
  });

  it('rejects an empty participant list', () => {
    expect(() =>
      resolveShares({ amount: 1000, splitType: 'equal', participants: [] }),
    ).toThrow(/at least one person/i);
  });

  it('rejects the same person twice', () => {
    expect(() =>
      resolveShares({ amount: 1000, splitType: 'equal', participants: users('a', 'a') }),
    ).toThrow(/only appear once/i);
  });

  it('rejects amounts that are not positive whole paise', () => {
    for (const amount of [0, -100, 12.5, Number.NaN]) {
      expect(() =>
        resolveShares({ amount, splitType: 'equal', participants: users('a') }),
      ).toThrow(/greater than zero/i);
    }
  });

  it('rejects an implausibly large amount', () => {
    expect(() =>
      resolveShares({
        amount: MAX_AMOUNT_PAISE + 1,
        splitType: 'equal',
        participants: users('a'),
      }),
    ).toThrow(/larger than this app supports/i);
  });
});

describe('resolveShares — custom', () => {
  it('keeps the amounts it is given', () => {
    const shares = resolveShares({
      amount: 100000,
      splitType: 'custom',
      participants: [
        { user: 'a', amount: 60000 },
        { user: 'b', amount: 40000 },
      ],
    });

    expect(shares).toEqual([
      { user: 'a', amount: 60000 },
      { user: 'b', amount: 40000 },
    ]);
  });

  it('says how far off a split that does not add up is', () => {
    expect(() =>
      resolveShares({
        amount: 100000,
        splitType: 'custom',
        participants: [
          { user: 'a', amount: 60000 },
          { user: 'b', amount: 35000 },
        ],
      }),
    ).toThrow(/short of the total by 5000 paise/);

    expect(() =>
      resolveShares({
        amount: 100000,
        splitType: 'custom',
        participants: [
          { user: 'a', amount: 60000 },
          { user: 'b', amount: 45000 },
        ],
      }),
    ).toThrow(/exceed the total by 5000 paise/);
  });

  it('rejects a zero share rather than storing a participant who owes nothing', () => {
    expect(() =>
      resolveShares({
        amount: 100000,
        splitType: 'custom',
        participants: [
          { user: 'a', amount: 100000 },
          { user: 'b', amount: 0 },
        ],
      }),
    ).toThrow(/above zero/i);
  });
});

describe('resolveShares — percentage', () => {
  it('splits by percentage', () => {
    const shares = resolveShares({
      amount: 100000,
      splitType: 'percentage',
      participants: [
        { user: 'a', percentage: 50 },
        { user: 'b', percentage: 30 },
        { user: 'c', percentage: 20 },
      ],
    });

    expect(shares.map((share) => share.amount)).toEqual([50000, 30000, 20000]);
  });

  it('handles two-decimal percentages without losing a paise', () => {
    const shares = resolveShares({
      amount: 100001,
      splitType: 'percentage',
      participants: [
        { user: 'a', percentage: 33.33 },
        { user: 'b', percentage: 33.33 },
        { user: 'c', percentage: 33.34 },
      ],
    });

    expect(sum(shares)).toBe(100001);
  });

  it('rejects percentages that do not add up to 100', () => {
    expect(() =>
      resolveShares({
        amount: 100000,
        splitType: 'percentage',
        participants: [
          { user: 'a', percentage: 50 },
          { user: 'b', percentage: 40 },
        ],
      }),
    ).toThrow(/add up to 100% — these add up to 90%/);
  });

  it('rejects more precision than two decimal places', () => {
    expect(() =>
      resolveShares({
        amount: 100000,
        splitType: 'percentage',
        participants: [
          { user: 'a', percentage: 33.333 },
          { user: 'b', percentage: 66.667 },
        ],
      }),
    ).toThrow(/two decimal places/i);
  });

  it('sums to the total for any valid percentage split (randomised)', () => {
    for (let run = 0; run < 500; run += 1) {
      const amount = 1 + Math.floor(Math.random() * MAX_AMOUNT_PAISE);
      const count = 2 + Math.floor(Math.random() * 5);

      // Build percentages that add to exactly 100 by carving up basis points.
      let remaining = 10000;
      const basisPoints = [];
      for (let index = 0; index < count - 1; index += 1) {
        const slice = 1 + Math.floor(Math.random() * (remaining - (count - index - 1)));
        basisPoints.push(slice);
        remaining -= slice;
      }
      basisPoints.push(remaining);

      const shares = resolveShares({
        amount,
        splitType: 'percentage',
        participants: basisPoints.map((points, index) => ({
          user: `u${index}`,
          percentage: points / 100,
        })),
      });

      expect(sum(shares)).toBe(amount);
    }
  });
});

describe('resolveShares — split type', () => {
  it('rejects a split type it does not know', () => {
    expect(() =>
      resolveShares({ amount: 1000, splitType: 'vibes', participants: users('a') }),
    ).toThrow(/how to split/i);
  });
});

describe('resolvePaidBy', () => {
  it('accepts a single payer covering the whole amount', () => {
    expect(resolvePaidBy({ amount: 200000, paidBy: [{ user: 'rohit', amount: 200000 }] })).toEqual([
      { user: 'rohit', amount: 200000 },
    ]);
  });

  it('accepts two people splitting the bill at the counter', () => {
    expect(
      resolvePaidBy({
        amount: 200000,
        paidBy: [
          { user: 'rohit', amount: 150000 },
          { user: 'aman', amount: 50000 },
        ],
      }),
    ).toHaveLength(2);
  });

  it('rejects payers whose amounts do not add up to the expense', () => {
    expect(() =>
      resolvePaidBy({ amount: 200000, paidBy: [{ user: 'rohit', amount: 150000 }] }),
    ).toThrow(/50000 paise short/);
  });

  it('rejects nobody having paid', () => {
    expect(() => resolvePaidBy({ amount: 200000, paidBy: [] })).toThrow(/who paid/i);
  });
});
