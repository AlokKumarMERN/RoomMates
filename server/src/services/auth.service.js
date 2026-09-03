import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';

/**
 * Create an account and sign the user straight in.
 */
export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with that email already exists.', 'EMAIL_TAKEN');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, lastLogin: new Date() });

  return { user, token: signToken(user._id) };
}

/**
 * Verify credentials and issue a token.
 */
export async function loginUser({ email, password }) {
  // passwordHash is `select: false` on the schema, so it has to be requested.
  const user = await User.findOne({ email }).select('+passwordHash');

  // An unknown email and a wrong password return the identical error. Telling
  // them apart would let anyone check which addresses have accounts here.
  const credentialsError = ApiError.unauthorized(
    'Invalid email or password.',
    'INVALID_CREDENTIALS',
  );

  if (!user) throw credentialsError;

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) throw credentialsError;

  user.lastLogin = new Date();
  await user.save();

  return { user, token: signToken(user._id) };
}
