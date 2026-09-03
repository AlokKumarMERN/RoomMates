import Room from '../models/Room.js';
import ApiError from '../utils/ApiError.js';
import { generateRoomCode } from '../utils/roomCode.js';
import { notifyRoom, safely } from './notification.service.js';

const MAX_CODE_ATTEMPTS = 5;
const MEMBER_FIELDS = 'name email avatar';

/**
 * Create a room, retrying if the generated code happens to be taken.
 *
 * The retry keys off MongoDB's duplicate-key error rather than a "does this code
 * exist?" check, because a check-then-insert can lose a race with a concurrent
 * create. The unique index is the only thing that can actually guarantee it.
 */
async function createWithUniqueCode(buildRoom) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await Room.create(buildRoom(generateRoomCode()));
    } catch (error) {
      const isDuplicateCode = error.code === 11000 && error.keyPattern?.code;
      if (!isDuplicateCode || attempt === MAX_CODE_ATTEMPTS) throw error;
    }
  }
  // Unreachable — the loop either returns or throws.
  throw ApiError.conflict('Could not generate a unique room code.', 'CODE_GENERATION_FAILED');
}

export async function createRoom({ name, ownerId }) {
  const room = await createWithUniqueCode((code) => ({
    name,
    code,
    owner: ownerId,
    // Whoever creates the room administers it.
    members: [{ user: ownerId, role: 'admin' }],
  }));

  return room.populate('members.user', MEMBER_FIELDS);
}

/** Every room the user is currently an active member of. */
export async function listRoomsForUser(userId) {
  return Room.find({
    members: { $elemMatch: { user: userId, isActive: true } },
    isArchived: false,
  })
    .populate('members.user', MEMBER_FIELDS)
    .sort({ updatedAt: -1 });
}

export async function getRoomById({ roomId, userId }) {
  const room = await Room.findById(roomId).populate('members.user', MEMBER_FIELDS);

  // Same reasoning as the middleware: never confirm a room exists to someone
  // who is not in it.
  if (!room || !room.isMember(userId)) {
    throw ApiError.notFound('Room not found.', 'ROOM_NOT_FOUND');
  }

  return room;
}

export async function joinRoomByCode({ code, userId }) {
  const room = await Room.findOne({ code });

  if (!room) {
    throw ApiError.notFound('Room not found. Please check the code.', 'ROOM_NOT_FOUND');
  }

  if (room.isArchived) {
    throw ApiError.badRequest('That room has been archived.', 'ROOM_ARCHIVED');
  }

  const existing = room.members.find((member) => String(member.user) === String(userId));

  if (existing?.isActive) {
    throw ApiError.conflict("You're already in this room.", 'ALREADY_MEMBER');
  }

  if (existing) {
    // Rejoining: reactivate the original membership rather than pushing a second
    // row, so the member has one continuous identity across their old expenses.
    existing.isActive = true;
    existing.leftAt = null;
    existing.joinedAt = new Date();
  } else {
    room.members.push({ user: userId, role: 'member' });
  }

  await room.save();
  await room.populate('members.user', MEMBER_FIELDS);

  const joiner = room.members.find((member) => String(member.user?._id ?? member.user) === String(userId));
  const name = joiner?.user?.name?.split(' ')[0] ?? 'Someone';

  await safely(() =>
    notifyRoom({
      room,
      actorId: userId,
      type: 'member_joined',
      entity: { type: 'room', id: room._id },
      messageFor: () => `${name} joined ${room.name}.`,
    }),
  );

  return room;
}

export async function updateRoom({ room, updates }) {
  if (updates.name !== undefined) room.name = updates.name;
  await room.save();
  return room;
}

export async function regenerateRoomCode(room) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    room.code = generateRoomCode();
    try {
      await room.save();
      return room;
    } catch (error) {
      const isDuplicateCode = error.code === 11000 && error.keyPattern?.code;
      if (!isDuplicateCode || attempt === MAX_CODE_ATTEMPTS) throw error;
    }
  }
  throw ApiError.conflict('Could not generate a unique room code.', 'CODE_GENERATION_FAILED');
}

/**
 * Deactivate a membership. Used both for "remove member" (admin) and "leave"
 * (self). The row stays in the array — see the note on memberSchema.
 */
export async function deactivateMember({ room, targetUserId }) {
  const membership = room.findMembership(targetUserId);

  if (!membership) {
    throw ApiError.notFound('That person is not in this room.', 'MEMBER_NOT_FOUND');
  }

  // The owner is the last line of accountability for a room's data — losing them
  // would leave it with no one able to administer it.
  if (String(room.owner) === String(targetUserId)) {
    throw ApiError.badRequest(
      'The room owner cannot be removed. Archive the room instead.',
      'CANNOT_REMOVE_OWNER',
    );
  }

  membership.isActive = false;
  membership.leftAt = new Date();

  await room.save();
  return room;
}

export async function updateMember({ room, targetUserId, updates }) {
  const membership = room.findMembership(targetUserId);

  if (!membership) {
    throw ApiError.notFound('That person is not in this room.', 'MEMBER_NOT_FOUND');
  }

  if (updates.role !== undefined) {
    if (String(room.owner) === String(targetUserId) && updates.role !== 'admin') {
      throw ApiError.badRequest('The room owner must stay an admin.', 'OWNER_MUST_BE_ADMIN');
    }
    membership.role = updates.role;
  }

  if (updates.tags !== undefined) membership.tags = updates.tags;

  await room.save();
  return room;
}

export async function archiveRoom(room) {
  room.isArchived = true;
  room.archivedAt = new Date();
  await room.save();
  return room;
}
