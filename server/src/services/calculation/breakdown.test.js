import { describe, expect, it } from 'vitest';

import { byCategory, byDay } from './breakdown.js';

const expense = (amount, category, date) => ({ amount, category, date });

describe('byCategory', () => {
  it('adds up each category and counts the expenses', () => {
    expect(
      byCategory([
        expense(50000, 'food', '2026-09-01'),
        expense(30000, 'food', '2026-09-02'),
        expense(120000, 'rent', '2026-09-01'),
      ]),
    ).toEqual([
      { category: 'rent', total: 120000, count: 1 },
      { category: 'food', total: 80000, count: 2 },
    ]);
  });

  it('sorts largest first, then by name so ties stay put', () => {
    const rows = byCategory([
      expense(10000, 'water', '2026-09-01'),
      expense(10000, 'food', '2026-09-01'),
      expense(10000, 'rent', '2026-09-01'),
    ]);

    expect(rows.map((row) => row.category)).toEqual(['food', 'rent', 'water']);
  });

  it('files a missing category under other rather than dropping the money', () => {
    expect(byCategory([{ amount: 5000, date: '2026-09-01' }])).toEqual([
      { category: 'other', total: 5000, count: 1 },
    ]);
  });

  it('omits categories nobody used', () => {
    // A chart of zero-height bars for ten unused categories says nothing.
    expect(byCategory([expense(5000, 'food', '2026-09-01')])).toHaveLength(1);
  });

  it('handles an empty room', () => {
    expect(byCategory()).toEqual([]);
    expect(byCategory([])).toEqual([]);
  });

  it('accounts for every paise', () => {
    const expenses = Array.from({ length: 200 }, () =>
      expense(
        1 + Math.floor(Math.random() * 100000),
        ['food', 'rent', 'water', 'other'][Math.floor(Math.random() * 4)],
        '2026-09-01',
      ),
    );

    const total = expenses.reduce((sum, row) => sum + row.amount, 0);
    expect(byCategory(expenses).reduce((sum, row) => sum + row.total, 0)).toBe(total);
  });
});

describe('byDay', () => {
  it('buckets by calendar day, oldest first', () => {
    expect(
      byDay([
        expense(30000, 'food', '2026-09-02'),
        expense(50000, 'food', '2026-09-01'),
        expense(20000, 'rent', '2026-09-01'),
      ]),
    ).toEqual([
      { date: '2026-09-01', total: 70000, count: 2 },
      { date: '2026-09-02', total: 30000, count: 1 },
    ]);
  });

  it('reads a Date the same way as an ISO string', () => {
    expect(byDay([expense(5000, 'food', new Date('2026-09-01T10:00:00Z'))])).toEqual([
      { date: '2026-09-01', total: 5000, count: 1 },
    ]);
  });

  it('leaves gaps for days with nothing in them', () => {
    // The client fills these — only it knows the window it is drawing.
    const rows = byDay([
      expense(5000, 'food', '2026-09-01'),
      expense(5000, 'food', '2026-09-30'),
    ]);

    expect(rows.map((row) => row.date)).toEqual(['2026-09-01', '2026-09-30']);
  });

  it('handles an empty room', () => {
    expect(byDay()).toEqual([]);
    expect(byDay([])).toEqual([]);
  });

  it('accounts for every paise', () => {
    const expenses = Array.from({ length: 200 }, () =>
      expense(
        1 + Math.floor(Math.random() * 100000),
        'food',
        `2026-09-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
      ),
    );

    const total = expenses.reduce((sum, row) => sum + row.amount, 0);
    expect(byDay(expenses).reduce((sum, row) => sum + row.total, 0)).toBe(total);
  });
});
