/**
 * Split resolution — the code that turns "₹2000, equally, between these four"
 * into four exact share rows.
 *
 * Pure functions only: no Mongoose, no Express, no clock. Everything here takes
 * plain numbers and strings and returns plain numbers and strings, so the money
 * model can be tested without a database or a server (plan §4).
 *
 * Two rules govern everything below.
 *
 * 1. AMOUNTS ARE INTEGER PAISE. See utils/money.js for why.
 *
 * 2. SHARES MUST SUM TO THE TOTAL, EXACTLY. ₹1000 split three ways is
 *    33333 + 33333 + 33333 = 99999 paise — one paise short. That missing paise
 *    is not cosmetic: it means the room's balances no longer sum to zero, and a
 *    settlement built on them can never fully settle. `allocate` below is the
 *    single place that leftover is dealt with.
 */

import ApiError from '../../utils/ApiError.js';
import { MAX_AMOUNT_PAISE, SPLIT_TYPES } from '../../utils/expense.constants.js';

/** Percentages are carried as integer basis points: 33.33% → 3333. */
const BASIS_POINTS_PER_PERCENT = 100;
const TOTAL_BASIS_POINTS = 100 * BASIS_POINTS_PER_PERCENT;

/**
 * Divide `amount` among `weights` so the parts are proportional to the weights
 * AND sum to exactly `amount`.
 *
 * Each part starts as the floor of its exact value, which leaves a few leftover
 * paise. They go to the entries whose exact value had the largest fractional
 * part — the largest-remainder method — because that is the allocation closest
 * to the true proportions. Ties break on the entry's own index, and the caller
 * has already put the entries in a deterministic order, so the same inputs
 * always produce the same output. For an equal split every fraction is
 * identical, so this reduces to "the first few participants get one paise more".
 *
 * @param {number} amount    Integer paise to divide. Must be positive.
 * @param {number[]} weights Positive integers. Their meaning is up to the
 *   caller: 1 each for an equal split, basis points for a percentage split.
 * @returns {number[]} Integer paise, same length and order as `weights`.
 */
