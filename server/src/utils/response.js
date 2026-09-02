/**
 * Every successful response has the same shape, so the client never has to
 * guess where the payload is:
 *
 *   { "success": true, "data": <payload>, "meta": { ... } }
 *
 * Errors use the mirrored shape (see middleware/errorHandler.js):
 *
 *   { "success": false, "error": { "code": "...", "message": "...", "details": ... } }
 */
export function sendSuccess(res, { status = 200, data = null, meta = undefined } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Standard envelope for a paginated list. Used from Phase 4 onward, where every
 * expense list is paginated server-side.
 */
export function sendPaginated(res, { data, page, limit, total, status = 200 }) {
  return sendSuccess(res, {
    status,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
    },
  });
}
