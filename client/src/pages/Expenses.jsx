import { useState } from 'react';
import { Link } from 'react-router-dom';

import ExpenseRow from '../components/expense/ExpenseRow.jsx';
import Button from '../components/ui/Button.jsx';
import Select from '../components/ui/Select.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useExpenses from '../hooks/useExpenses.js';
import useRoom from '../hooks/useRoom.js';
import { CATEGORIES } from '../utils/categories.js';
import { formatINR } from '../utils/money.js';

const SORT_OPTIONS = [
  { value: '-date', label: 'Newest first' },
  { value: 'date', label: 'Oldest first' },
  { value: '-amount', label: 'Largest first' },
  { value: 'amount', label: 'Smallest first' },
];

const EMPTY_FILTERS = { category: '', member: '', from: '', to: '', sort: '-date' };

export default function Expenses() {
  const { user } = useAuth();
  const { activeRoom, isLoading: isLoadingRooms } = useRoom();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { expenses, meta, isLoading, error } = useExpenses(activeRoom?.id, {
    ...filters,
    page,
    limit: 20,
  });

  // Any filter change invalidates the page number — page 3 of a narrower result
  // set is usually empty, which reads as "no expenses" and is simply wrong.
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const isFiltered = Object.entries(EMPTY_FILTERS).some(
    ([key, value]) => filters[key] !== value,
  );

  if (isLoadingRooms && !activeRoom) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-base font-medium text-slate-900">No room selected</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
          Expenses belong to a room. Create one or join with a code to start tracking.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/rooms/new"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Create room
          </Link>
          <Link
            to="/rooms/join"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Join with a code
          </Link>
        </div>
      </section>
    );
  }

  const memberOptions = [
    { value: '', label: 'Anyone' },
    ...activeRoom.members
      .filter((member) => member.isActive)
      .map((member) => ({
        value: member.user.id,
        label: member.user.id === user?.id ? `${member.user.name} (you)` : member.user.name,
      })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
          <p className="mt-1.5 text-slate-600">
            {activeRoom.name}
            {meta?.total > 0 && (
              <>
                {' · '}
                {meta.total} {meta.total === 1 ? 'expense' : 'expenses'}
              </>
            )}
          </p>
        </div>

        <Link
          to="/expenses/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Add expense
        </Link>
      </div>

      {/* Filters */}
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="sr-only">Filter expenses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Category"
            value={filters.category}
            onChange={(event) => setFilter('category', event.target.value)}
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
            onChange={(event) => setFilter('member', event.target.value)}
            options={memberOptions}
            hint="Paid for it, or owes part of it"
          />
          <div>
            <label
              htmlFor="filter-from"
              className="block text-sm font-medium text-slate-700"
            >
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => setFilter('from', event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
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
              onChange={(event) => setFilter('to', event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Select
            label="Sort"
            className="w-48"
            value={filters.sort}
            onChange={(event) => setFilter('sort', event.target.value)}
            options={SORT_OPTIONS}
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700"
        >
          {error}
        </p>
      )}

      {/* List */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <ul className="divide-y divide-slate-100">
            {/* Skeletons rather than a spinner: the list keeps its shape, so
                nothing jumps when the real rows arrive (spec §24). */}
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="flex items-center gap-3.5 px-5 py-3.5">
                <span className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <span className="flex-1">
                  <span className="block h-3.5 w-2/5 animate-pulse rounded bg-slate-100" />
                  <span className="mt-2 block h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                </span>
                <span className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center">
            <h2 className="text-base font-medium text-slate-900">
              {isFiltered ? 'Nothing matches those filters' : 'No expenses yet'}
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
              {isFiltered
                ? 'Try a wider date range, or clear the filters to see everything.'
                : 'Add the first one and RoomMates will work out who owes what.'}
            </p>
            <div className="mt-6">
              {isFiltered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link
                  to="/expenses/new"
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Add first expense
                </Link>
              )}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} currentUserId={user?.id} />
            ))}
          </ul>
        )}
      </section>

      {meta && meta.totalPages > 1 && (
        <nav
          aria-label="Expense pages"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {meta.page} of {meta.totalPages}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      {meta?.total > 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Totals, balances and who-owes-whom arrive with the dashboard in Phase 6. Every expense
          here already carries the split it was created with —{' '}
          {formatINR(expenses.reduce((total, expense) => total + expense.amount, 0))} on this page.
        </p>
      )}
    </div>
  );
}
