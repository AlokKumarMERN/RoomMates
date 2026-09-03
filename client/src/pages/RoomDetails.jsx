import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfirmButton from '../components/ConfirmButton.jsx';
import RoomCode from '../components/RoomCode.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useAuth from '../hooks/useAuth.js';
import useRoom from '../hooks/useRoom.js';
import * as roomApi from '../services/room.service.js';

export default function RoomDetails() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { loadRooms, selectRoom, activeRoom } = useRoom();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roomApi.getRoom(roomId);
      setRoom(data.room);
      setDraftName(data.room.name);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Wraps an action with its own busy flag and refreshes both this page and the switcher. */
  const runAction = async (key, action) => {
    setBusyAction(key);
    setError(null);
    try {
      await action();
      await loadRooms();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-base font-medium text-slate-900">Room not found</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {error ?? 'It may have been archived, or you may have left it.'}
        </p>
        <Button className="mt-6" onClick={() => navigate('/rooms')}>
          Back to my rooms
        </Button>
      </div>
    );
  }

  const myMembership = room.members.find(
    (member) => member.user?.id === user?.id && member.isActive,
  );
  const isAdmin = myMembership?.role === 'admin';
  const isOwner = String(room.owner) === String(user?.id);
  const activeMembers = room.members.filter((member) => member.isActive);
  const pastMembers = room.members.filter((member) => !member.isActive);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {isRenaming ? (
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                runAction('rename', async () => {
                  const data = await roomApi.renameRoom(room.id, { name: draftName });
                  setRoom((previous) => ({ ...previous, name: data.room.name }));
                  setIsRenaming(false);
                });
              }}
            >
              <Input
                label="Room name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                autoFocus
              />
              <Button type="submit" size="md" isLoading={busyAction === 'rename'}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setDraftName(room.name);
                  setIsRenaming(false);
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <h1 className="truncate text-2xl font-semibold text-slate-900">{room.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}
                {isAdmin && ' · you are an admin'}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {room.id !== activeRoom?.id && (
            <Button variant="secondary" size="sm" onClick={() => selectRoom(room.id)}>
              Switch to this room
            </Button>
          )}
          {isAdmin && !isRenaming && (
            <Button variant="ghost" size="sm" onClick={() => setIsRenaming(true)}>
              Rename
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-negative-50 px-4 py-3 text-sm text-negative-700">
          {error}
        </p>
      )}

      {/* Invite */}
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Invite flatmates
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Share this code. Anyone with it can join the room and start adding expenses.
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <RoomCode code={room.code} size="lg" />
          {isAdmin && (
            <ConfirmButton
              confirmLabel="Yes, generate a new one"
              isLoading={busyAction === 'code'}
              onConfirm={() =>
                runAction('code', async () => {
                  const data = await roomApi.regenerateCode(room.id);
                  setRoom((previous) => ({ ...previous, code: data.room.code }));
                })
              }
            >
              Regenerate
            </ConfirmButton>
          )}
        </div>
        {isAdmin && (
          <p className="mt-2.5 text-xs text-slate-500">
            Regenerating stops the old code working — useful if it was shared too widely. It does
            not remove anyone already in the room.
          </p>
        )}
      </section>

      {/* Members */}
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Members
        </h2>

        <ul className="divide-y divide-slate-100">
          {activeMembers.map((member) => {
            const isMe = member.user?.id === user?.id;
            const memberIsOwner = String(room.owner) === String(member.user?.id);

            return (
              <li
                key={member._id ?? member.user?.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                    aria-hidden="true"
                  >
                    {member.user?.name?.[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {member.user?.name}
                      {isMe && <span className="ml-1.5 text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {memberIsOwner && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      owner
                    </span>
                  )}
                  {member.role === 'admin' && !memberIsOwner && (
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      admin
                    </span>
                  )}
                  {member.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}

                  {isAdmin && !isMe && !memberIsOwner && (
                    <ConfirmButton
                      confirmLabel="Remove"
                      isLoading={busyAction === `remove-${member.user?.id}`}
                      onConfirm={() =>
                        runAction(`remove-${member.user?.id}`, async () => {
                          const data = await roomApi.removeMember(room.id, member.user.id);
                          setRoom(data.room);
                        })
                      }
                    >
                      Remove
                    </ConfirmButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {pastMembers.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5">
            <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Past members
            </h3>
            <p className="mt-1.5 text-xs text-slate-500">
              Kept so their name still shows on the expenses they were part of.
            </p>
            <ul className="mt-2.5 space-y-1">
              {pastMembers.map((member) => (
                <li key={member._id ?? member.user?.id} className="text-sm text-slate-600">
                  {member.user?.name}
                  <span className="ml-2 text-xs text-slate-400">
                    left {member.leftAt && new Date(member.leftAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="mt-6 rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Room settings
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {isOwner ? (
            <ConfirmButton
              confirmLabel="Yes, archive it"
              isLoading={busyAction === 'archive'}
              onConfirm={() =>
                runAction('archive', async () => {
                  await roomApi.archiveRoom(room.id);
                  navigate('/rooms', { replace: true });
                })
              }
            >
              Archive room
            </ConfirmButton>
          ) : (
            <ConfirmButton
              confirmLabel="Yes, leave"
              isLoading={busyAction === 'leave'}
              onConfirm={() =>
                runAction('leave', async () => {
                  await roomApi.leaveRoom(room.id);
                  navigate('/rooms', { replace: true });
                })
              }
            >
              Leave room
            </ConfirmButton>
          )}
        </div>
        <p className="mt-2.5 text-xs text-slate-500">
          {isOwner
            ? 'As the owner you cannot leave — archiving hides the room while keeping every expense and its history.'
            : 'Leaving hides the room from your list. Your past expenses stay in the room.'}
        </p>
      </section>
    </div>
  );
}
