import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ExpenseFilters, {
  EMPTY_FILTERS,
  isFiltered as filtersApplied,
} from '../components/expense/ExpenseFilters.jsx';
import ExpenseRow from '../components/expense/ExpenseRow.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useExpenses from '../hooks/useExpenses.js';
import useRoom from '../hooks/useRoom.js';
import { formatINR, toPaise } from '../utils/money.js';

/**
 * The expense history (spec §19).
 *
 * Every filter is applied server-side and the list is paginated, so the browser
 * only ever holds the page it is showing — a room with a thousand expenses
 * behaves exactly like a room with ten.
 */
export default function Expenses() {
  const { user } = useAuth();
  const { activeRoom, isLoading: isLoadingRooms } = useRoom();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // The search box updates on every keystroke; the request does not.
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const query = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
      // The two amount boxes are in rupees, like every other amount a person
      // types. Paise is what crosses the wire.
      //
      // The empty check is not redundant: toPaise("") is 0, not null — Number("")
      // is 0 in JavaScript — so converting unconditionally turns an untouched
      // "Most" box into "at most ₹0", and the list silently matches nothing.
      minAmount: filters.minAmount ? (toPaise(filters.minAmount) ?? '') : '',
      maxAmount: filters.maxAmount ? (toPaise(filters.maxAmount) ?? '') : '',
      page,
      limit: 20,
    }),
    [filters, debouncedSearch, page],
  );

  const { expenses, meta, isLoading, error } = useExpenses(activeRoom?.id, query);

  // Any filter change invalidates the page number — page 3 of a narrower result
  // set is usually empty, which reads as "no expenses" and is simply wrong.
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const isFiltered = filtersApplied(filters);

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

  // Past members are included: they appear on old expenses, and filtering the
  // history by someone who has since moved out is exactly the sort of question
  // a history page exists to answer.
  const memberOptions = [
    { value: '', label: 'Anyone' },
    ...activeRoom.members.map((member) => ({
      value: member.user.id,
      label:
        member.user.id === user?.id
          ? `${member.user.name} (you)`
          : member.isActive
            ? member.user.name
            : `${member.user.name} (left)`,
    })),
  ];

  const pageTotal = expenses.reduce((total, expense) => total + expense.amount, 0);

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
                {isFiltered && ' matching'}
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

      <ExpenseFilters
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
        memberOptions={memberOptions}
      />

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700"
        >
          {error}
        </p>
      )}

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <ul className="divide-y divide-slate-100">
            {/* Skeletons rather than a spinner: the list keeps its shape, so
                nothing jumps when the real rows arrive (spec §24). */}
            {Array.from({ length: 5 }).map((unused, index) => (
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
                ? 'Try a wider date range, a different search, or clear the filters to see everything.'
                : 'Add the first one and RoomMates will work out who owes what.'}
            </p>
            <div className="mt-6">
              {isFiltered ? (
                <Button variant="secondary" onClick={clearFilters}>
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
        <nav aria-label="Expense pages" className="mt-4 flex items-center justify-between gap-3">
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
          {formatINR(pageTotal)} on this page.{' '}
          {/* Deliberately not a running total of the filtered set: a figure that
              means "some of the matches" is more misleading than no figure, and
              the dashboard is where room totals belong. */}
          <Link to="/dashboard" className="font-medium text-brand-600 hover:text-brand-700">
            See the room totals
          </Link>
        </p>
      )}
    </div>
  );
}
