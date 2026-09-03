import { Router } from 'express';
import authRoutes from './auth.routes.js';
import expenseRoutes from './expense.routes.js';
import healthRoutes from './health.routes.js';
import roomRoutes from './room.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
// Room-scoped expense routes (create, list) are mounted inside roomRoutes,
// behind the membership check. This one serves a single expense by its own id.
router.use('/expenses', expenseRoutes);
// Phase 8:  router.use('/settlements', settlementRoutes);
// Phase 10: router.use('/notifications', notificationRoutes);

export default router;
