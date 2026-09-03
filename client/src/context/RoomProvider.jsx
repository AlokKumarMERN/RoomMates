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

  const selectRoom = useCallback((roomId) => {
    setActiveRoomId(roomId);
    if (roomId) localStorage.setItem(ACTIVE_ROOM_KEY, roomId);
  }, []);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const value = useMemo(
    () => ({ rooms, activeRoom, activeRoomId, isLoading, error, loadRooms, selectRoom }),
    [rooms, activeRoom, activeRoomId, isLoading, error, loadRooms, selectRoom],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
