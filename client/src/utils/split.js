/**
 * Client-side mirror of the server's share allocation, used ONLY to preview a
 * split while the user is filling in the form.
 *
 * The server is the authority: it re-resolves every split at write time and
 * stores the result. This exists so the form can show "₹333.34 / ₹333.33 /
 * ₹333.33" as you type instead of an evasive "≈ ₹333.33 each", and so the
 * number the user agreed to is the number that gets stored.
 *
 * It must stay in step with server/src/services/calculation/split.js.
 */

/**
 * Divide `amount` paise among `weights`, proportionally, with the leftover
 * paise going to the largest fractional remainders (ties by position).
 * The result always sums to exactly `amount`.
 */
export function allocate(amount, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isInteger(amount) || amount <= 0 || totalWeight <= 0) {
    return weights.map(() => 0);
  }

  const parts = weights.map((weight) => ({
    base: Math.floor((amount * weight) / totalWeight),
    remainder: (amount * weight) % totalWeight,
  }));

  let leftover = amount - parts.reduce((sum, part) => sum + part.base, 0);
  const shares = parts.map((part) => part.base);

  parts
    .map((part, index) => ({ index, remainder: part.remainder }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach((entry) => {
      if (leftover <= 0) return;
      shares[entry.index] += 1;
      leftover -= 1;
    });

  return shares;
}

/**
 * Preview an equal split.
 *
 * `userIds` are sorted before allocating, exactly as the server does, so the
 * person the preview shows paying the extra paise is the person who actually
 * will.
 *
 * @returns {Record<string, number>} userId → paise
 */
export function previewEqualShares(amount, userIds) {
  const ordered = [...userIds].sort((a, b) => String(a).localeCompare(String(b)));
  const amounts = allocate(
    amount,
    ordered.map(() => 1),
  );

  return Object.fromEntries(ordered.map((userId, index) => [userId, amounts[index]]));
}

/**
 * Preview a percentage split. Percentages are carried as basis points to keep
 * the arithmetic on integers, as the server does.
 *
 * @param {Record<string, number>} percentages userId → percentage
 * @returns {Record<string, number>} userId → paise
 */
export function previewPercentageShares(amount, percentages) {
  const ordered = Object.keys(percentages).sort((a, b) => String(a).localeCompare(String(b)));
  const basisPoints = ordered.map((userId) => Math.round((percentages[userId] ?? 0) * 100));

  if (basisPoints.some((points) => points <= 0)) {
    return Object.fromEntries(ordered.map((userId) => [userId, 0]));
  }

  const amounts = allocate(amount, basisPoints);
  return Object.fromEntries(ordered.map((userId, index) => [userId, amounts[index]]));
}
