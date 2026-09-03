import useCopyToClipboard from '../hooks/useCopyToClipboard.js';

/**
 * The room code with a one-tap copy. Shown wherever somebody might need to pass
 * it on, because "where do I find the code again?" is the first friction point
 * in getting a flat onto the app.
 */
export default function RoomCode({ code, size = 'md' }) {
  const { copy, hasCopied } = useCopyToClipboard();

  const sizeClasses = size === 'lg' ? 'text-xl px-4 py-2.5' : 'text-sm px-2.5 py-1';

  return (
    <button
      type="button"
      onClick={() => copy(code)}
      title="Copy room code"
      className={`tabular group inline-flex items-center gap-2 rounded-lg bg-slate-100 font-semibold tracking-wide text-slate-700 transition-colors hover:bg-slate-200 ${sizeClasses}`}
    >
      {code}
      <span
        aria-hidden="true"
        className={`text-xs font-medium ${hasCopied ? 'text-positive-700' : 'text-slate-400'}`}
      >
        {hasCopied ? 'Copied' : 'Copy'}
      </span>
      {/* Announced to screen readers without needing the visual change */}
      <span className="sr-only" role="status">
        {hasCopied ? 'Room code copied to clipboard' : ''}
      </span>
    </button>
  );
}
