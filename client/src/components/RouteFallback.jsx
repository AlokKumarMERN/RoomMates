import { useEffect, useState } from 'react';

import Spinner from './ui/Spinner.jsx';

/**
 * What fills the gap while a lazy route's chunk arrives.
 *
 * It shows NOTHING for the first fraction of a second. On a warm cache a chunk
 * loads in a few milliseconds, and a spinner that appears and vanishes inside
 * one frame reads as a flicker — worse than the brief blank it replaced. Past
 * the threshold the wait is real, and then a spinner is the honest thing to
 * show.
 *
 * The same idea covers the splash on first load: see `Splash`.
 */
const SHOW_AFTER_MS = 200;

export default function RouteFallback() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <Spinner className="size-8 text-brand-500" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
