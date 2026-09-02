import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-widest text-brand-500 uppercase">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-slate-600">
        The link may be out of date, or the room may have been archived.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to home
      </Link>
    </main>
  );
}
