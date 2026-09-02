/**
 * An error we deliberately raised and understand — as opposed to a crash.
 *
 * The error handler trusts the message on these and sends it straight to the
 * client. Anything that is NOT an ApiError is treated as an unexpected failure
 * and its message is hidden in production.
 */
export default class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status.
   * @param {string} message     Message safe to show a user.
   * @param {string} code        Stable machine-readable code the client can branch on.
   * @param {unknown} [details]  Extra context, e.g. field-level validation errors.
   */
  constructor(statusCode, message, code = 'ERROR', details = undefined) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'You need to sign in to do that.', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have permission to do that.', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not found.', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT', details) {
    return new ApiError(409, message, code, details);
  }

  static validation(message = 'Some fields need your attention.', details) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message = 'Too many attempts. Please try again later.') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }
}
