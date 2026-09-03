import { Link } from 'react-router-dom';

import RoomCode from '../components/RoomCode.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';

export default function Rooms() {
  const { rooms, isLoading, error, activeRoom, selectRoom } = useRoom();
  const { user } = useAuth();

  if (isLoading && rooms.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">My rooms</h1>
        <div className="flex gap-2">
          <Link
            to="/rooms/join"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Join a room
          </Link>
          <Link
            to="/rooms/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Create room
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700">
          {error}
        </p>
      )}

      {rooms.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-base font-medium text-slate-900">
            You haven&apos;t joined any rooms yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
            Create a room and share its code with your flatmates, or join one with a code someone
            has sent you.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              to="/rooms/new"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Create room
            </Link>
            <Link
              to="/rooms/join"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Join with a code
            </Link>
          </div>
        </section>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {rooms.map((room) => {
            const membership = room.members.find(
              (member) => member.user?.id === user?.id && member.isActive,
            );
            const isActive = room.id === activeRoom?.id;

            return (
              <li
                key={room.id}
                className={`rounded-xl border bg-white p-5 transition-colors ${
                  isActive ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/rooms/${room.id}`}
                      className="block truncate font-semibold text-slate-900 hover:text-brand-700"
                    >
                      {room.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      {membership?.role === 'admin' && ' · admin'}
                    </p>
                  </div>

                  {isActive && (
                    <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <RoomCode code={room.code} />
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => selectRoom(room.id)}
                      className="rounded-lg px-2.5 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      Switch to this
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
