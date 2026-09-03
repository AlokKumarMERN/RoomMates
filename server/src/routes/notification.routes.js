import { Router } from 'express';

import * as notificationController from '../controllers/notification.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import { listNotificationsSchema } from '../validators/notification.validators.js';

/**
 * Notifications are addressed to a person, not to a room, so these sit at the
 * top level rather than under /rooms — the bell shows everything waiting for
 * you across every room you are in. `?room=` narrows it when you want one.
 *
 * There is no membership middleware here: every query is scoped to
 * `req.user._id` inside the service, so there is no path to somebody else's.
 */
const router = Router();

router.use(authenticate);

router.get('/', validate(listNotificationsSchema, 'query'), notificationController.list);
router.get('/count', notificationController.count);
router.post('/read-all', notificationController.markAllRead);
router.patch('/:notificationId/read', notificationController.markRead);

export default router;
