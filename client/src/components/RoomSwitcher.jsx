import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import useRoom from '../hooks/useRoom.js';

/**
 * Switches the active room (spec §18). Changing it here changes every screen,
 * because they all read the active room from RoomContext.
 */
export default function RoomSwitcher() {
  const { rooms, activeRoom, selectRoom } = useRoom();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on an outside click or Escape — a menu you cannot dismiss without
  // choosing something is a trap.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (rooms.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex max-w-[11rem] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span aria-hidden="true">🏠</span>
        <span className="truncate">{activeRoom?.name ?? 'Select room'}</span>
        <span aria-hidden="true" className="text-slate-400">
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <ul className="max-h-64 overflow-y-auto py-1">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    selectRoom(room.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    room.id === activeRoom?.id ? 'font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{room.name}</span>
                  <span className="tabular shrink-0 text-xs text-slate-400">
                    {room.memberCount}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-200 p-1">
            <Link
              to="/rooms"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              Manage rooms
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
