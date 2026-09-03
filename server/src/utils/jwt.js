import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign an access token for a user.
 *
 * The payload carries the user id and nothing else. Names, emails and roles
 * change; a token minted last week would still assert the old values. Everything
 * beyond identity is looked up fresh from the database on each request.
 */
export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a token. Throws `JsonWebTokenError` or `TokenExpiredError`,
 * both of which the global error handler already turns into a clean 401.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
