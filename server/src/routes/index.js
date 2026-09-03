import { Router } from 'express';
import authRoutes from './auth.routes.js';
import expenseRoutes from './expense.routes.js';
import healthRoutes from './health.routes.js';
import notificationRoutes from './notification.routes.js';
import roomRoutes from './room.routes.js';
import settlementRoutes from './settlement.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
// Room-scoped expense routes (create, list) are mounted inside roomRoutes,
// behind the membership check. This one serves a single expense by its own id.
router.use('/expenses', expenseRoutes);
// Room-scoped settlement routes (record, list) are mounted inside roomRoutes.
// This one moves a single settlement along its lifecycle.
router.use('/settlements', settlementRoutes);
// Addressed to a person rather than a room: the bell shows every room at once.
router.use('/notifications', notificationRoutes);

export default router;
