import ApiError from '../utils/ApiError.js';

/**
 * Catches any request that matched no route and hands it to the error handler,
 * so a wrong URL returns the same JSON error shape as everything else rather
 * than Express's default HTML page.
 */
export default function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}
