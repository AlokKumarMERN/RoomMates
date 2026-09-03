import * as roomService from '../services/room.service.js';
import * as summaryService from '../services/summary.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const create = asyncHandler(async (req, res) => {
  const room = await roomService.createRoom({ name: req.body.name, ownerId: req.user._id });
  sendSuccess(res, { status: 201, data: { room } });
});

export const list = asyncHandler(async (req, res) => {
  const rooms = await roomService.listRoomsForUser(req.user._id);
  sendSuccess(res, { data: { rooms } });
});

export const join = asyncHandler(async (req, res) => {
  const room = await roomService.joinRoomByCode({ code: req.body.code, userId: req.user._id });
  sendSuccess(res, { data: { room } });
});

/** `req.room` is already loaded and access-checked by requireRoomMember. */
export const detail = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { room: req.room } });
});

/**
 * The whole computed picture in one call: totals, the member comparison table,
 * suggested settlements, and the caller's own position. The dashboard needs all
 * four at once, and computing them separately would risk the settlement page
 * and the summary cards disagreeing over the same room.
 */
export const summary = asyncHandler(async (req, res) => {
  const roomSummary = await summaryService.getRoomSummary({
    room: req.room,
    userId: req.user._id,
    query: req.query,
  });

  sendSuccess(res, { data: { summary: roomSummary } });
});

export const update = asyncHandler(async (req, res) => {
  const room = await roomService.updateRoom({ room: req.room, updates: req.body });
  sendSuccess(res, { data: { room } });
});

export const regenerateCode = asyncHandler(async (req, res) => {
  const room = await roomService.regenerateRoomCode(req.room);
  sendSuccess(res, { data: { room } });
});

export const removeMember = asyncHandler(async (req, res) => {
  // An admin removing themselves should go through /leave, which has the right
  // checks — letting it happen here would be a confusing way to lose access.
  if (String(req.params.memberId) === String(req.user._id)) {
    throw ApiError.badRequest('Use "leave room" to remove yourself.', 'USE_LEAVE_ENDPOINT');
  }

  const room = await roomService.deactivateMember({
    room: req.room,
    targetUserId: req.params.memberId,
  });

  sendSuccess(res, { data: { room } });
});

export const updateMember = asyncHandler(async (req, res) => {
  const room = await roomService.updateMember({
    room: req.room,
    targetUserId: req.params.memberId,
    updates: req.body,
  });

  sendSuccess(res, { data: { room } });
});

export const leave = asyncHandler(async (req, res) => {
  const room = await roomService.deactivateMember({
    room: req.room,
    targetUserId: req.user._id,
  });

  sendSuccess(res, { data: { room } });
});

export const archive = asyncHandler(async (req, res) => {
  const room = await roomService.archiveRoom(req.room);
  sendSuccess(res, { data: { room } });
});
