/**
 * Display metadata for the categories the API accepts.
 *
 * The server stores the lowercase value and knows nothing about labels or
 * icons — presentation lives here, so renaming "Transport" to "Travel" is a
 * one-line change that cannot invalidate a single stored expense.
 *
 * Keep the values in step with server/src/utils/expense.constants.js.
 *
 * Every icon is a character that renders in colour on its own. Emoji that need
 * a U+FE0F variation selector (🍽️, 🛍️) fall back to a flat monochrome glyph
 * wherever that selector is ignored, which looks like a broken character.
 */
export const CATEGORIES = [
  { value: 'food', label: 'Food', icon: '🍛' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'electricity', label: 'Electricity', icon: '💡' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'internet', label: 'Internet', icon: '📶' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'transport', label: 'Transport', icon: '🚕' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'shopping', label: 'Shopping', icon: '👕' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const FALLBACK = CATEGORIES.find((category) => category.value === 'other');

/** Never returns undefined — an unknown value from an older client still renders. */
export function categoryOf(value) {
  return CATEGORIES.find((category) => category.value === value) ?? FALLBACK;
}
