import { describe, expect, it } from 'vitest';

import { diffExpense } from './diff.js';

const base = () => ({
  amount: 50000,
  description: 'Dinner',
  category: 'food',
  date: new Date('2026-09-01T00:00:00Z'),
  notes: null,
  splitType: 'equal',
  paidBy: [{ user: 'alok', amount: 50000 }],
  shares: [
    { user: 'alok', amount: 25000 },
    { user: 'rahul', amount: 25000 },
  ],
});

describe('diffExpense — the spec §8 example', () => {
  it('records ₹500 → ₹650 as one changed field', () => {
    const before = base();
    const result = diffExpense(before, { ...before, amount: 65000 });

    expect(result.changedFields).toEqual(['amount']);
    expect(result.previousData).toEqual({ amount: 50000 });
    expect(result.newData).toEqual({ amount: 65000 });
  });
});

describe('diffExpense — what counts as a change', () => {
  it('reports nothing when nothing moved', () => {
    const before = base();
    expect(diffExpense(before, { ...before }).changedFields).toEqual([]);
  });

  it('ignores fields the caller did not send', () => {
    // A PATCH carrying only a description must not report the absent fields
    // as having been cleared.
    const before = base();
    const result = diffExpense(before, { description: 'Late dinner' });

    expect(result.changedFields).toEqual(['description']);
  });

  it('catches several fields at once', () => {
    const before = base();
    const result = diffExpense(before, {
      ...before,
      amount: 65000,
      category: 'groceries',
      description: 'Dinner and drinks',
    });

    expect(result.changedFields.sort()).toEqual(['amount', 'category', 'description']);
  });

  it('treats an empty note and no note as the same', () => {
    const before = { ...base(), notes: null };

    expect(diffExpense(before, { ...before, notes: '' }).changedFields).toEqual([]);
    expect(diffExpense(before, { ...before, notes: '   ' }).changedFields).toEqual([]);
    expect(diffExpense(before, { ...before, notes: 'Split with Priya' }).changedFields).toEqual([
      'notes',
    ]);
  });

  it('compares dates by instant, not by object identity', () => {
    const before = base();

    expect(
      diffExpense(before, { ...before, date: new Date('2026-09-01T00:00:00Z') }).changedFields,
    ).toEqual([]);
    expect(
      diffExpense(before, { ...before, date: new Date('2026-09-02T00:00:00Z') }).changedFields,
    ).toEqual(['date']);
  });
});

describe('diffExpense — split rows', () => {
  it('does not call a reordering an edit', () => {
    // The resolver returns participants in the order the client sent them, so
    // the same people at the same amounts must compare equal however they are
    // arranged.
    const before = base();
    const reordered = [
      { user: 'rahul', amount: 25000 },
      { user: 'alok', amount: 25000 },
    ];

    expect(diffExpense(before, { ...before, shares: reordered }).changedFields).toEqual([]);
  });

  it('catches an amount moving between the same two people', () => {
    const before = base();
    const shares = [
      { user: 'alok', amount: 30000 },
      { user: 'rahul', amount: 20000 },
    ];

    const result = diffExpense(before, { ...before, shares });

    expect(result.changedFields).toEqual(['shares']);
    expect(result.previousData.shares).toEqual([
      { user: 'alok', amount: 25000 },
      { user: 'rahul', amount: 25000 },
    ]);
  });

  it('catches someone being added to or dropped from the split', () => {
    const before = base();

    const added = diffExpense(before, {
      ...before,
      shares: [
        { user: 'alok', amount: 20000 },
        { user: 'rahul', amount: 20000 },
        { user: 'aman', amount: 10000 },
      ],
    });
    expect(added.changedFields).toEqual(['shares']);

    const dropped = diffExpense(before, {
      ...before,
      shares: [{ user: 'alok', amount: 50000 }],
    });
    expect(dropped.changedFields).toEqual(['shares']);
  });

  it('stores rows as plain ids, never as documents', () => {
    const before = {
      ...base(),
      shares: [
        { user: { _id: 'alok', name: 'Alok' }, amount: 25000 },
        { user: { _id: 'rahul', name: 'Rahul' }, amount: 25000 },
      ],
    };

    const result = diffExpense(before, {
      ...before,
      shares: [{ user: 'alok', amount: 50000 }],
    });

    expect(result.previousData.shares).toEqual([
      { user: 'alok', amount: 25000 },
      { user: 'rahul', amount: 25000 },
    ]);
  });

  it('sees through populated refs when deciding nothing changed', () => {
    const before = {
      ...base(),
      shares: [
        { user: { _id: 'alok' }, amount: 25000 },
        { user: { _id: 'rahul' }, amount: 25000 },
      ],
    };

    expect(diffExpense(before, { ...before, shares: base().shares }).changedFields).toEqual([]);
  });
});
