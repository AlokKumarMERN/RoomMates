import Skeleton from '../ui/Skeleton.jsx';

/**
 * The dashboard's shape while its first load is in flight.
 *
 * Deliberately the same geometry as the real thing — five tiles, a table, two
 * charts — so nothing moves when the numbers arrive. A spinner in the middle of
 * an empty page would be less work and would make every load feel like a jump.
 */
export default function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (unused, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2.5 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-4 w-32" />
        <div className="mt-5 space-y-3.5">
          {Array.from({ length: 4 }, (unused, index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (unused, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-5 h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
