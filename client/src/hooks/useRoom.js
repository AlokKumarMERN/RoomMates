import { useContext } from 'react';
import { RoomContext } from '../context/room-context.js';

export default function useRoom() {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error('useRoom must be used inside <RoomProvider>.');
  }

  return context;
}
