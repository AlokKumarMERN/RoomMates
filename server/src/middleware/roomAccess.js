import Room from '../models/Room.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Load the room named in the URL and confirm the caller belongs to it.
 * Attaches `req.room` and `req.membership` for the handler.
 *
 * A non-member gets 404, not 403. A 403 would confirm that a room with that id
 * exists, which lets anyone probe for valid room ids. From outside, a room you
 * are not in is indistinguishable from a room that does not exist.
 */
export const requireRoomMember = asyncHandler(async (req, res, next) => {
  const room = await Room.findById(req.params.roomId).populate(
    'members.user',
    'name email avatar',
  );

  if (!room) {
    throw ApiError.notFound('Room not found.', 'ROOM_NOT_FOUND');
  }

  const membership = room.findMembership(req.user._id);

  if (!membership) {
    throw ApiError.notFound('Room not found.', 'ROOM_NOT_FOUND');
  }

  req.room = room;
  req.membership = membership;
  next();
});

/**
 * Same, plus an admin check. Run after requireRoomMember.
 *
 * Here 403 is correct: the caller has already proved they are in the room, so
 * telling them it exists leaks nothing — they just can't perform this action.
 */
export const requireRoomAdmin = asyncHandler(async (req, res, next) => {
  if (req.membership?.role !== 'admin') {
    throw ApiError.forbidden('Only a room admin can do that.', 'NOT_ROOM_ADMIN');
  }
  next();
});
