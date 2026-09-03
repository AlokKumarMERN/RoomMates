import { loginUser, registerUser } from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Controllers stay thin: read the (already validated) request, call a service,
 * shape the response. No business rules live here.
 */

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await registerUser(req.body);
  sendSuccess(res, { status: 201, data: { user, token } });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await loginUser(req.body);
  sendSuccess(res, { data: { user, token } });
});

/** Returns the signed-in user. The client uses this to restore a session on reload. */
export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: req.user } });
});
