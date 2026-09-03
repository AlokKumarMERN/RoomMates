import { useId } from 'react';

/**
 * The <select> counterpart to Input — same label, error and hint wiring, so a
 * form row looks and behaves the same whichever control it holds.
 *
 * Options are passed as `[{ value, label }]` rather than children, because
 * every select in this app is built from a list we already have in an array.
 */
export default function Select({ label, error, hint, options = [], className = '', ...props }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`mt-1.5 block w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:outline-none ${
          error
            ? 'border-negative-500 focus:border-negative-500 focus:ring-negative-500/20'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20'
        }`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-negative-700">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