export function allocate(amount, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  // Exact integer arithmetic: amount × weight is at most 1e9 × 1e4 = 1e13,
  // comfortably inside the 2^53 range where integers are exact. No float ever
  // touches this calculation, so there is nothing to round badly.
  const parts = weights.map((weight) => {
    const numerator = amount * weight;
    return {
      base: Math.floor(numerator / totalWeight),
      remainder: numerator % totalWeight,
    };
  });

  let leftover = amount - parts.reduce((sum, part) => sum + part.base, 0);

  const byRemainder = parts
    .map((part, index) => ({ index, remainder: part.remainder }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const shares = parts.map((part) => part.base);

  for (const entry of byRemainder) {
    if (leftover <= 0) break;
    shares[entry.index] += 1;
    leftover -= 1;
  }

  return shares;
}

function fail(message, field) {
  throw ApiError.validation(message, [{ field, message }]);
}

/**
 * Order participants deterministically before allocating.
 *
 * Without this, the same expense submitted with the members in a different
 * order could hand the leftover paise to a different person. Ordering by user
 * id makes the result a function of *who* is in the split, not of how the
 * client happened to serialise the array.
 */
function orderedByUser(participants) {
  return [...participants].sort((a, b) => String(a.user).localeCompare(String(b.user)));
}

function assertPositiveAmount(amount, field) {
  if (!Number.isInteger(amount) || amount <= 0) {
    fail('Enter an amount greater than zero.', field);
  }
  if (amount > MAX_AMOUNT_PAISE) {
    fail('That amount is larger than this app supports.', field);
  }
}

function assertNoDuplicates(entries, field) {
  const seen = new Set(entries.map((entry) => String(entry.user)));
  if (seen.size !== entries.length) {
    fail('Each person can only appear once.', field);
  }
}

/**
 * Resolve a split into the frozen `shares[]` array stored on the expense.
 *
 * This runs once, at write time. Nothing recomputes it afterwards — that is the
 * whole reason a member joining next month cannot change what last month's
 * dinner cost each person (plan §2.1).
 *
 * There is no "subset" branch: splitting between three of five people is an
 * equal split with three participants. The veg/non-veg case in spec §7 needs no
 * special handling at all.
 *
 * @param {object} input
 * @param {number} input.amount  Total, in integer paise.
 * @param {'equal'|'custom'|'percentage'} input.splitType
 * @param {Array<{user: string, amount?: number, percentage?: number}>} input.participants
 * @returns {Array<{user: string, amount: number}>} Shares in the order given,
 *   guaranteed to sum to `amount`.
 */
export function resolveShares({ amount, splitType, participants }) {
  assertPositiveAmount(amount, 'amount');

  if (!SPLIT_TYPES.includes(splitType)) {
    fail('Choose how to split this expense.', 'splitType');
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    fail('Choose at least one person to split this between.', 'participants');
  }

  assertNoDuplicates(participants, 'participants');

  const ordered = orderedByUser(participants);
  let amounts;

  if (splitType === 'equal') {
    amounts = allocate(
      amount,
      ordered.map(() => 1),
    );
  } else if (splitType === 'custom') {
    ordered.forEach((participant, index) => {
      if (!Number.isInteger(participant.amount) || participant.amount <= 0) {
        fail(
          'Everyone in a custom split needs an amount above zero. Remove anyone who is not sharing this.',
          `participants.${index}.amount`,
        );
      }
    });

    const sum = ordered.reduce((total, participant) => total + participant.amount, 0);

    if (sum !== amount) {
      // How far off it is, is exactly what the form needs to say ("₹50 left to
      // assign"), so it goes in the message rather than a bare "does not add up".
      const difference = amount - sum;
      fail(
        difference > 0
          ? `The parts are short of the total by ${difference} paise.`
          : `The parts exceed the total by ${-difference} paise.`,
        'participants',
      );
    }

    amounts = ordered.map((participant) => participant.amount);
  } else {
    const basisPoints = ordered.map((participant, index) => {
      const { percentage } = participant;

      if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage <= 0) {
        fail(
          'Everyone in a percentage split needs a percentage above zero.',
          `participants.${index}.percentage`,
        );
      }

      // Round to basis points so 33.33 becomes exactly 3333 rather than
      // 3332.9999…, then keep every later step on integers.
      const rounded = Math.round(percentage * BASIS_POINTS_PER_PERCENT);

      if (Math.abs(rounded - percentage * BASIS_POINTS_PER_PERCENT) > 1e-6) {
        fail('Percentages can have at most two decimal places.', `participants.${index}.percentage`);
      }

      return rounded;
    });

    const totalBasisPoints = basisPoints.reduce((sum, points) => sum + points, 0);

    if (totalBasisPoints !== TOTAL_BASIS_POINTS) {
      const percent = totalBasisPoints / BASIS_POINTS_PER_PERCENT;
      fail(
        `Percentages must add up to 100% — these add up to ${percent}%.`,
        'participants',
      );
    }

    amounts = allocate(amount, basisPoints);
  }

  const byUser = new Map(
    ordered.map((participant, index) => [String(participant.user), amounts[index]]),
  );

  // Returned in the caller's original order: the client shows shares next to
  // the members as the user arranged them, and id order would look arbitrary.
  return participants.map((participant) => ({
    user: participant.user,
    amount: byUser.get(String(participant.user)),
  }));
}

/**
 * Validate who paid.
 *
 * More than one payer is allowed — two people splitting the bill at the counter
 * is ordinary, and forcing that into a single payer would record an expense
 * that never happened.
 *
 * @returns {Array<{user: string, amount: number}>} The payers, normalised.
 */
export function resolvePaidBy({ amount, paidBy }) {
  if (!Array.isArray(paidBy) || paidBy.length === 0) {
    fail('Choose who paid for this.', 'paidBy');
  }

  assertNoDuplicates(paidBy, 'paidBy');

  paidBy.forEach((payer, index) => {
    if (!Number.isInteger(payer.amount) || payer.amount <= 0) {
      fail('Each payer needs an amount above zero.', `paidBy.${index}.amount`);
    }
  });

  const sum = paidBy.reduce((total, payer) => total + payer.amount, 0);

  if (sum !== amount) {
    const difference = amount - sum;
    fail(
      difference > 0
        ? `What the payers put in is ${difference} paise short of the total.`
        : `What the payers put in exceeds the total by ${-difference} paise.`,
      'paidBy',
    );
  }

  return paidBy.map((payer) => ({ user: payer.user, amount: payer.amount }));
}
