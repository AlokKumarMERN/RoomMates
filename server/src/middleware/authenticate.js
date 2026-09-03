import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Require a valid access token, and attach the current user to `req.user`.
 *
 * The user is re-read from the database on every request rather than trusted
 * from the token payload, so a deleted account stops working immediately
 * instead of when its token happens to expire.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('You need to sign in to do that.', 'NO_TOKEN');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw ApiError.unauthorized('You need to sign in to do that.', 'NO_TOKEN');
  }

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized('That account no longer exists.', 'USER_NOT_FOUND');
  }

  req.user = user;
  next();
});

export default authenticate;
