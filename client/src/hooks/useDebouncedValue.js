import { useEffect, useState } from 'react';

/**
 * The value, but only once it has stopped changing for `delay` milliseconds.
 *
 * The search box needs this. Firing a request per keystroke means "dinner"
 * sends six of them, five of which are already stale by the time they land —
 * wasted queries, and a list that flickers through partial results as they come
 * back out of order.
 *
 * 300ms is the usual compromise: below about 200 the saving disappears, and
 * above about 400 typing starts to feel like it is being ignored.
 */
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
