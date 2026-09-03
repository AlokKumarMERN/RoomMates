/**
 * Where toasts are drawn.
 *
 * `aria-live="polite"` on the container, not on each toast: the region has to
 * exist in the DOM before anything enters it, or a screen reader announces
 * nothing at all. Polite rather than assertive because a confirmation should
 * wait its turn — these never carry anything urgent.
 *
 * Positioned above the mobile bottom bar so it never covers the navigation, and
 * inset from the safe area so it clears the iOS home indicator.
 */

const TONES = {
  success: 'border-positive-500/30 bg-positive-50 text-positive-700',
  error: 'border-negative-500/30 bg-negative-50 text-negative-700',
  info: 'border-slate-200 bg-white text-slate-700',
};

const ICONS = {
  success: '✓',
  error: '!',
  info: 'ℹ',
};

export default function Toaster({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-sm ${TONES[toast.tone]}`}
        >
          <span className="mt-px shrink-0 text-sm font-semibold" aria-hidden="true">
            {ICONS[toast.tone]}
          </span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="-mr-1 shrink-0 rounded px-1 text-sm opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
