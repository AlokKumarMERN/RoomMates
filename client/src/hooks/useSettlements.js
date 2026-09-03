import { useCallback, useEffect, useRef, useState } from 'react';

import * as settlementApi from '../services/settlement.service.js';

/**
 * A room's settlement history.
 *
 * Mirrors `useSummary`: only the newest request may write, and a refetch keeps
 * the previous list on screen rather than collapsing to a spinner — the page
 * refetches after every action, and flashing empty each time would make a
 * two-click flow feel broken.
 */
export default function useSettlements(roomId, page = 1) {
  const [settlements, setSettlements] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(roomId));
  const [error, setError] = useState(null);

  const latestRequest = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!roomId) {
      setSettlements([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    if (!hasLoaded.current) setIsLoading(true);
    setError(null);

    try {
      const data = await settlementApi.listSettlements(roomId, { page });
      if (latestRequest.current !== requestId) return;

      setSettlements(data.settlements);
      setMeta(data.meta);
      hasLoaded.current = true;
    } catch (loadError) {
      if (latestRequest.current !== requestId) return;
      setError(loadError.message);
    } finally {
      if (latestRequest.current === requestId) setIsLoading(false);
    }
  }, [roomId, page]);

  useEffect(() => {
    hasLoaded.current = false;
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  return { settlements, meta, isLoading, error, reload: load };
}
