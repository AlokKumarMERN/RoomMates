import { useCallback, useMemo, useRef, useState } from 'react';

import Toaster from '../components/ui/Toaster.jsx';
import { ToastContext } from './toast-context.js';

/**
 * Brief confirmations (spec §23).
 *
 * Toasts are for things that WORKED. A failure that needs the user to do
 * something belongs next to the thing that failed — a form error four inches
 * away, which disappears after four seconds, is worse than no message. So the
 * API here is deliberately narrow: `toast.success` and `toast.info` for
 * outcomes, and `toast.error` only for the case where the action's own page has
 * already been left behind.
 */

const DEFAULT_DURATION_MS = 4000;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone, message, duration = DEFAULT_DURATION_MS) => {
      const id = (nextId.current += 1);

      setToasts((current) => {
        const next = [...current, { id, tone, message }];
        // Three is as many as anyone reads. Past that the oldest goes, so a
        // burst of actions cannot bury the screen.
        return next.slice(-3);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message, duration) => push('success', message, duration),
      info: (message, duration) => push('info', message, duration),
      error: (message, duration) => push('error', message, duration),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
