import { ZodError } from 'zod';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Translate anything thrown anywhere in the app into one consistent JSON shape:
 *
 *   { "success": false, "error": { "code", "message", "details"? } }
 *
 * The client can rely on that shape everywhere, which is what lets it show a
 * useful message instead of a raw server error (spec §25).
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity (4 args).
export default function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    // Request body/query failed validation.
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Some fields need your attention.';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err.name === 'ValidationError') {
    // Mongoose schema validation.
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Some fields need your attention.';
    details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  } else if (err.type === 'entity.parse.failed') {
    // body-parser could not parse the JSON body. The request is malformed, so
    // this is the client's fault — without this branch it falls through to a
    // 500 and gets logged as a server fault that nobody can act on.
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'The request body was not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'That request was too large.';
  } else if (err.name === 'CastError') {
    // A malformed ObjectId in the URL — treat as "not found", not as a server fault.
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'That link looks invalid.';
  } else if (err.code === 11000) {
    // Unique index violation, e.g. an email that is already registered.
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    message = `That ${field} is already in use.`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Your session is invalid. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Your session has expired. Please sign in again.';
  }

  // Unexpected failures get logged in full but never leak their internals to the
  // client in production (spec §31).
  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  if (!env.isProduction && statusCode >= 500) body.error.stack = err.stack;

  return res.status(statusCode).json(body);
}
