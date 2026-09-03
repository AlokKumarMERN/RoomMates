import { useCallback, useEffect, useRef, useState } from 'react';

import * as notificationApi from '../services/notification.service.js';

/**
 * The bell: an unread count that keeps itself current, and the list behind it.
 *
 * WHY POLLING AND NOT A SOCKET. Spec §30 asks for real-time updates "if
 * practical", and the deployment target is Vercel — whose serverless functions
 * cannot hold an open WebSocket, because there is no process for the connection
 * to live in between invocations. So this polls, which needs no persistent
 * server and costs one indexed count per interval.
 *
 * Two things keep that cheap. It polls the COUNT, not the list — a single
 * number the server answers from an index without reading a document. And it
 * stops entirely while the tab is hidden: a background tab that nobody is
 * looking at should not be asking anything every thirty seconds. On becoming
 * visible again it checks immediately, so returning to the tab is not a wait.
 */

const POLL_INTERVAL_MS = 30_000;

export default function useNotifications() {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const latestRequest = useRef(0);

  const refreshCount = useCallback(async () => {
    try {
      const data = await notificationApi.unreadCount();
      setUnread(data.unread);
    } catch {
      // A failed poll is not worth telling anybody about. The next one is
      // thirty seconds away, and an error banner for it would be noise.
    }
  }, []);

  const loadList = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    setIsLoading(true);
    setError(null);

    try {
      const data = await notificationApi.listNotifications({ limit: 15 });
      if (latestRequest.current !== requestId) return;

      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch (loadError) {
      if (latestRequest.current !== requestId) return;
      setError(loadError.message);
    } finally {
      if (latestRequest.current === requestId) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer;

    const tick = () => {
      if (document.visibilityState === 'visible') refreshCount();
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Check straight away rather than waiting out the first interval — landing
    // on the app with a stale zero on the bell is the worst version of this.
    tick();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCount]);

  const markRead = useCallback(async (notificationId) => {
    // Optimistic: the row greys out on click rather than after a round trip,
    // and the server's count replaces the guess a moment later.
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    );
    setUnread((current) => Math.max(0, current - 1));

    try {
      const data = await notificationApi.markRead(notificationId);
      setUnread(data.unread);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);

    try {
      await notificationApi.markAllRead();
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  return { unread, notifications, isLoading, error, loadList, refreshCount, markRead, markAllRead };
}
