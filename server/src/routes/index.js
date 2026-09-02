import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

// Phase 2:  router.use('/auth', authRoutes);
// Phase 3:  router.use('/rooms', roomRoutes);
// Phase 4:  router.use('/expenses', expenseRoutes);
// Phase 8:  router.use('/settlements', settlementRoutes);
// Phase 10: router.use('/notifications', notificationRoutes);

export default router;
