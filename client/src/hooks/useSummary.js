import { useCallback, useEffect, useRef, useState } from 'react';

import * as summaryApi from '../services/summary.service.js';

/**
 * Load a room's computed summary.
 *
 * Mirrors `useExpenses`: filters are serialised for the dependency array, and
 * only the newest request may write, so a fast filter change cannot be
 * overwritten by a slower earlier one landing late.
 *
 * `isRefreshing` is separate from `isLoading` on purpose. A refetch holds the
 * previous numbers on screen at reduced opacity instead of collapsing back to
 * skeletons — a dashboard that flashes empty every time a filter moves is
 * harder to read, not more responsive.
 */
export default function useSummary(roomId, filters = {}) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(roomId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filters);
  const latestRequest = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!roomId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    if (hasLoaded.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await summaryApi.getRoomSummary(roomId, JSON.parse(filterKey));
      if (latestRequest.current !== requestId) return;

      setSummary(data.summary);
      hasLoaded.current = true;
    } catch (loadError) {
      if (latestRequest.current !== requestId) return;
      setError(loadError.message);
      setSummary(null);
    } finally {
      if (latestRequest.current === requestId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [roomId, filterKey]);

  // Switching rooms is a different subject entirely — hold nothing over.
  useEffect(() => {
    hasLoaded.current = false;
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, isLoading, isRefreshing, error, reload: load };
}
