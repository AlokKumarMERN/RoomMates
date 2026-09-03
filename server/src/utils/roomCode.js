import { randomInt } from 'node:crypto';

/**
 * Room codes get read aloud, texted, and typed by hand — so the alphabet leaves
 * out every character pair people confuse: O/0, I/1/L. What's left is 31
 * symbols, which over 6 places is ~887 million codes; collisions are rare, and
 * the create path retries on the unique index anyway.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const PREFIX = 'RM-';

export function generateRoomCode() {
  let body = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // randomInt is unbiased — `randomBytes[i] % 31` would favour the first
    // characters of the alphabet, since 256 is not a multiple of 31.
    body += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `${PREFIX}${body}`;
}

/**
 * Accept a code however somebody types it — "RM-7X92AB", "rm7x92ab", "7x92ab",
 * with stray spaces — and return the canonical form, or null if it can't be one.
 *
 * Rejecting a valid code over a missing dash is a pointless way to lose someone
 * at the very first step of using the app.
 */
export function normalizeRoomCode(input) {
  if (typeof input !== 'string') return null;

  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // With the prefix typed, or without it.
  const body =
    cleaned.length === CODE_LENGTH + 2 && cleaned.startsWith('RM')
      ? cleaned.slice(2)
      : cleaned.length === CODE_LENGTH
        ? cleaned
        : null;

  if (!body) return null;

  // Every character must be in the alphabet — this is what rejects a code
  // containing an O or an I, which cannot have been issued by us.
  for (const character of body) {
    if (!ALPHABET.includes(character)) return null;
  }

  return `${PREFIX}${body}`;
}
