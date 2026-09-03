import { useState } from 'react';

import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { CATEGORIES } from '../../utils/categories.js';

/**
 * The history page's filter row (spec §19).
 *
 * Two tiers, because eleven controls shown at once is a wall nobody reads. The
 * four people reach for — search, category, who, sort — stay visible; date
 * range, amount range, edited and removed live behind "More filters", which
 * opens by itself when any of them is set, so a shared link never hides the
 * reason the list looks the way it does.
 */

export const SORT_OPTIONS = [
  { value: '-date', label: 'Newest first' },
  { value: 'date', label: 'Oldest first' },
  { value: '-amount', label: 'Largest first' },
  { value: 'amount', label: 'Smallest first' },
];

export const EMPTY_FILTERS = {
  search: '',
  category: '',
  member: '',
  from: '',
  to: '',
  minAmount: '',
  maxAmount: '',
  splitType: '',
  edited: '',
  deleted: 'exclude',
  sort: '-date',
};

/** Which filters live behind the "More filters" toggle. */
const ADVANCED = ['from', 'to', 'minAmount', 'maxAmount', 'splitType', 'edited', 'deleted'];

export function isFiltered(filters) {
  return Object.entries(EMPTY_FILTERS).some(([key, value]) => filters[key] !== value);
}

const dateField =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none';

export default function ExpenseFilters({ filters, onChange, onClear, memberOptions }) {
  const hasAdvanced = ADVANCED.some((key) => filters[key] !== EMPTY_FILTERS[key]);
  const [showAdvanced, setShowAdvanced] = useState(hasAdvanced);

  const set = (key) => (event) => onChange(key, event.target.value);

  return (
    <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="sr-only">Filter expenses</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Search"
          name="search"
          type="search"
          placeholder="Dinner, rent…"
          value={filters.search}
          onChange={set('search')}
          hint="Description and notes"
        />
        <Select
          label="Category"
          value={filters.category}
          onChange={set('category')}
          options={[
            { value: '', label: 'All categories' },
            ...CATEGORIES.map((category) => ({
              value: category.value,
              label: `${category.icon}  ${category.label}`,
            })),
          ]}
        />
        <Select
          label="Involving"
          value={filters.member}
          onChange={set('member')}
          options={memberOptions}
          hint="Paid for it, or owes part of it"
        />
        <Select label="Sort" value={filters.sort} onChange={set('sort')} options={SORT_OPTIONS} />
      </div>

      {showAdvanced && (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-from" className="block text-sm font-medium text-slate-700">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={set('from')}
              className={dateField}
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="block text-sm font-medium text-slate-700">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={set('to')}
              className={dateField}
            />
          </div>

          <Input
            label="Least"
            name="minAmount"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={filters.minAmount}
            onChange={set('minAmount')}
            hint="In rupees"
          />
          <Input
            label="Most"
            name="maxAmount"
            type="text"
            inputMode="decimal"
            placeholder="Any"
            value={filters.maxAmount}
            onChange={set('maxAmount')}
            hint="In rupees"
          />

          <Select
            label="Split type"
            value={filters.splitType}
            onChange={set('splitType')}
            options={[
              { value: '', label: 'Any split' },
              { value: 'equal', label: 'Equally' },
              { value: 'custom', label: 'By amount' },
              { value: 'percentage', label: 'By percentage' },
            ]}
          />
          <Select
            label="Edited"
            value={filters.edited}
            onChange={set('edited')}
            options={[
              { value: '', label: 'Edited or not' },
              { value: 'yes', label: 'Only edited' },
              { value: 'no', label: 'Never edited' },
            ]}
          />
          <Select
            label="Removed"
            value={filters.deleted}
            onChange={set('deleted')}
            options={[
              { value: 'exclude', label: 'Hide removed' },
              { value: 'include', label: 'Include removed' },
              { value: 'only', label: 'Only removed' },
            ]}
            hint="Removed expenses are kept on record"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((shown) => !shown)}>
          {showAdvanced ? 'Fewer filters' : 'More filters'}
        </Button>
        {isFiltered(filters) && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </section>
  );
}
