/**
 * A placeholder block for content that is still loading.
 *
 * Skeletons are for a *first* load only. A refetch holds the previous numbers
 * on screen at reduced opacity instead — see `useSummary`. Flashing back to
 * grey bars every time a filter moves makes a dashboard feel less responsive,
 * not more, and the layout jump loses the reader's place.
 */
export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} aria-hidden="true" />
  );
}
