import { useState } from 'react';
import { Link } from 'react-router-dom';

import SettlementRow from '../components/settlement/SettlementRow.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import useSettlements from '../hooks/useSettlements.js';
import useSummary from '../hooks/useSummary.js';
import useToast from '../hooks/useToast.js';
import * as settlementApi from '../services/settlement.service.js';
import { formatINR, toPaise, toRupees } from '../utils/money.js';

/**
 * Settle up (spec §12).
 *
 * Two halves that are easy to confuse. The top is a SUGGESTION — computed from
 * the current balances every time the page loads, stored nowhere, owed to
 * nobody until somebody acts on it. The bottom is the RECORD — actual payments
 * people have said they made. Only a confirmed record moves a balance, which is
 * why acting on a suggestion does not make it disappear until the other person
 * says the money arrived.
 */
export default function Settlements() {
  const { user } = useAuth();
  const { activeRoom } = useRoom();
  const toast = useToast();

  const [historyPage, setHistoryPage] = useState(1);

  const { summary, isLoading: isLoadingSummary, reload: reloadSummary } = useSummary(activeRoom?.id);
  const {
    settlements,
    meta,
    isLoading: isLoadingSettlements,
    reload: reloadSettlements,
  } = useSettlements(activeRoom?.id, historyPage);

  // Which suggested payment has its amount box open, and what is typed in it.
  const [recording, setRecording] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = () => Promise.all([reloadSummary(), reloadSettlements()]);

  /**
   * Payments already recorded between a pair, not yet confirmed.
   *
   * A suggestion still shows the full amount while one of these is outstanding,
   * because an unconfirmed payment moves no balance — correct, but it invites
   * someone to pay twice. Keyed on the pair so the suggestion can say what is
   * already in flight.
   */
  const openByPair = new Map();

  for (const settlement of settlements) {
    if (settlement.status !== 'pending' && settlement.status !== 'paid') continue;

    const key = `${settlement.payer?.id}-${settlement.receiver?.id}`;
    openByPair.set(key, (openByPair.get(key) ?? 0) + settlement.amount);
  }

  const openRecord = (payment) => {
    setError(null);
    setRecording(payment);
    setAmountText(String(toRupees(payment.amount)));
  };

  const submitRecord = async (event) => {
    event.preventDefault();
    const amount = toPaise(amountText);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setBusyId('new');
    setError(null);

    try {
      await settlementApi.createSettlement(activeRoom.id, {
        payer: recording.from.id,
        receiver: recording.to.id,
        amount,
      });
      setRecording(null);
      toast.success(
        `Payment of ${formatINR(amount)} recorded. It counts once ${recording.to.id === user?.id ? 'you confirm' : recording.to.name?.split(' ')[0] + ' confirms'} it.`,
      );
      await refresh();
    } catch (recordError) {
      setError(recordError.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdate = async (settlement, status) => {
    setBusyId(settlement.id);
    setError(null);

    try {
      await settlementApi.updateSettlement(settlement.id, status);

      const DONE = {
        paid: 'Marked as sent.',
        confirmed: 'Confirmed — balances updated.',
        cancelled: 'Settlement cancelled.',
      };
      toast.success(DONE[status]);

      await refresh();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!activeRoom) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-base font-medium text-slate-900">No room selected</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
          Settlements belong to a room. Pick one first.
        </p>
        <Link
          to="/rooms"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          My rooms
        </Link>
      </section>
    );
  }

  const isSettled = summary && summary.settlements.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Settle up</h1>
      <p className="mt-1.5 text-slate-600">
        In <span className="font-medium text-slate-900">{activeRoom.name}</span>
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700"
        >
          {error}
        </p>
      )}

      {isLoadingSummary ? (
        <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        summary && (
          <>
            {isSettled ? (
              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-3xl" aria-hidden="true">
                  🎉
                </p>
                <h2 className="mt-3 text-base font-medium text-slate-900">
                  Everyone is settled up
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
                  Nobody in this room owes anybody anything right now.
                </p>
              </section>
            ) : (
              <>
                <div className="mt-6 grid items-start gap-4 sm:grid-cols-2">
                  <YourSide
                    title="You owe"
                    payments={summary.you.owes}
                    total={summary.you.totalOwed}
                    tone="negative"
                    empty="You do not owe anyone."
                    nameOf={(payment) => payment.to.name}
                  />
                  <YourSide
                    title="You will receive"
                    payments={summary.you.receives}
                    total={summary.you.totalToReceive}
                    tone="positive"
                    empty="Nobody owes you."
                    nameOf={(payment) => payment.from.name}
                  />
                </div>

                <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-3">
                    <h2 className="text-sm font-semibold text-slate-900">Suggested settlements</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      The fewest payments that clear the room —{' '}
                      {summary.settlements.length}{' '}
                      {summary.settlements.length === 1 ? 'payment' : 'payments'} for{' '}
                      {summary.totals.memberCount} people. Nothing here is recorded until somebody
                      acts on it.
                    </p>
                  </div>

                  <ul className="divide-y divide-slate-100">
                    {summary.settlements.map((payment) => {
                      const isMine =
                        payment.from.id === user?.id || payment.to.id === user?.id;
                      const key = `${payment.from.id}-${payment.to.id}`;
                      const isOpen = recording && `${recording.from.id}-${recording.to.id}` === key;
                      const alreadyRecorded = openByPair.get(key) ?? 0;

                      return (
                        <li key={key} className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-slate-900">
                              <span className="font-medium">
                                {payment.from.id === user?.id ? 'You' : payment.from.name}
                              </span>
                              <span className="mx-1.5 text-slate-400">→</span>
                              <span className="font-medium">
                                {payment.to.id === user?.id ? 'you' : payment.to.name}
                              </span>
                            </p>

                            <div className="flex items-center gap-3">
                              <span className="tabular text-sm font-semibold text-slate-900">
                                {formatINR(payment.amount)}
                              </span>
                              {/* Only the two people involved can record it — so
                                  everyone else sees the plan without a button
                                  the API would refuse. */}
                              {isMine && !isOpen && (
                                <Button size="sm" variant="secondary" onClick={() => openRecord(payment)}>
                                  Record
                                </Button>
                              )}
                            </div>
                          </div>

                          {alreadyRecorded > 0 && (
                            <p className="mt-1.5 text-xs text-slate-500">
                              {formatINR(alreadyRecorded)} already recorded and waiting to be
                              confirmed — it still counts here until then.
                            </p>
                          )}

                          {isOpen && (
                            <form onSubmit={submitRecord} className="mt-3 flex flex-wrap gap-2">
                              <label className="sr-only" htmlFor="settle-amount">
                                Amount in rupees
                              </label>
                              <input
                                id="settle-amount"
                                type="text"
                                inputMode="decimal"
                                value={amountText}
                                onChange={(event) => setAmountText(event.target.value)}
                                autoFocus
                                className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                              />
                              <Button size="sm" type="submit" isLoading={busyId === 'new'}>
                                Record payment
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => setRecording(null)}
                              >
                                Cancel
                              </Button>
                              {/* Part-payments are ordinary; the suggestion is
                                  a starting point, not a required amount. */}
                              <p className="w-full text-xs text-slate-500">
                                Change the amount if you are paying part of it. It stays pending
                                until {payment.to.id === user?.id ? 'you' : payment.to.name?.split(' ')[0]}{' '}
                                confirms the money arrived.
                              </p>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}
          </>
        )
      )}

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Settlement history</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Every payment recorded in this room, withdrawn ones included.
          </p>
        </div>

        {isLoadingSettlements ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6 text-brand-500" />
          </div>
        ) : settlements.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {settlements.map((settlement) => (
              <SettlementRow
                key={settlement.id}
                settlement={settlement}
                currentUserId={user?.id}
                onUpdate={handleUpdate}
                busyId={busyId}
              />
            ))}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <nav
            aria-label="Settlement pages"
            className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={historyPage <= 1}
              onClick={() => setHistoryPage((current) => current - 1)}
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
              onClick={() => setHistoryPage((current) => current + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}

function YourSide({ title, payments, total, tone, empty, nameOf }) {
  const toneClass = tone === 'positive' ? 'text-positive-700' : 'text-negative-700';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xs font-medium text-slate-500">{title}</h2>
      <p className={`mt-1.5 text-xl font-semibold ${total > 0 ? toneClass : 'text-slate-900'}`}>
        {formatINR(total)}
      </p>

      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {payments.map((payment) => (
            <li
              key={`${payment.from.id}-${payment.to.id}`}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="truncate text-slate-700">{nameOf(payment)}</span>
              <span className="tabular shrink-0 text-slate-900">{formatINR(payment.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
