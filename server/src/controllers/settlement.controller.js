import * as settlementService from '../services/settlement.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

/** `req.room` is already loaded and access-checked by requireRoomMember. */
export const create = asyncHandler(async (req, res) => {
  const settlement = await settlementService.createSettlement({
    room: req.room,
    userId: req.user._id,
    input: req.body,
  });

  sendSuccess(res, { status: 201, data: { settlement } });
});

export const list = asyncHandler(async (req, res) => {
  const { settlements, total, page, limit } = await settlementService.listSettlements({
    roomId: req.room._id,
    query: req.query,
  });

  sendPaginated(res, { data: { settlements }, page, limit, total });
});

export const update = asyncHandler(async (req, res) => {
  const settlement = await settlementService.updateStatus({
    settlementId: req.params.settlementId,
    userId: req.user._id,
    status: req.body.status,
  });

  sendSuccess(res, { data: { settlement } });
});
