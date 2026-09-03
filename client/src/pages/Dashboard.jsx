import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import ChartCard from '../components/dashboard/ChartCard.jsx';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton.jsx';
import MemberComparison from '../components/dashboard/MemberComparison.jsx';
import SpendBarChart from '../components/dashboard/SpendBarChart.jsx';
import SpendOverTimeChart from '../components/dashboard/SpendOverTimeChart.jsx';
import SummaryCards from '../components/dashboard/SummaryCards.jsx';
import ExpenseRow from '../components/expense/ExpenseRow.jsx';
import RoomCode from '../components/RoomCode.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useExpenses from '../hooks/useExpenses.js';
import useRoom from '../hooks/useRoom.js';
import useSummary from '../hooks/useSummary.js';
import { categoryOf } from '../utils/categories.js';
import { foldTail, timeline } from '../utils/series.js';

/**
 * How many bars a chart may draw before the tail folds into "Other". Past
 * roughly seven, adjacent bars stop being tellable apart at a glance and the
 * chart becomes a badly formatted table. The full figures stay in each card's
 * table view.
 */
const MAX_CATEGORY_BARS = 7;
const MAX_MEMBER_BARS = 8;

/**
 * First names for the chart axis, with a last initial added only where two
 * people would otherwise both read as "Alok".
 */
function shortNames(members) {
  const counts = new Map();

  for (const row of members) {
    const first = row.user.name?.split(' ')[0] ?? '?';
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }

  return new Map(
    members.map((row) => {
      const parts = row.user.name?.split(' ') ?? [];
      const first = parts[0] ?? '?';
      const needsInitial = counts.get(first) > 1 && parts.length > 1;

      return [row.user.id, needsInitial ? `${first} ${parts[1][0]}.` : first];
    }),
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeRoom, rooms, isLoading } = useRoom();

  const { summary, isLoading: isLoadingSummary, isRefreshing, error } = useSummary(activeRoom?.id);

  const { expenses, meta, isLoading: isLoadingExpenses } = useExpenses(activeRoom?.id, {
    limit: 5,
  });

  const charts = useMemo(() => {
    if (!summary) return null;

    const names = shortNames(summary.members);

    return {
      // `foldTail` works on a `total` field, so the member rows are reshaped
      // first. Only people who actually paid for something — a row of
      // zero-length bars for everyone else says nothing.
      byMember: foldTail(
        summary.members
          .filter((row) => row.paid > 0)
          .sort((a, b) => b.paid - a.paid)
          .map((row) => ({ total: row.paid, name: names.get(row.user.id) ?? 'Someone' })),
        MAX_MEMBER_BARS,
        (row) => row.name,
      ),

      byCategory: foldTail(
        summary.byCategory,
        MAX_CATEGORY_BARS,
        (row) => categoryOf(row.category).label,
      ),

      overTime: timeline(summary.byDay, summary.range),
    };
  }, [summary]);

  if (isLoading && rooms.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1.5 text-slate-600">Create or join a room to get started.</p>

        <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-base font-medium text-slate-900">
            You haven&apos;t joined any rooms yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
            A room is a group of people sharing expenses — a flat, a trip, an office.
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
      </div>
    );
  }

  const isEmptyRoom = summary && summary.totals.expenseCount === 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-slate-600">
            Viewing <span className="font-medium text-slate-900">{activeRoom.name}</span> ·{' '}
            {activeRoom.memberCount} {activeRoom.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
        <RoomCode code={activeRoom.code} />
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-negative-500/20 bg-negative-50 px-4 py-3 text-sm text-negative-700">
          {error}
        </p>
      )}

      {isLoadingSummary ? (
        <DashboardSkeleton />
      ) : isEmptyRoom ? (
        <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-base font-medium text-slate-900">Nothing spent yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
            Add the first expense and RoomMates will work out the totals, who is up, who is
            down, and the shortest way to settle.
          </p>
          <Link
            to="/expenses/new"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Add first expense
          </Link>
        </section>
      ) : (
        summary && (
          // A refetch dims the previous numbers rather than replacing them with
          // skeletons — no layout jump, and the reader keeps their place.
          <div
            className={`mt-6 space-y-6 transition-opacity ${isRefreshing ? 'opacity-60' : ''}`}
          >
            <SummaryCards summary={summary} />

            <MemberComparison members={summary.members} currentUserId={user?.id} />

            {/* items-start: a five-bar chart should not be padded out to the
                height of an eight-bar one just because they share a row. */}
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <ChartCard
                title="Spending by member"
                hint="What each person has paid for"
                labelHeading="Member"
                valueHeading="Paid"
                rows={charts.byMember}
                emptyMessage="Nobody has paid for anything yet."
              >
                <SpendBarChart data={charts.byMember} />
              </ChartCard>

              <ChartCard
                title="Spending by category"
                hint="Where the room's money goes"
                labelHeading="Category"
                valueHeading="Total"
                rows={charts.byCategory}
                emptyMessage="No categories to show yet."
              >
                <SpendBarChart data={charts.byCategory} labelWidth={104} />
              </ChartCard>

              <ChartCard
                title="Spending over time"
                hint={
                  charts.overTime.granularity === 'month'
                    ? "The room's total, by month"
                    : "The room's total, by day"
                }
                labelHeading="Date"
                valueHeading="Total"
                rows={charts.overTime.points
                  .filter((point) => point.total > 0)
                  .map((point) => ({ label: point.date, total: point.total }))}
                emptyMessage="No spending recorded yet."
              >
                <SpendOverTimeChart
                  points={charts.overTime.points}
                  granularity={charts.overTime.granularity}
                />
              </ChartCard>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">Recent expenses</h3>
                  <Link
                    to="/expenses"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    View all {meta?.total ?? ''}
                  </Link>
                </div>

                {isLoadingExpenses ? (
                  <div className="flex justify-center py-10">
                    <Spinner className="size-6 text-brand-500" />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {expenses.map((expense) => (
                      <ExpenseRow key={expense.id} expense={expense} currentUserId={user?.id} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )
      )}
    </div>
  );
}
