import { Router } from 'express';

import * as settlementController from '../controllers/settlement.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import {
  createSettlementSchema,
  listSettlementsSchema,
  updateSettlementSchema,
} from '../validators/settlement.validators.js';

/**
 * Settlements live at two addresses, for the same reason expenses do.
 *
 * Recording and listing are room operations — a payment only means anything
 * inside one room, and membership of that room is what authorises them. Moving
 * one along its lifecycle is addressed by its own id, because the person acting
 * has a link to the settlement, not to the room it sits in.
 *
 * (Spec §32 sketches `POST /api/settlements`. Creating under the room instead
 * keeps the membership check in one place — the same trade already made for
 * expenses.)
 */

/** Mounted under /api/rooms/:roomId/settlements, behind requireRoomMember. */
export const roomSettlementRoutes = Router({ mergeParams: true });

roomSettlementRoutes.post('/', validate(createSettlementSchema), settlementController.create);
roomSettlementRoutes.get(
  '/',
  validate(listSettlementsSchema, 'query'),
  settlementController.list,
);

/** Mounted at /api/settlements. The service checks membership per settlement. */
const settlementRoutes = Router();

settlementRoutes.use(authenticate);
settlementRoutes.patch(
  '/:settlementId',
  validate(updateSettlementSchema),
  settlementController.update,
);

export default settlementRoutes;
