import { useCallback, useEffect, useMemo, useState } from 'react';

import useAuth from '../hooks/useAuth.js';
import * as roomApi from '../services/room.service.js';
import { RoomContext } from './room-context.js';

const ACTIVE_ROOM_KEY = 'roommates.activeRoomId';

/**
 * Holds the user's rooms and which one is currently in view.
 *
 * Everything money-related is scoped to `activeRoom`. Keeping that in one place
 * is what stops two rooms' data from ever being shown together — a screen reads
 * the active room from here rather than deciding for itself (spec §18).
 *
 * THE ROSTER GOES STALE, AND THAT MATTERS MORE THAN IT LOOKS. This used to load
 * once, at sign-in, and never again. A room is a shared thing: somebody joins
 * while your page is open and your copy of `members` is simply wrong. The
 * visible symptom was three people looking at the same room and being offered
 * one, two and three names in the Add Expense form — each seeing the roster as
 * it stood when their page happened to load. Worse than looking wrong, it
 * writes wrong: an expense split between "everyone" would quietly leave out the
 * roommate the browser had never heard of.
 *
 * So it refreshes when the tab regains focus — the moment you come back to a
 * page you left open is exactly when your copy is most likely to be out of date
 * — and `refreshRoom` lets the screens that are about to split money confirm
 * the roster first.
 */
export default function RoomProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await roomApi.listRooms();
      setRooms(data.rooms);

      // Restore the last room if the user is still in it. A stored id can point
      // at a room they left, that was archived, or that never existed — fall
      // back to their first room rather than showing an empty screen.
      setActiveRoomId((current) => {
        const stored = current ?? localStorage.getItem(ACTIVE_ROOM_KEY);
        const isStillValid = data.rooms.some((room) => room.id === stored);
        return isStillValid ? stored : (data.rooms[0]?.id ?? null);
      });

      return data.rooms;
    } catch (loadError) {
      setError(loadError.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      // Signing out must not leave another account's rooms in memory.
      setRooms([]);
      setActiveRoomId(null);
      localStorage.removeItem(ACTIVE_ROOM_KEY);
      return;
    }

    loadRooms();
  }, [isAuthenticated, loadRooms]);

  /**
   * Re-fetch one room and merge it in.
   *
   * Used by the screens that are about to divide money between people, where a
   * stale name list does not merely look wrong — it produces an expense that
   * leaves somebody out. Returns the fresh room so a caller can wait for it.
   */
  const refreshRoom = useCallback(async (roomId) => {
    if (!roomId) return null;

    try {
      const data = await roomApi.getRoom(roomId);

      setRooms((current) =>
        current.some((room) => room.id === data.room.id)
          ? current.map((room) => (room.id === data.room.id ? data.room : room))
          : [data.room, ...current],
      );

      return data.room;
    } catch {
      // Keep whatever we already had. A failed refresh should not empty the
      // room switcher, and the next focus will try again.
      return null;
    }
  }, []);

  // Coming back to a tab you left open is when your copy is most likely stale.
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadRooms();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isAuthenticated, loadRooms]);

  const selectRoom = useCallback((roomId) => {
    setActiveRoomId(roomId);
    if (roomId) localStorage.setItem(ACTIVE_ROOM_KEY, roomId);
  }, []);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const value = useMemo(
    () => ({
      rooms,
      activeRoom,
      activeRoomId,
      isLoading,
      error,
      loadRooms,
      refreshRoom,
      selectRoom,
    }),
    [rooms, activeRoom, activeRoomId, isLoading, error, loadRooms, refreshRoom, selectRoom],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
