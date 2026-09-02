import { Router } from 'express';
import { getConnectionState } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

/**
 * GET /api/health
 * Liveness check. Also reports the database connection state, which is the
 * fastest way to tell "API is up but Mongo isn't" apart from "nothing is up".
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const database = getConnectionState();

    sendSuccess(res, {
      data: {
        status: database === 'connected' ? 'ok' : 'degraded',
        service: 'roommates-api',
        environment: env.NODE_ENV,
        database,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * GET /api/health/boom
 * Deliberately throws, so you can confirm the global error handler produces the
 * standard error envelope. Not registered in production.
 */
if (!env.isProduction) {
  router.get(
    '/boom',
    asyncHandler(async () => {
      throw ApiError.badRequest('This route exists only to test error handling.', 'TEST_ERROR', {
        hint: 'If you can see this envelope, error handling works.',
      });
    }),
  );
}

export default router;
