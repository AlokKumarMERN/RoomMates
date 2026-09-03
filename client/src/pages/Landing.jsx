import { Link } from 'react-router-dom';

import Logo from '../components/Logo.jsx';
import useAuth from '../hooks/useAuth.js';
import { formatINR, formatSignedINR } from '../utils/money.js';

/**
 * Amounts are in paise, exactly as the API will send them — so this preview uses
 * the same formatting path as the real dashboard rather than hard-coded strings.
 */
const DEMO_MEMBERS = [
  { name: 'Alok', paid: 40000, owed: 50000 },
  { name: 'Rahul', paid: 20000, owed: 50000 },
  { name: 'Aman', paid: 60000, owed: 50000 },
  { name: 'Rohit', paid: 80000, owed: 50000 },
];

const DEMO_SETTLEMENTS = [
  { from: 'Rahul', to: 'Rohit', amount: 30000 },
  { from: 'Alok', to: 'Aman', amount: 10000 },
];

const FEATURES = [
  {
    title: 'One code, everyone in',
    body: 'Create a room, share the code, and your flatmates join in seconds. Keep separate rooms for home, trips and the office — the books never mix.',
  },
  {
    title: 'Split it how it actually happened',
    body: 'Equally, by percentage, by exact amounts, or between just the three people who ordered dinner. Not everything is shared by everyone.',
  },
  {
    title: 'Settle in the fewest payments',
    body: 'We work out the net position for each person and suggest the smallest set of transfers that clears it. Fewer payments, less confusion.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const total = DEMO_MEMBERS.reduce((sum, member) => sum + member.paid, 0);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Logo size="sm" />

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center sm:pt-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl">
            Shared expenses, settled fairly.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-slate-600">
            Split expenses. Stay organized. Live together better. Track what everyone spends and
            find out exactly who owes whom — without the group-chat arithmetic.
          </p>

          {!isAuthenticated && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-700"
              >
                Create your first room
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          )}
        </section>

        {/* Worked example — the clearest way to explain what the app does */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-slate-900">Home</span>
                <span className="tabular rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  RM-7X92AB
                </span>
              </div>
              <span className="text-sm text-slate-500">
                4 members · {formatINR(total, { showDecimals: false })} total
              </span>
            </div>

            {/* Table on larger screens, cards on mobile (spec §22) */}
            <div className="divide-y divide-slate-100">
              {DEMO_MEMBERS.map((member) => {
                const balance = member.paid - member.owed;
                const isCreditor = balance > 0;

                return (
                  <div
                    key={member.name}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                        aria-hidden="true"
                      >
                        {member.name[0]}
                      </span>
                      <span className="truncate text-sm text-slate-900">{member.name}</span>
                    </div>

                    <div className="flex items-center gap-5">
                      <span className="tabular hidden text-sm text-slate-500 sm:block">
                        paid {formatINR(member.paid, { showDecimals: false })}
                      </span>
                      <span
                        className={`tabular rounded-md px-2 py-1 text-sm font-semibold ${
                          isCreditor
                            ? 'bg-positive-50 text-positive-700'
                            : 'bg-negative-50 text-negative-700'
                        }`}
                      >
                        {formatSignedINR(balance, { showDecimals: false })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Suggested settlement — 2 payments
              </h2>
              <ul className="mt-3 space-y-2">
                {DEMO_SETTLEMENTS.map((settlement) => (
                  <li
                    key={`${settlement.from}-${settlement.to}`}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-900">{settlement.from}</span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                    <span className="font-medium text-slate-900">{settlement.to}</span>
                    <span className="tabular ml-auto font-semibold text-slate-900">
                      {formatINR(settlement.amount, { showDecimals: false })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm text-pretty text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <p className="text-center text-sm text-slate-500">
          RoomMates — split expenses, stay organized, live together better.
        </p>
      </footer>
    </div>
  );
}
