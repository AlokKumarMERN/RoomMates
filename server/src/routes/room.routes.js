import { Router } from 'express';

import * as roomController from '../controllers/room.controller.js';
import authenticate from '../middleware/authenticate.js';
import { requireRoomAdmin, requireRoomMember } from '../middleware/roomAccess.js';
import validate from '../middleware/validate.js';
import { roomExpenseRoutes } from './expense.routes.js';
import {
  createRoomSchema,
  joinRoomSchema,
  roomSummarySchema,
  updateMemberSchema,
  updateRoomSchema,
} from '../validators/room.validators.js';

const router = Router();

// Every room route requires a session.
router.use(authenticate);

router.post('/', validate(createRoomSchema), roomController.create);
router.get('/', roomController.list);
router.post('/join', validate(joinRoomSchema), roomController.join);

// From here on, `requireRoomMember` loads the room and proves the caller is in
// it. Anything an ordinary member cannot do additionally passes through
// `requireRoomAdmin`.
router.get('/:roomId', requireRoomMember, roomController.detail);
router.post('/:roomId/leave', requireRoomMember, roomController.leave);

router.get(
  '/:roomId/summary',
  requireRoomMember,
  validate(roomSummarySchema, 'query'),
  roomController.summary,
);

// Creating and listing expenses are room operations, and membership of the room
// is what authorises them — so the check happens once, here, and the expense
// router never has to repeat it.
router.use('/:roomId/expenses', requireRoomMember, roomExpenseRoutes);

router.patch(
  '/:roomId',
  requireRoomMember,
  requireRoomAdmin,
  validate(updateRoomSchema),
  roomController.update,
);

router.post('/:roomId/code', requireRoomMember, requireRoomAdmin, roomController.regenerateCode);

router.patch(
  '/:roomId/archive',
  requireRoomMember,
  requireRoomAdmin,
  roomController.archive,
);

router.patch(
  '/:roomId/members/:memberId',
  requireRoomMember,
  requireRoomAdmin,
  validate(updateMemberSchema),
  roomController.updateMember,
);

router.delete(
  '/:roomId/members/:memberId',
  requireRoomMember,
  requireRoomAdmin,
  roomController.removeMember,
);

export default router;
