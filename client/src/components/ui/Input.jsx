import { useId } from 'react';

/**
 * Text input with a real <label> and an error message wired up through
 * aria-describedby, so screen readers announce the problem rather than just
 * turning the border red (spec §37).
 */
export default function Input({ label, error, hint, className = '', ...props }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
          error
            ? 'border-negative-500 focus:border-negative-500 focus:ring-negative-500/20'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20'
        }`}
        {...props}
      />

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
