import { useCallback, useEffect, useRef, useState } from 'react';

import * as expenseApi from '../services/expense.service.js';

/**
 * Load a page of a room's expenses.
 *
 * Filters arrive as a plain object, which is a new reference on every render,
 * so the effect keys off its serialised form instead. Comparing the object
 * itself would refetch on every keystroke anywhere on the page.
 */
export default function useExpenses(roomId, filters = {}) {
  const [expenses, setExpenses] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(roomId));
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filters);

  // Changing a filter fires a second request while the first is in flight, and
  // the two can come back out of order. Only the newest request may write.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    if (!roomId) {
      setExpenses([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      const data = await expenseApi.listExpenses(roomId, JSON.parse(filterKey));
      if (latestRequest.current !== requestId) return;

      setExpenses(data.expenses);
      setMeta(data.meta);
    } catch (loadError) {
      if (latestRequest.current !== requestId) return;
      setError(loadError.message);
      setExpenses([]);
      setMeta(null);
    } finally {
      if (latestRequest.current === requestId) setIsLoading(false);
    }
  }, [roomId, filterKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { expenses, meta, isLoading, error, reload: load };
}
