import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Throttle credential endpoints (spec §31).
 *
 * Register and login are the two routes worth guessing against — one to
 * enumerate accounts, the other to brute-force a password. A generous window
 * stops automated attempts without getting in the way of somebody who genuinely
 * mistyped their password a few times.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Route the rejection through ApiError so a throttled client gets the same
  // response envelope as every other failure.
  handler: (req, res, next) =>
    next(
      ApiError.tooManyRequests(
        'Too many attempts. Please wait 15 minutes and try again.',
      ),
    ),
  // Tests would otherwise trip the limit and fail for the wrong reason.
  skip: () => env.isTest,
});
