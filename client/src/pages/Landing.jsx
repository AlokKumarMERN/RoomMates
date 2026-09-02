import { useCallback, useEffect, useState } from 'react';

import { getHealth, triggerTestError } from '../services/health.service.js';

const STATUS_STYLES = {
  ok: 'bg-positive-50 text-positive-700 ring-positive-500/20',
  degraded: 'bg-amber-50 text-amber-800 ring-amber-500/20',
  offline: 'bg-negative-50 text-negative-700 ring-negative-500/20',
  checking: 'bg-slate-100 text-slate-600 ring-slate-400/20',
};

const STATUS_LABELS = {
  ok: 'API and database connected',
  degraded: 'API up, database unreachable',
  offline: 'API unreachable',
  checking: 'Checking connection…',
};

/**
 * Phase 1 landing page.
 *
 * Beyond the branding, it exists to prove the foundation works end to end:
 * the client reaches the API, the API reaches MongoDB, and a thrown error comes
 * back in the standard envelope. Phase 2 replaces the body with the real
 * marketing landing page and the sign-in call to action.
 */
export default function Landing() {
  const [status, setStatus] = useState('checking');
  const [health, setHealth] = useState(null);
  const [errorProbe, setErrorProbe] = useState(null);

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    try {
      const data = await getHealth();
      setHealth(data);
      setStatus(data.database === 'connected' ? 'ok' : 'degraded');
    } catch (error) {
      setHealth(null);
      setStatus('offline');
      setErrorProbe({ kind: 'health', code: error.code, message: error.message });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  /** Calls the deliberate-failure route to confirm error shaping works. */
  const probeErrorHandling = useCallback(async () => {
    try {
      await triggerTestError();
      setErrorProbe({ kind: 'unexpected', message: 'Expected an error but the request succeeded.' });
    } catch (error) {
      setErrorProbe({ kind: 'handled', code: error.code, message: error.message });
    }
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Room<span className="text-brand-500">Mates</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Split expenses. Stay organized. Live together better.
          </p>
        </header>

        <section
          aria-labelledby="status-heading"
          className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2
            id="status-heading"
            className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            Phase 1 — Foundation
          </h2>

          <div
            className={`mt-4 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
          >
            <span
              className={`size-2 shrink-0 rounded-full ${
                status === 'ok'
                  ? 'bg-positive-500'
                  : status === 'degraded'
                    ? 'bg-amber-500'
                    : status === 'offline'
                      ? 'bg-negative-500'
                      : 'animate-pulse bg-slate-400'
              }`}
              aria-hidden="true"
            />
            {STATUS_LABELS[status]}
          </div>

          {health && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-slate-500">Service</dt>
              <dd className="tabular text-slate-900">{health.service}</dd>
              <dt className="text-slate-500">Environment</dt>
              <dd className="tabular text-slate-900">{health.environment}</dd>
              <dt className="text-slate-500">Database</dt>
              <dd className="tabular text-slate-900">{health.database}</dd>
              <dt className="text-slate-500">Uptime</dt>
              <dd className="tabular text-slate-900">{health.uptimeSeconds}s</dd>
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={checkHealth}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={probeErrorHandling}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Test error handling
            </button>
          </div>

          {errorProbe && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700"
            >
              {errorProbe.kind === 'handled' && (
                <span className="font-medium text-positive-700">Handled correctly — </span>
              )}
              <span className="tabular text-slate-500">{errorProbe.code}: </span>
              {errorProbe.message}
            </p>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Next up: Phase 2 — authentication.
        </p>
      </div>
    </main>
  );
}
